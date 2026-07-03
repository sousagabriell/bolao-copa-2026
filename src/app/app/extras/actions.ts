"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BonusAnswerEntry {
  answer: string;
  points: number | null;
  profiles: { name: string; avatar_url: string | null } | null;
}

export async function getBonusQuestionAnswers(questionId: number): Promise<BonusAnswerEntry[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: question } = await supabase
    .from("bonus_questions")
    .select("closes_at")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Pergunta não encontrada");
  if (!question.closes_at || new Date(question.closes_at) > new Date()) {
    throw new Error("Respostas liberadas após o encerramento da pergunta");
  }

  const service = createServiceClient();
  const { data } = await service
    .from("bonus_answers")
    .select("answer, points, profiles(name, avatar_url)")
    .eq("question_id", questionId)
    .order("points", { ascending: false, nullsFirst: false });

  return (data ?? []) as unknown as BonusAnswerEntry[];
}

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
