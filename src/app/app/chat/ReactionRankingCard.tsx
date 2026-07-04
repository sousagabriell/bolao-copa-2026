"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ReactionRankingData } from "@/lib/types";

interface Props {
  data: ReactionRankingData;
  reactorName: string;
  reactorAvatarUrl: string | null;
  time: string;
  canDelete: boolean;
  onDelete: () => void;
}

const RANK_STYLES = [
  { border: "border-copa-gold/60", badge: "text-copa-gold bg-copa-gold/10 border-copa-gold/30", name: "text-copa-gold" },
  { border: "border-gray-400/40", badge: "text-gray-300 bg-white/10 border-white/20", name: "text-gray-300" },
  { border: "border-amber-600/40", badge: "text-amber-600 bg-amber-600/10 border-amber-600/30", name: "text-amber-600" },
];
const RANK_STYLE_DEFAULT = { border: "border-white/10", badge: "text-white/50 bg-white/5 border-white/10", name: "text-white" };

export default function ReactionRankingCard({ data, reactorName, time, canDelete, onDelete }: Props) {
  const style = data.position !== null && data.position < 3 ? RANK_STYLES[data.position] : RANK_STYLE_DEFAULT;

  return (
    <div className="flex justify-center">
      <div className="max-w-[92%] w-full bg-copa-dark-800 rounded-2xl border border-white/10 px-4 py-4">
        {/* Cabeçalho: quem reagiu + a quem + apagar */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className="text-xs text-white/40 min-w-0 break-words leading-snug">
            <span className="font-semibold text-white/70">{reactorName}</span> reagiu com {data.emoji} à posição de{" "}
            <span className="font-semibold text-white/70">{data.targetName}</span> no ranking
            <span className="text-white/25"> · {time}</span>
          </span>

          {canDelete && (
            <button
              onClick={onDelete}
              aria-label="Apagar mensagem"
              className="shrink-0 text-white/20 hover:text-red-400 p-1 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <Link href={`/app/ranking/${data.targetUserId}`} className="flex items-center gap-3 group">
          {data.position !== null && (
            <span className={`shrink-0 text-xs font-black px-2 py-1 rounded-full border ${style.badge}`}>
              {data.position + 1}º
            </span>
          )}

          <div
            className={`w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 transition-colors group-hover:border-copa-red/60 ${style.border}`}
          >
            {data.targetAvatarUrl ? (
              <Image src={data.targetAvatarUrl} alt={data.targetName} width={40} height={40} className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-copa-dark-700 text-white font-bold text-sm">
                {data.targetName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm truncate ${style.name}`}>{data.targetName}</p>
            <div className="flex gap-3 mt-0.5">
              <span className="text-xs text-copa-gold/80">{data.totalPoints} pts</span>
              <span className="text-xs text-white/30">{data.exactScores} exatos</span>
              <span className="text-xs text-white/20">{data.correctResults} resultados</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
