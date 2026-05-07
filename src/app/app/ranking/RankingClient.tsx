"use client";

import Image from "next/image";
import { RankingEntry } from "@/lib/types";

interface Props {
  ranking: RankingEntry[];
  totalPrize: number;
  entryFee: number;
}

const medalColors = ["🥇", "🥈", "🥉"];

export default function RankingClient({ ranking, totalPrize, entryFee }: Props) {
  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Banner de prêmio */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-4 mb-5 text-center shadow-sm">
        <p className="text-xs font-semibold text-yellow-900 mb-1">🏆 PRÊMIO ACUMULADO</p>
        <p className="text-4xl font-black text-white">
          R$ {totalPrize.toFixed(2).replace(".", ",")}
        </p>
        <p className="text-xs text-yellow-900 mt-1">
          {ranking.length} participantes × R$ {entryFee.toFixed(2).replace(".", ",")}
        </p>
      </div>

      {/* Lista de ranking */}
      <div className="space-y-2">
        {ranking.map((entry, i) => (
          <div
            key={entry.id}
            className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 ${
              i === 0 ? "border-yellow-300 bg-yellow-50" : "border-gray-100"
            }`}
          >
            {/* Posição */}
            <div className="w-8 text-center">
              {i < 3 ? (
                <span className="text-xl">{medalColors[i]}</span>
              ) : (
                <span className="text-sm font-bold text-gray-400">{i + 1}º</span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-green-700 font-bold text-sm">
                  {entry.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nome e stats */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{entry.name}</p>
              <div className="flex gap-3 mt-0.5">
                <span className="text-xs text-yellow-600">⭐ {entry.exact_scores} exatos</span>
                <span className="text-xs text-blue-500">✓ {entry.correct_results} certos</span>
              </div>
            </div>

            {/* Pontos */}
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black text-green-700">{entry.total_points}</p>
              <p className="text-xs text-gray-400">pts</p>
            </div>
          </div>
        ))}
      </div>

      {ranking.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-sm">O ranking será atualizado conforme os jogos forem apurados.</p>
        </div>
      )}
    </div>
  );
}
