export const dynamic = "force-dynamic";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Prediction, RankingEntry, STAGE_LABELS } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import ProfileClient from "./ProfileClient";

const TZ = "America/Sao_Paulo";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: target }, { data: fullRanking }, { data: matches }] = await Promise.all([
    supabase.from("ranking").select("*").eq("id", userId).single(),
    supabase.from("ranking").select("id"),
    supabase.from("matches").select("*").order("starts_at", { ascending: true }),
  ]);

  if (!target) {
    return (
      <div className="min-h-screen bg-copa-dark flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-white/60 text-sm">Perfil não encontrado.</p>
        <Link href="/app/ranking" className="text-copa-red text-sm font-semibold mt-3 hover:underline">
          Voltar pro ranking
        </Link>
      </div>
    );
  }

  const position = (fullRanking ?? []).findIndex((r) => r.id === userId);

  const matchList = matches ?? [];
  const tenMinutesAgo = new Date(new Date().getTime() - 10 * 60 * 1000);
  const startedMatchIds = matchList
    .filter((m) => new Date(m.starts_at) <= tenMinutesAgo)
    .map((m) => m.id);

  // Só busca os palpites do alvo para jogos já visíveis (mesmo buffer de
  // 10min do getMatchPredictions) — nunca confiar em RLS aqui, já que o
  // client de serviço abaixo ignora RLS.
  let predictions: Prediction[] = [];
  if (startedMatchIds.length > 0) {
    const service = createServiceClient();
    const { data } = await service
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .in("match_id", startedMatchIds);
    predictions = (data ?? []) as Prediction[];
  }

  const predictionMap = new Map<number, Prediction>(
    predictions.map((p) => [p.match_id, p])
  );

  const matchesWithData = matchList.map((match) => ({
    match,
    prediction: predictionMap.get(match.id),
    started: new Date(match.starts_at) <= new Date(),
    started10min: new Date(match.starts_at) <= tenMinutesAgo,
    formattedDate: formatInTimeZone(new Date(match.starts_at), TZ, "dd/MM • HH:mm", { locale: ptBR }),
    dayKey: formatInTimeZone(new Date(match.starts_at), TZ, "yyyy-MM-dd"),
    dayLabel: formatInTimeZone(new Date(match.starts_at), TZ, "EEE dd/MM", { locale: ptBR }),
    stage: match.stage || "OUTROS",
    stageLabel: STAGE_LABELS[match.stage ?? ""] ?? (match.stage ?? "Outros"),
    groupName: match.group_name ?? null,
  }));

  return (
    <ProfileClient
      target={target as RankingEntry}
      position={position}
      matchesWithData={matchesWithData}
    />
  );
}
