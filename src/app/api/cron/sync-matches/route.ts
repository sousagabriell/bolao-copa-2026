import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchWorldCupMatches } from "@/lib/football-api";

export async function GET(request: NextRequest) {
  // Proteger endpoint com segredo
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const matches = await fetchWorldCupMatches();

  let upserted = 0;
  for (const match of matches) {
    const { error } = await supabase
      .from("matches")
      .upsert(match, { onConflict: "external_id" });

    if (!error) upserted++;
  }

  return NextResponse.json({
    synced: upserted,
    total: matches.length,
    timestamp: new Date().toISOString(),
  });
}
