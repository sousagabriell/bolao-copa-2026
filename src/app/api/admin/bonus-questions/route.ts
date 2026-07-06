import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? supabase : null;
}

// GET — listar todas as perguntas
export async function GET() {
  const supabase = await assertAdmin();
  if (!supabase) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const service = createServiceClient();
  const { data } = await service
    .from("bonus_questions")
    .select("*")
    .order("sort_order", { ascending: true });

  return NextResponse.json(data ?? []);
}

// POST — criar pergunta
export async function POST(request: NextRequest) {
  const supabase = await assertAdmin();
  if (!supabase) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json() as {
    question: string;
    description?: string;
    type: "select" | "number";
    options?: string[];
    min_value?: number;
    max_value?: number;
    points: number;
    closes_at?: string;
    sort_order?: number;
  };

  if (!body.question || !body.type || !body.points) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("bonus_questions")
    .insert({
      question: body.question,
      description: body.description ?? null,
      type: body.type,
      options: body.options ?? null,
      min_value: body.min_value ?? null,
      max_value: body.max_value ?? null,
      points: body.points,
      closes_at: body.closes_at ?? null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — atualizar (correct_answer, is_active) ou pontuar
export async function PATCH(request: NextRequest) {
  const supabase = await assertAdmin();
  if (!supabase) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json() as {
    id: number;
    correct_answer?: string;
    is_active?: boolean;
    score?: boolean;
  };

  if (!body.id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const service = createServiceClient();

  // Pontuar respostas
  if (body.score) {
    const { data: question } = await service
      .from("bonus_questions")
      .select("correct_answer, points")
      .eq("id", body.id)
      .single();

    if (!question?.correct_answer) {
      return NextResponse.json({ error: "Defina a resposta correta antes de pontuar" }, { status: 400 });
    }

    const { data: answers } = await service
      .from("bonus_answers")
      .select("id, answer")
      .eq("question_id", body.id);

    for (const ans of answers ?? []) {
      await service
        .from("bonus_answers")
        .update({ points: ans.answer === question.correct_answer ? question.points : 0 })
        .eq("id", ans.id);
    }

    await service
      .from("bonus_questions")
      .update({ scored_at: new Date().toISOString() })
      .eq("id", body.id);

    return NextResponse.json({ scored: answers?.length ?? 0 });
  }

  // Atualizar campos
  const updates: Record<string, unknown> = {};
  if (body.correct_answer !== undefined) updates.correct_answer = body.correct_answer;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  await service.from("bonus_questions").update(updates).eq("id", body.id);
  return NextResponse.json({ success: true });
}
