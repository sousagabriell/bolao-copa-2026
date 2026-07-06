export const dynamic = "force-dynamic";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BonusQuestionReveal, RankingEntry } from "@/lib/types";
import RankingClient from "./RankingClient";

const RECENT_BONUS_REVEALS_LIMIT = 5;

async function getRecentBonusReveals(): Promise<BonusQuestionReveal[]> {
  const service = createServiceClient();

  const { data: questions } = await service
    .from("bonus_questions")
    .select("id, question, correct_answer, points, scored_at")
    .not("scored_at", "is", null)
    .order("scored_at", { ascending: false })
    .limit(RECENT_BONUS_REVEALS_LIMIT);

  if (!questions || questions.length === 0) return [];

  const reveals = await Promise.all(
    questions.map(async (q) => {
      const { data: winners } = await service
        .from("bonus_answers")
        .select("points, profiles(name, avatar_url)")
        .eq("question_id", q.id)
        .gt("points", 0)
        .order("points", { ascending: false });

      return {
        id: q.id,
        question: q.question,
        correctAnswer: q.correct_answer ?? "",
        points: q.points,
        winners: ((winners ?? []) as unknown as Array<{ points: number; profiles: { name: string; avatar_url: string | null } | null }>).map((w) => ({
          name: w.profiles?.name ?? "Participante",
          avatarUrl: w.profiles?.avatar_url ?? null,
          points: w.points,
        })),
      } satisfies BonusQuestionReveal;
    })
  );

  return reveals;
}

export default async function RankingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: ranking }, { data: settings }, bonusReveals] = await Promise.all([
    supabase.from("ranking").select("*"),
    supabase.from("settings").select("key, value").in("key", ["entry_fee", "bolao_name"]),
    getRecentBonusReveals(),
  ]);

  const entryFee = parseFloat(
    settings?.find((s) => s.key === "entry_fee")?.value ?? "0"
  );
  const totalPaid = (ranking ?? []).length;
  const totalPrize = entryFee * totalPaid;

  const prizes = {
    first:  totalPrize * 0.60,
    second: totalPrize * 0.25,
    third:  totalPrize * 0.15,
  };

  return (
    <RankingClient
      ranking={(ranking ?? []) as RankingEntry[]}
      totalPrize={totalPrize}
      entryFee={entryFee}
      prizes={prizes}
      currentUserId={user.id}
      bonusReveals={bonusReveals}
    />
  );
}
