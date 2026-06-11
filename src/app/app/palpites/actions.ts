"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MatchPredictionEntry {
  home_score_pred: number;
  away_score_pred: number;
  points: number | null;
  profiles: { name: string; avatar_url: string | null } | null;
}

export async function getMatchPredictions(matchId: number): Promise<MatchPredictionEntry[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: match } = await supabase
    .from("matches")
    .select("starts_at")
    .eq("id", matchId)
    .single();

  if (!match) throw new Error("Jogo não encontrado");

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  if (new Date(match.starts_at) > tenMinutesAgo) {
    throw new Error("Palpites liberados 10 minutos após o início do jogo");
  }

  const service = createServiceClient();
  const { data } = await service
    .from("predictions")
    .select("home_score_pred, away_score_pred, points, profiles(name, avatar_url)")
    .eq("match_id", matchId)
    .order("points", { ascending: false, nullsFirst: false });

  return (data ?? []) as unknown as MatchPredictionEntry[];
}

export async function submitPrediction(
  matchId: number,
  homeScore: number,
  awayScore: number
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Verificar se o jogo ainda não começou
  const { data: match } = await supabase
    .from("matches")
    .select("starts_at")
    .eq("id", matchId)
    .single();

  if (!match) throw new Error("Jogo não encontrado");
  if (new Date(match.starts_at) <= new Date()) {
    throw new Error("Prazo para palpites encerrado");
  }

  await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_score_pred: homeScore,
      away_score_pred: awayScore,
    },
    { onConflict: "user_id,match_id" }
  );

  revalidatePath("/app/palpites");
}
