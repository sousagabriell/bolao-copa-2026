"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import DayCarousel from "@/components/DayCarousel";
import { Match, Prediction, RankingEntry, formatGroupName, translateTeamName } from "@/lib/types";

const TZ = "America/Sao_Paulo";

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
  target: RankingEntry;
  position: number;
  matchesWithData: MatchWithData[];
}

const RANK_STYLES = [
  { avatarBorder: "border-copa-gold/60", badge: "text-copa-gold border-copa-gold/40 bg-copa-gold/10", name: "text-copa-gold" },
  { avatarBorder: "border-gray-400/40", badge: "text-gray-300 border-white/20 bg-white/10", name: "text-gray-300" },
  { avatarBorder: "border-amber-600/40", badge: "text-amber-600 border-amber-600/30 bg-amber-600/10", name: "text-amber-600" },
];
const RANK_STYLE_DEFAULT = { avatarBorder: "border-white/20", badge: "text-white/60 border-white/15 bg-white/5", name: "text-white" };

function PointsBadge({ points }: { points: number }) {
  const tier = [3, 6].includes(points)
    ? "bg-copa-gold/20 text-copa-gold border-copa-gold/30"
    : [1, 2].includes(points)
    ? "bg-blue-500/20 text-blue-400 border-blue-400/30"
    : "bg-red-500/20 text-red-400 border-red-400/30";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${tier}`}>
      +{points}
    </span>
  );
}

export default function ProfileClient({ target, position, matchesWithData }: Props) {
  const rankStyle = position >= 0 && position < 3 ? RANK_STYLES[position] : RANK_STYLE_DEFAULT;

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

  const defaultDay = useMemo(() => {
    const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const futureDay = days.find((d) => d.key >= today);
    return futureDay?.key ?? days[0]?.key ?? "";
  }, [days]);

  const [selectedDay, setSelectedDay] = useState(defaultDay);

  const filtered = useMemo(
    () => matchesWithData.filter((m) => m.dayKey === selectedDay),
    [matchesWithData, selectedDay]
  );

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
    <div className="min-h-screen bg-copa-dark">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Link
          href="/app/ranking"
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Ranking
        </Link>
      </div>

      {/* Cartão do jogador */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="relative bg-copa-dark-800 rounded-3xl border border-white/10 p-6 text-center overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-copa-gold/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative">
            <div className={`w-24 h-24 mx-auto rounded-full overflow-hidden border-4 shadow-lg ${rankStyle.avatarBorder}`}>
              {target.avatar_url ? (
                <Image src={target.avatar_url} alt={target.name} width={96} height={96} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-copa-dark-700 text-white font-bold text-3xl">
                  {target.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {position >= 0 && (
              <div className={`-mt-4 relative inline-flex items-center gap-1 border rounded-full px-3 py-1 text-xs font-black ${rankStyle.badge}`}>
                {position < 3 && <Trophy size={12} />}
                {position + 1}º lugar
              </div>
            )}

            <h1 className={`mt-3 text-xl font-black ${rankStyle.name}`}>{target.name}</h1>

            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-lg font-black text-copa-gold">{target.total_points}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wide">pts</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">{target.exact_scores}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wide">exatos</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">{target.correct_results}</p>
                <p className="text-[11px] text-white/40 uppercase tracking-wide">resultados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {days.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">Nenhum jogo cadastrado ainda.</div>
        ) : (
          <>
            <DayCarousel days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            <div className="max-w-lg mx-auto px-4 py-4">
              {grouped.map(({ label, group, items }) => (
                <section key={`${label}-${group}`} className="mb-5">
                  <div className="mb-3">
                    <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">{label}</h2>
                    {group && <p className="text-xs text-white/30 mt-0.5">{formatGroupName(group)}</p>}
                  </div>

                  {items.map(({ match, prediction, started, started10min, formattedDate }) => (
                    <div
                      key={match.id}
                      className="bg-copa-dark-800 rounded-2xl border border-white/10 mb-3 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {match.home_team_crest && (
                            <Image src={match.home_team_crest} alt="" width={20} height={20} className="object-contain shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-white truncate">
                            {translateTeamName(match.home_team)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center shrink-0 px-2">
                          {(started) && match.home_score !== null ? (
                            <span className="text-sm font-black text-white">
                              {match.home_score}–{match.away_score}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/30">{formattedDate}</span>
                          )}
                        </div>

                        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                          <span className="text-xs font-semibold text-white truncate text-right">
                            {translateTeamName(match.away_team)}
                          </span>
                          {match.away_team_crest && (
                            <Image src={match.away_team_crest} alt="" width={20} height={20} className="object-contain shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5">
                        {!started10min ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <Lock size={11} className="text-white/25" />
                            </div>
                            <p className="text-xs text-white/30">Disponível após o início do jogo</p>
                          </div>
                        ) : prediction ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-white/40">Palpite:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white bg-white/10 rounded-lg px-2.5 py-1">
                                {prediction.home_score_pred} × {prediction.away_score_pred}
                              </span>
                              {prediction.points !== null && prediction.points !== undefined && (
                                <PointsBadge points={prediction.points} />
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/30">Sem palpite</p>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  <p className="text-sm">Nenhum jogo neste dia.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
