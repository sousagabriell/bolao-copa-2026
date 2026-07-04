"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { ReactionPredictionData, translateTeamName } from "@/lib/types";

interface Props {
  data: ReactionPredictionData;
  reactorName: string;
  reactorAvatarUrl: string | null;
  time: string;
  isAdmin: boolean;
  onDelete: () => void;
}

export default function ReactionPredictionCard({ data, reactorName, time, isAdmin, onDelete }: Props) {
  const finished = data.matchStatus === "FINISHED";
  const live = data.matchStatus === "IN_PLAY" || data.matchStatus === "PAUSED";
  const hasRealScore = (finished || live) && data.homeScore !== null;

  return (
    <div className="flex justify-center">
      <div className="max-w-[92%] w-full bg-copa-dark-800 rounded-2xl border border-white/10 px-4 py-4">
        {/* Cabeçalho: quem reagiu + a quem + badges + apagar */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className="text-xs text-white/40 min-w-0 break-words leading-snug">
            <span className="font-semibold text-white/70">{reactorName}</span> reagiu com {data.emoji} ao palpite de{" "}
            <span className="font-semibold text-white/70">{data.targetName}</span>
            <span className="text-white/25"> · {time}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {live && (
              <span className="text-xs bg-copa-red/20 text-copa-red font-bold px-2 py-0.5 rounded-full animate-pulse border border-copa-red/30">
                AO VIVO
              </span>
            )}
            {finished && (
              <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">Encerrado</span>
            )}
            {data.points !== null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  [3, 6].includes(data.points)
                    ? "bg-copa-gold/20 text-copa-gold border-copa-gold/30"
                    : [1, 2].includes(data.points)
                    ? "bg-blue-500/20 text-blue-400 border-blue-400/30"
                    : "bg-red-500/20 text-red-400 border-red-400/30"
                }`}
              >
                +{data.points}
              </span>
            )}
            {isAdmin && (
              <button
                onClick={onDelete}
                aria-label="Apagar mensagem"
                className="text-white/20 hover:text-red-400 p-1 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Times e placar — mesma disposição da tela de Palpites */}
        <div className="flex items-center justify-between gap-3">
          {/* Time da casa */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            {data.homeTeamCrest && (
              <Image src={data.homeTeamCrest} alt={translateTeamName(data.homeTeam)} width={36} height={36} className="object-contain drop-shadow" />
            )}
            <span className="text-xs font-semibold text-white text-center leading-tight">
              {translateTeamName(data.homeTeam)}
            </span>
          </div>

          {/* Centro: Resultado real + Palpite */}
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            {hasRealScore && (
              <div className="flex items-center gap-2 text-lg font-black text-white">
                <span>{data.homeScore}</span>
                <span className="text-white/30">–</span>
                <span>{data.awayScore}</span>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-white">{data.homeScorePred}</span>
              <span className="text-white/30 text-xs">×</span>
              <span className="text-sm font-bold text-white">{data.awayScorePred}</span>
            </div>
          </div>

          {/* Time visitante */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            {data.awayTeamCrest && (
              <Image src={data.awayTeamCrest} alt={translateTeamName(data.awayTeam)} width={36} height={36} className="object-contain drop-shadow" />
            )}
            <span className="text-xs font-semibold text-white text-center leading-tight">
              {translateTeamName(data.awayTeam)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
