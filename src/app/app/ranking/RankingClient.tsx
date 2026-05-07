"use client";

import Image from "next/image";
import { RankingEntry } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";

interface Props {
  ranking: RankingEntry[];
  totalPrize: number;
  entryFee: number;
}

export default function RankingClient({ ranking, totalPrize, entryFee }: Props) {
  return (
    <div className="min-h-screen bg-copa-dark">
      {/* Premio banner */}
      <div className="bg-gradient-to-br from-copa-gold to-yellow-600 px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy size={18} className="text-yellow-900" />
          <p className="text-xs font-bold text-yellow-900 uppercase tracking-widest">Premio Acumulado</p>
        </div>
        <p className="text-5xl font-black text-white drop-shadow">
          R$ {totalPrize.toFixed(2).replace(".", ",")}
        </p>
        <p className="text-xs text-yellow-900/80 mt-1.5">
          {ranking.length} participantes × R$ {entryFee.toFixed(2).replace(".", ",")}
        </p>
      </div>

      {/* Lista */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {ranking.length === 0 && (
          <div className="text-center py-12">
            <Medal size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">O ranking sera atualizado conforme os jogos forem apurados.</p>
          </div>
        )}

        {ranking.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-colors ${
              i === 0
                ? "bg-copa-gold/10 border-copa-gold/40"
                : i === 1
                ? "bg-white/5 border-white/10"
                : i === 2
                ? "bg-white/5 border-white/10"
                : "bg-white/5 border-white/5"
            }`}
          >
            {/* Posição */}
            <div className="w-8 text-center shrink-0">
              {i === 0 ? (
                <span className="text-copa-gold font-black text-lg">1</span>
              ) : i === 1 ? (
                <span className="text-gray-300 font-black text-base">2</span>
              ) : i === 2 ? (
                <span className="text-amber-600 font-black text-base">3</span>
              ) : (
                <span className="text-xs font-bold text-white/30">{i + 1}°</span>
              )}
            </div>

            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 ${
              i === 0 ? "border-copa-gold/60" : "border-white/10"
            }`}>
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-copa-dark-700 text-white font-bold text-sm">
                  {entry.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nome e stats */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${i === 0 ? "text-copa-gold" : "text-white"}`}>
                {entry.name}
              </p>
              <div className="flex gap-3 mt-0.5">
                <span className="text-xs text-copa-gold/80">{entry.total_points ?? 0} pts</span>
                <span className="text-xs text-white/30">{entry.exact_scores ?? 0} acertos</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}