export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { Match, Prediction } from "@/lib/types";
import PalpitesClient from "./PalpitesClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Oitavas de Final",
  QUARTER_FINALS: "Quartas de Final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "3º Lugar",
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

  // Agrupar por fase
  const grouped = new Map<string, Match[]>();
  for (const match of matches ?? []) {
    const stage = match.stage || "OUTROS";
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(match);
  }

  // Ordenar fases
  const stageOrder = ["GROUP_STAGE", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
  const sortedStages = [...grouped.keys()].sort(
    (a, b) => (stageOrder.indexOf(a) ?? 99) - (stageOrder.indexOf(b) ?? 99)
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {sortedStages.map((stage) => {
        const stageMatches = grouped.get(stage) ?? [];
        // Agrupar por grupo dentro da fase de grupos
        const byGroup = new Map<string, Match[]>();
        for (const m of stageMatches) {
          const grp = m.group_name ?? "—";
          if (!byGroup.has(grp)) byGroup.set(grp, []);
          byGroup.get(grp)!.push(m);
        }

        return (
          <section key={stage} className="mb-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
              {STAGE_LABELS[stage] ?? stage}
            </h2>
            {[...byGroup.entries()].map(([grp, grpMatches]) => (
              <div key={grp}>
                {grp !== "—" && stage === "GROUP_STAGE" && (
                  <p className="text-xs text-gray-400 font-medium mb-2 px-1">{grp}</p>
                )}
                {grpMatches.map((match) => {
                  const pred = predictionMap.get(match.id);
                  const started = new Date(match.starts_at) <= new Date();
                  return (
                    <PalpitesClient
                      key={match.id}
                      match={match}
                      prediction={pred}
                      started={started}
                      formattedDate={format(
                        new Date(match.starts_at),
                        "dd/MM • HH:mm",
                        { locale: ptBR }
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </section>
        );
      })}

      {(!matches || matches.length === 0) && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-sm">Os jogos ainda não foram carregados.</p>
          <p className="text-xs mt-1">Aguarde a sincronização dos dados.</p>
        </div>
      )}
    </div>
  );
}
