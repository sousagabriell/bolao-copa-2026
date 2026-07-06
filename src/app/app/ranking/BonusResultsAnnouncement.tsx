"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PartyPopper, X } from "lucide-react";
import { BonusQuestionReveal } from "@/lib/types";

const STORAGE_KEY = "copa2026_seen_bonus_reveals_v1";

function getSeenIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function markSeen(id: number) {
  try {
    const seen = getSeenIds();
    if (!seen.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, id]));
    }
  } catch {
    // ignora falha ao persistir
  }
}

interface Props {
  questions: BonusQuestionReveal[];
}

export default function BonusResultsAnnouncement({ questions }: Props) {
  const [queue, setQueue] = useState<BonusQuestionReveal[]>([]);

  useEffect(() => {
    // localStorage só existe no client; precisa desse mount-effect para não
    // divergir do HTML gerado no server (SSR) e quebrar a hidratação.
    try {
      const seen = getSeenIds();
      const pending = questions.filter((q) => !seen.includes(q.id));
      if (pending.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQueue(pending);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — não exibe o modal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (queue.length === 0) return null;

  const current = queue[0];
  const isLast = queue.length === 1;

  function advance() {
    markSeen(current.id);
    setQueue((prev) => prev.slice(1));
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center animate-modal-backdrop-in"
      onClick={advance}
    >
      <div className="absolute inset-0 bg-black/80" />

      <div
        className="relative w-full sm:max-w-sm bg-copa-dark-800 rounded-t-3xl sm:rounded-3xl border border-copa-gold/30 shadow-2xl shadow-copa-gold/10 overflow-hidden animate-modal-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* brilho decorativo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-copa-gold/25 blur-3xl rounded-full pointer-events-none" />

        <button
          onClick={advance}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-1"
        >
          <X size={18} />
        </button>

        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

          <span className="inline-flex items-center gap-1 bg-copa-gold/15 border border-copa-gold/40 text-copa-gold text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Pergunta extra encerrada
          </span>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-copa-gold/10 border border-copa-gold/30 flex items-center justify-center animate-badge-bounce">
            <PartyPopper size={30} className="text-copa-gold" />
          </div>

          <h2 className="text-lg font-black text-white mb-2 leading-snug">{current.question}</h2>
          <p className="text-sm text-white/60 leading-relaxed mb-5">
            Resposta certa: <span className="text-copa-gold font-semibold">{current.correctAnswer}</span> · vale{" "}
            <span className="text-white font-semibold">{current.points} pts</span>
          </p>

          <div className="space-y-2 text-left mb-6 max-h-56 overflow-y-auto">
            {current.winners.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">Ninguém acertou dessa vez 😅</p>
            ) : (
              current.winners.map((w, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-copa-dark-700 flex items-center justify-center">
                    {w.avatarUrl ? (
                      <Image src={w.avatarUrl} alt={w.name} width={32} height={32} className="object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">{w.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{w.name}</span>
                  <span className="text-copa-gold font-bold text-sm shrink-0">+{w.points} pts</span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={advance}
            className="w-full bg-copa-red hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            {isLast ? "Entendi!" : "Próxima"}
          </button>
        </div>
      </div>
    </div>
  );
}
