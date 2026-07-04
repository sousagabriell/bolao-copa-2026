"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  MatchStatus,
  MentionableUser,
  ReactionEmoji,
  REACTION_EMOJIS,
  ReactionMessageData,
  ReactionSummary,
  translateTeamName,
} from "@/lib/types";

const MAX_MESSAGE_LENGTH = 500;
const INITIAL_LIMIT = 50;
const MESSAGE_SELECT =
  "id, user_id, message, type, created_at, reaction_data, profiles(name, avatar_url), chat_message_mentions(mentioned_user_id, profiles!chat_message_mentions_mentioned_user_id_fkey(name))";

export interface ChatMessageEntry {
  id: number;
  user_id: string;
  message: string;
  type: "text" | "reaction";
  created_at: string;
  reaction_data: ReactionMessageData | null;
  profiles: { name: string; avatar_url: string | null } | null;
  chat_message_mentions: Array<{ mentioned_user_id: string; profiles: { name: string } | null }>;
  mentioned_names: string[];
}

function withMentionedNames<T extends { chat_message_mentions?: ChatMessageEntry["chat_message_mentions"] }>(
  row: T
): T & { mentioned_names: string[] } {
  return {
    ...row,
    mentioned_names: (row.chat_message_mentions ?? []).map((m) => m.profiles?.name).filter((n): n is string => !!n),
  };
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

  return ((data ?? []) as unknown as ChatMessageEntry[]).map(withMentionedNames).reverse();
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

  return ((data ?? []) as unknown as ChatMessageEntry[]).map(withMentionedNames);
}

export async function getMentionableUsers(): Promise<MentionableUser[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .eq("payment_status", "paid")
    .neq("id", user.id)
    .order("name", { ascending: true });

  if (error) console.error("Falha ao buscar usuários mencionáveis:", error);

  return (data ?? []) as MentionableUser[];
}

export async function sendMessage(text: string, mentionedUserIds: string[] = []): Promise<ChatMessageEntry> {
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

  const uniqueIds = [...new Set(mentionedUserIds)].filter((id) => id !== user.id);
  if (uniqueIds.length > 0) {
    const service = createServiceClient();

    const { data: paidTargets } = await service
      .from("profiles")
      .select("id")
      .in("id", uniqueIds)
      .eq("payment_status", "paid");
    const validIds = (paidTargets ?? []).map((p) => p.id);

    if (validIds.length > 0) {
      const messageId = (data as unknown as ChatMessageEntry).id;

      const { error: mentionsError } = await service
        .from("chat_message_mentions")
        .insert(validIds.map((uid) => ({ message_id: messageId, mentioned_user_id: uid })));
      if (mentionsError) console.error("Falha ao registrar menções:", mentionsError);

      const { error: notifError } = await service
        .from("notifications")
        .insert(validIds.map((uid) => ({ user_id: uid, actor_id: user.id, message_id: messageId, type: "mention" })));
      if (notifError) console.error("Falha ao criar notificações de menção:", notifError);
    }
  }

  return withMentionedNames(data as unknown as ChatMessageEntry);
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
  let reactionData: ReactionMessageData;

  if (predictionId != null) {
    const { data: pred } = await service
      .from("predictions")
      .select(
        "match_id, home_score_pred, away_score_pred, points, profiles(id, name, avatar_url), matches(home_team, away_team, home_team_crest, away_team_crest, status, home_score, away_score)"
      )
      .eq("id", predictionId)
      .single();
    if (!pred) throw new Error("Palpite não encontrado");

    const targetProfile = pred.profiles as unknown as {
      id: string;
      name: string;
      avatar_url: string | null;
    } | null;
    const match = pred.matches as unknown as {
      home_team: string;
      away_team: string;
      home_team_crest: string | null;
      away_team_crest: string | null;
      status: MatchStatus;
      home_score: number | null;
      away_score: number | null;
    } | null;

    const targetName = targetProfile?.name ?? "Participante";
    const home = translateTeamName(match?.home_team ?? "");
    const away = translateTeamName(match?.away_team ?? "");

    text = `${reactorName} reagiu com ${emoji} ao palpite de ${targetName}: ${pred.home_score_pred}x${pred.away_score_pred} (${home} x ${away})`;

    reactionData = {
      kind: "prediction",
      emoji,
      matchId: pred.match_id,
      targetUserId: targetProfile?.id ?? "",
      targetName,
      targetAvatarUrl: targetProfile?.avatar_url ?? null,
      homeTeam: match?.home_team ?? "",
      awayTeam: match?.away_team ?? "",
      homeTeamCrest: match?.home_team_crest ?? null,
      awayTeamCrest: match?.away_team_crest ?? null,
      homeScorePred: pred.home_score_pred,
      awayScorePred: pred.away_score_pred,
      homeScore: match?.home_score ?? null,
      awayScore: match?.away_score ?? null,
      matchStatus: match?.status ?? "SCHEDULED",
      points: pred.points,
    };
  } else {
    const [{ data: rankingRow }, { data: fullRanking }] = await Promise.all([
      service
        .from("ranking")
        .select("id, name, avatar_url, total_points, exact_scores, correct_results, total_predictions")
        .eq("id", rankingUserId!)
        .single(),
      service.from("ranking").select("id"),
    ]);

    const targetName = rankingRow?.name ?? "Participante";
    const points = rankingRow?.total_points ?? 0;
    const position = (fullRanking ?? []).findIndex((r) => r.id === rankingUserId);

    text = `${reactorName} reagiu com ${emoji} à posição de ${targetName} no ranking (${points} pts)`;

    reactionData = {
      kind: "ranking",
      emoji,
      targetUserId: rankingUserId!,
      targetName,
      targetAvatarUrl: rankingRow?.avatar_url ?? null,
      position: position >= 0 ? position : null,
      totalPoints: rankingRow?.total_points ?? 0,
      exactScores: rankingRow?.exact_scores ?? 0,
      correctResults: rankingRow?.correct_results ?? 0,
      totalPredictions: rankingRow?.total_predictions ?? 0,
    };
  }

  const { data: inserted, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, message: text, type: "reaction", reaction_data: reactionData })
    .select("id")
    .single();

  if (error || !inserted) throw new Error("Não foi possível enviar a reação");

  const targetUserId = reactionData.targetUserId;
  if (targetUserId && targetUserId !== user.id) {
    const { error: notifError } = await service.from("notifications").insert({
      user_id: targetUserId,
      actor_id: user.id,
      message_id: inserted.id,
    });
    if (notifError) console.error("Falha ao criar notificação:", notifError);
  }
}

export type MessageReactionsMap = Record<number, ReactionSummary[]>;

export async function getReactionsForMessages(messageIds: number[]): Promise<MessageReactionsMap> {
  const map: MessageReactionsMap = {};
  if (messageIds.length === 0) return map;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data } = await supabase
    .from("chat_message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);

  for (const row of data ?? []) {
    const list = (map[row.message_id] ??= []);
    let entry = list.find((r) => r.emoji === row.emoji);
    if (!entry) {
      entry = { emoji: row.emoji as ReactionEmoji, count: 0, reactedByMe: false };
      list.push(entry);
    }
    entry.count += 1;
    if (row.user_id === user.id) entry.reactedByMe = true;
  }

  return map;
}

export async function toggleMessageReaction(
  messageId: number,
  emoji: ReactionEmoji
): Promise<ReactionSummary[]> {
  if (!REACTION_EMOJIS.includes(emoji)) throw new Error("Emoji inválido");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_status")
    .eq("id", user.id)
    .single();
  if (profile?.payment_status !== "paid") {
    throw new Error("Apenas participantes pagos podem reagir");
  }

  const { data: existing } = await supabase
    .from("chat_message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("chat_message_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("chat_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });

    const { data: message } = await supabase
      .from("chat_messages")
      .select("user_id")
      .eq("id", messageId)
      .single();

    if (message && message.user_id !== user.id) {
      const service = createServiceClient();
      const { error: notifError } = await service.from("notifications").insert({
        user_id: message.user_id,
        actor_id: user.id,
        message_id: messageId,
        type: "message_reaction",
        emoji,
      });
      if (notifError) console.error("Falha ao criar notificação de reação à mensagem:", notifError);
    }
  }

  const map = await getReactionsForMessages([messageId]);
  return map[messageId] ?? [];
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

  const { data: message } = await supabase
    .from("chat_messages")
    .select("user_id")
    .eq("id", messageId)
    .single();

  const isOwner = message?.user_id === user.id;
  if (!profile?.is_admin && !isOwner) throw new Error("Sem permissão");

  const service = createServiceClient();
  await service.from("chat_messages").delete().eq("id", messageId);
}
