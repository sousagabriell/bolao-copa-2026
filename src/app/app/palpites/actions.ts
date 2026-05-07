"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
