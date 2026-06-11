"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitBonusAnswer(questionId: number, answer: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: question } = await supabase
    .from("bonus_questions")
    .select("closes_at, is_active")
    .eq("id", questionId)
    .single();

  if (!question?.is_active) throw new Error("Pergunta inativa");
  if (question.closes_at && new Date(question.closes_at) <= new Date()) {
    throw new Error("Prazo encerrado");
  }

  await supabase
    .from("bonus_answers")
    .upsert(
      { user_id: user.id, question_id: questionId, answer },
      { onConflict: "user_id,question_id" }
    );

  revalidatePath("/app/extras");
}
