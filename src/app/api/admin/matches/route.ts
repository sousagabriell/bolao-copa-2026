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

// GET — listar partidas (mais recentes + futuras)
export async function GET() {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const service = createServiceClient();
  const { data } = await service
    .from("matches")
    .select("id,external_id,home_team,away_team,home_team_crest,away_team_crest,starts_at,status,home_score,away_score,home_score_regular,away_score_regular,stage,group_name,stadium,city,matchday")
    .order("starts_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

// POST — criar partida manualmente
export async function POST(request: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json() as {
    home_team: string;
    away_team: string;
    starts_at: string;
    stage: string;
    group_name?: string;
    stadium?: string;
    city?: string;
    matchday?: number;
  };

  if (!body.home_team || !body.away_team || !body.starts_at || !body.stage) {
    return NextResponse.json({ error: "Campos obrigatórios: times, data/hora e fase" }, { status: 400 });
  }

  const service = createServiceClient();

  // Gera um external_id negativo único para partidas manuais (evita conflito com a API)
  const { data: last } = await service
    .from("matches")
    .select("external_id")
    .lt("external_id", 0)
    .order("external_id", { ascending: true })
    .limit(1)
    .single();

  const nextExternalId = last ? last.external_id - 1 : -1;

  const { data, error } = await service
    .from("matches")
    .insert({
      external_id: nextExternalId,
      home_team: body.home_team,
      away_team: body.away_team,
      starts_at: body.starts_at,
      stage: body.stage,
      group_name: body.group_name ?? null,
      stadium: body.stadium ?? null,
      city: body.city ?? null,
      matchday: body.matchday ?? null,
      status: "SCHEDULED",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — atualizar resultado ou status de uma partida
export async function PATCH(request: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json() as {
    id: number;
    home_score_regular?: number;
    away_score_regular?: number;
    status?: string;
  };

  if (!body.id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const service = createServiceClient();

  const updates: Record<string, unknown> = {};
  if (body.home_score_regular !== undefined) {
    updates.home_score_regular = body.home_score_regular;
    updates.home_score = body.home_score_regular;
  }
  if (body.away_score_regular !== undefined) {
    updates.away_score_regular = body.away_score_regular;
    updates.away_score = body.away_score_regular;
  }
  if (body.status !== undefined) updates.status = body.status;

  const { error } = await service.from("matches").update(updates).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
