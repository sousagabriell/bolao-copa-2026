"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ReactionEmoji, REACTION_EMOJIS, translateTeamName } from "@/lib/types";

const MAX_MESSAGE_LENGTH = 500;
const INITIAL_LIMIT = 50;
const MESSAGE_SELECT = "id, user_id, message, type, created_at, profiles(name, avatar_url)";

export interface ChatMessageEntry {
  id: number;
  user_id: string;
  message: string;
  type: "text" | "reaction";
  created_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

export async function getInitialMessages(): Promise<ChatMessageEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data } = await supabase
    .from("chat_messages")
    .select(MESSAGE_SELECT)
    .order("id", { ascending: false })
    .limit(INITIAL_LIMIT);

  return ((data ?? []) as unknown as ChatMessageEntry[]).reverse();
}

export async function getMessagesSince(lastId: number): Promise<ChatMessageEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data } = await supabase
    .from("chat_messages")
    .select(MESSAGE_SELECT)
    .gt("id", lastId)
    .order("id", { ascending: true });

  return (data ?? []) as unknown as ChatMessageEntry[];
}

export async function sendMessage(text: string): Promise<ChatMessageEntry> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Mensagem vazia");
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Mensagem muito longa (máx. ${MAX_MESSAGE_LENGTH} caracteres)`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_status")
    .eq("id", user.id)
    .single();
  if (profile?.payment_status !== "paid") {
    throw new Error("Apenas participantes pagos podem enviar mensagens");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, message: trimmed, type: "text" })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) throw new Error("Não foi possível enviar a mensagem");

  return data as unknown as ChatMessageEntry;
}

export async function sendReactionMessage(params: {
  emoji: ReactionEmoji;
  predictionId?: number;
  rankingUserId?: string;
}): Promise<void> {
  const { emoji, predictionId, rankingUserId } = params;

  if (!REACTION_EMOJIS.includes(emoji)) throw new Error("Emoji inválido");
  if ((predictionId == null) === (rankingUserId == null)) {
    throw new Error("Informe exatamente um alvo (palpite ou ranking)");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: reactorProfile } = await supabase
    .from("profiles")
    .select("name, payment_status")
    .eq("id", user.id)
    .single();
  if (reactorProfile?.payment_status !== "paid") {
    throw new Error("Apenas participantes pagos podem reagir");
  }
  const reactorName = reactorProfile?.name ?? "Alguém";

  const service = createServiceClient();
  let text: string;

  if (predictionId != null) {
    const { data: pred } = await service
      .from("predictions")
      .select("home_score_pred, away_score_pred, profiles(name), matches(home_team, away_team)")
      .eq("id", predictionId)
      .single();
    if (!pred) throw new Error("Palpite não encontrado");

    const targetName = (pred.profiles as unknown as { name: string } | null)?.name ?? "Participante";
    const match = pred.matches as unknown as { home_team: string; away_team: string } | null;
    const home = translateTeamName(match?.home_team ?? "");
    const away = translateTeamName(match?.away_team ?? "");

    text = `${reactorName} reagiu com ${emoji} ao palpite de ${targetName}: ${pred.home_score_pred}x${pred.away_score_pred} (${home} x ${away})`;
  } else {
    const { data: rankingRow } = await service
      .from("ranking")
      .select("name, total_points")
      .eq("id", rankingUserId!)
      .single();

    const targetName = rankingRow?.name ?? "Participante";
    const points = rankingRow?.total_points ?? 0;

    text = `${reactorName} reagiu com ${emoji} à posição de ${targetName} no ranking (${points} pts)`;
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, message: text, type: "reaction" });

  if (error) throw new Error("Não foi possível enviar a reação");
}

export async function deleteMessage(messageId: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("Sem permissão");

  const service = createServiceClient();
  await service.from("chat_messages").delete().eq("id", messageId);
}
