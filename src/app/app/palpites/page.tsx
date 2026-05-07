export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { Match, Prediction } from "@/lib/types";
import PalpitesClient from "./PalpitesClient";
import PalpitesDayFilter from "./PalpitesDayFilter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Oitavas de Final",
  QUARTER_FINALS: "Quartas de Final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "3o Lugar",
  FINAL: "Final",
};

export default async function PalpitesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("starts_at", { ascending: true }),
    supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const predictionMap = new Map<number, Prediction>(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  const matchList = matches ?? [];

  // Build matches with formatted data for client
  const matchesWithData = matchList.map((match) => ({
    match,
    prediction: predictionMap.get(match.id),
    started: new Date(match.starts_at) <= new Date(),
    formattedDate: format(new Date(match.starts_at), "dd/MM • HH:mm", { locale: ptBR }),
    dayKey: format(new Date(match.starts_at), "yyyy-MM-dd"),
    dayLabel: format(new Date(match.starts_at), "EEE dd/MM", { locale: ptBR }),
    stage: match.stage || "OUTROS",
    stageLabel: STAGE_LABELS[match.stage ?? ""] ?? (match.stage ?? "Outros"),
    groupName: match.group_name ?? null,
  }));

  if (matchesWithData.length === 0) {
    return (
      <div className="min-h-screen bg-copa-dark flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-5xl mb-4">📅</p>
        <p className="text-white/60 text-sm">Os jogos ainda não foram carregados.</p>
        <p className="text-xs text-white/30 mt-1">Aguarde a sincronização dos dados.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-copa-dark">
      <PalpitesDayFilter matchesWithData={matchesWithData} />
    </div>
  );
}