"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { BonusQuestionReveal, RankingEntry, ReactionEmoji } from "@/lib/types";
import { Trophy, Medal, Info, X } from "lucide-react";
import { sendReactionMessage } from "../chat/actions";
import ReactionPicker from "@/components/ReactionPicker";
import BonusResultsAnnouncement from "./BonusResultsAnnouncement";

interface Props {
  ranking: RankingEntry[];
  totalPrize: number;
  entryFee: number;
  prizes: { first: number; second: number; third: number };
  currentUserId: string;
  bonusReveals: BonusQuestionReveal[];
}

function formatBRL(value: number) {
  return value.toFixed(2).replace(".", ",");
}

const PRIZE_POSITIONS = [
  { label: "1°", percent: "60%", key: "first" as const, color: "text-copa-gold", bg: "bg-copa-gold/20", border: "border-copa-gold/40" },
  { label: "2°", percent: "25%", key: "second" as const, color: "text-gray-300", bg: "bg-white/10", border: "border-white/20" },
  { label: "3°", percent: "15%", key: "third" as const, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30" },
];

export default function RankingClient({ ranking, totalPrize, entryFee, prizes, currentUserId, bonusReveals }: Props) {
  const [showRules, setShowRules] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleReact(rankingUserId: string, emoji: ReactionEmoji) {
    startTransition(async () => {
      try {
        await sendReactionMessage({ emoji, rankingUserId });
        router.push("/app/chat");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Não foi possível reagir.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-copa-dark">
      <BonusResultsAnnouncement questions={bonusReveals} />

      {/* Premio banner */}
      <div className="bg-gradient-to-br from-copa-gold to-yellow-600 px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy size={18} className="text-yellow-900" />
          <p className="text-xs font-bold text-yellow-900 uppercase tracking-widest">Premio Acumulado</p>
        </div>
        <p className="text-5xl font-black text-white drop-shadow">
          R$ {formatBRL(totalPrize)}
        </p>
        <p className="text-xs text-yellow-900/80 mt-1.5">
          {ranking.length} participantes × R$ {formatBRL(entryFee)}
        </p>

        {/* Distribuição do prêmio */}
        {totalPrize > 0 && (
          <div className="flex justify-center gap-3 mt-4">
            {PRIZE_POSITIONS.map((pos) => (
              <div
                key={pos.key}
                className={`flex flex-col items-center px-3 py-2 rounded-xl border ${pos.bg} ${pos.border}`}
              >
                <span className={`text-xs font-black ${pos.color}`}>{pos.label}</span>
                <span className="text-white font-bold text-sm">R$ {formatBRL(prizes[pos.key])}</span>
                <span className="text-yellow-900/70 text-xs">{pos.percent}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header ranking + botão regras */}
      <div className="max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Classificação</p>
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Info size={14} />
          Regras de pontuação
        </button>
      </div>

      {/* Lista */}
      <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
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
                ? "bg-amber-600/5 border-amber-600/20"
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

            {/* Avatar + nome + stats — toca pra ver o perfil completo */}
            <Link
              href={`/app/ranking/${entry.id}`}
              className="flex items-center gap-3 flex-1 min-w-0 group"
            >
              <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 transition-colors group-hover:border-copa-red/60 ${
                i === 0 ? "border-copa-gold/60" : i === 1 ? "border-gray-400/40" : i === 2 ? "border-amber-600/40" : "border-white/10"
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

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm truncate ${i === 0 ? "text-copa-gold" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-white"}`}>
                    {entry.name}
                  </p>
                </div>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-xs text-copa-gold/80">{entry.total_points ?? 0} pts</span>
                  <span className="text-xs text-white/30">{entry.exact_scores ?? 0} exatos</span>
                  <span className="text-xs text-white/20">{entry.correct_results ?? 0} resultados</span>
                </div>
              </div>
            </Link>

            {/* Reação */}
            {entry.id !== currentUserId && (
              <ReactionPicker
                disabled={isPending}
                onSelect={(emoji) => handleReact(entry.id, emoji)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Modal regras de pontuação */}
      {showRules && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowRules(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-copa-dark-800 rounded-t-2xl border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/5">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Regras de pontuação</h3>
                <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div style={{ maxHeight: '60vh', overflowY: 'scroll' }} className="px-5 py-4 pb-8 space-y-3">
              <div className="flex items-center gap-3 bg-copa-gold/10 border border-copa-gold/30 rounded-xl px-4 py-3">
                <span className="text-copa-gold font-black text-lg w-8 text-center">+3</span>
                <div>
                  <p className="text-sm font-semibold text-white">Placar exato</p>
                  <p className="text-xs text-white/40">Acertou o placar completo do jogo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-400/30 rounded-xl px-4 py-3">
                <span className="text-blue-400 font-black text-lg w-8 text-center">+1</span>
                <div>
                  <p className="text-sm font-semibold text-white">Resultado correto</p>
                  <p className="text-xs text-white/40">Acertou quem ganhou ou que empatou</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3">
                <span className="text-red-400 font-black text-lg w-8 text-center">+0</span>
                <div>
                  <p className="text-sm font-semibold text-white">Errou</p>
                  <p className="text-xs text-white/40">Resultado não corresponde ao palpite</p>
                </div>
              </div>
              <div className="bg-copa-gold/5 border border-copa-gold/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Pontuação em dobro</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  A partir das <span className="text-white/80 font-semibold">oitavas de final</span>, os pontos valem o dobro: <span className="text-copa-gold font-semibold">+6</span> no placar exato e <span className="text-blue-400 font-semibold">+2</span> no resultado correto.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Critério de desempate</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Em caso de empate em pontos, o participante com mais <span className="text-white/80 font-semibold">placares exatos</span> fica à frente. Se ainda empatado, quem tiver mais <span className="text-white/80 font-semibold">resultados corretos</span> leva a vantagem.
                </p>
              </div>
              <div className="bg-copa-gold/5 border border-copa-gold/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Perguntas extras</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Além dos palpites, cada pergunta extra respondida corretamente concede os pontos indicados direto ao seu total no ranking. Veja a aba <span className="text-copa-gold font-semibold">Extras</span> para responder.
                </p>
              </div>
              <div className="bg-copa-gold/5 border border-copa-gold/20 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Distribuição do prêmio</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-copa-gold font-semibold">🥇 1° lugar — 60%</span>
                  <span className="text-xs text-gray-300 font-semibold">🥈 2° lugar — 25%</span>
                  <span className="text-xs text-amber-600 font-semibold">🥉 3° lugar — 15%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
