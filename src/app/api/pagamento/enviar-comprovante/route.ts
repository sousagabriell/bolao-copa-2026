import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json() as { proof_url?: string };
  if (!body.proof_url || !body.proof_url.startsWith("https://")) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      payment_proof_url: body.proof_url,
      payment_status: "pending_approval",
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });

  return NextResponse.json({ success: true });
}
