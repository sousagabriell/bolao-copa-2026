export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { BonusQuestion, BonusAnswer } from "@/lib/types";
import ExtrasClient from "./ExtrasClient";

export default async function ExtrasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("bonus_questions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("bonus_answers")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const answerMap: Record<number, BonusAnswer> = {};
  for (const a of answers ?? []) {
    answerMap[a.question_id] = a as BonusAnswer;
  }

  return (
    <ExtrasClient
      questions={(questions ?? []) as BonusQuestion[]}
      answerMap={answerMap}
    />
  );
}
