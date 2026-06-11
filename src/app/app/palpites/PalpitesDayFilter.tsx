"use client";

import { useState, useMemo } from "react";
import PalpitesClient from "./PalpitesClient";
import { Match, Prediction, formatGroupName } from "@/lib/types";

interface MatchWithData {
  match: Match;
  prediction: Prediction | undefined;
  started: boolean;
  started10min: boolean;
  formattedDate: string;
  dayKey: string;
  dayLabel: string;
  stage: string;
  stageLabel: string;
  groupName: string | null;
}

interface Props {
  matchesWithData: MatchWithData[];
}

export default function PalpitesDayFilter({ matchesWithData }: Props) {
  // Get unique days
  const days = useMemo(() => {
    const seen = new Set<string>();
    const result: { key: string; label: string }[] = [];
    for (const m of matchesWithData) {
      if (!seen.has(m.dayKey)) {
        seen.add(m.dayKey);
        result.push({ key: m.dayKey, label: m.dayLabel });
      }
    }
    return result;
  }, [matchesWithData]);

  // Default: first day that has a match today or in the future, else first day
  const defaultDay = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const futureDay = days.find((d) => d.key >= today);
    return futureDay?.key ?? days[0]?.key ?? "";
  }, [days]);

  const [selectedDay, setSelectedDay] = useState(defaultDay);

  const filtered = useMemo(
    () => matchesWithData.filter((m) => m.dayKey === selectedDay),
    [matchesWithData, selectedDay]
  );

  // Group filtered matches by stage/group
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; group: string | null; items: MatchWithData[] }>();
    for (const m of filtered) {
      const key = `${m.stage}-${m.groupName ?? ""}`;
      if (!map.has(key)) {
        map.set(key, { label: m.stageLabel, group: m.groupName, items: [] });
      }
      map.get(key)!.items.push(m);
    }
    return [...map.values()];
  }, [filtered]);

  return (
    <div>
      {/* Sticky day filter pills */}
      <div className="sticky top-0 z-10 bg-copa-dark border-b border-white/10 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {days.map((d) => (
            <button
              key={d.key}
              onClick={() => setSelectedDay(d.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                selectedDay === d.key
                  ? "bg-copa-red text-white"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {grouped.map(({ label, group, items }) => (
          <section key={`${label}-${group}`} className="mb-5">
            <div className="mb-3">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">
                {label}
              </h2>
              {group && (
                <p className="text-xs text-white/30 mt-0.5">{formatGroupName(group)}</p>
              )}
            </div>
            {items.map((m) => (
              <PalpitesClient
                key={m.match.id}
                match={m.match}
                prediction={m.prediction}
                started={m.started}
                started10min={m.started10min}
                formattedDate={m.formattedDate}
              />
            ))}
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <p className="text-sm">Nenhum jogo neste dia.</p>
          </div>
        )}
      </div>
    </div>
  );
}