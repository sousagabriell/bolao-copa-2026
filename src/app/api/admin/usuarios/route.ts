import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/admin/usuarios — lista usuários
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const service = createServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id, name, payment_status, payment_proof_url, paid_at, is_admin, created_at")
    .order("created_at", { ascending: true });

  return NextResponse.json(profiles ?? []);
}

// PATCH /api/admin/usuarios — aprova ou revoga usuário
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json() as { userId: string; payment_status: string };
  const validStatuses = ["paid", "pending", "pending_approval", "rejected", "revoked"];
  if (!body.userId || !validStatuses.includes(body.payment_status)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const service = createServiceClient();
  await service
    .from("profiles")
    .update({ payment_status: body.payment_status })
    .eq("id", body.userId);

  return NextResponse.json({ success: true });
}
