"use client";

import { useEffect, useState } from "react";
import { Swords, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "copa2026_seen_chat_rules_v1";

export default function ChatRulesAnnouncement() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // localStorage só existe no client; precisa desse mount-effect para não
    // divergir do HTML gerado no server (SSR) e quebrar a hidratação.
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — não exibe o modal
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignora falha ao persistir
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center animate-modal-backdrop-in"
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/80" />

      <div
        className="relative w-full sm:max-w-sm bg-copa-dark-800 rounded-t-3xl sm:rounded-3xl border border-copa-red/30 shadow-2xl shadow-copa-red/10 overflow-hidden animate-modal-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* brilho decorativo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-copa-red/25 blur-3xl rounded-full pointer-events-none" />

        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-1"
        >
          <X size={18} />
        </button>

        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

          <span className="inline-flex items-center gap-1 bg-copa-gold/15 border border-copa-gold/40 text-copa-gold text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            <Sparkles size={12} />
            Novidade
          </span>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-copa-red/10 border border-copa-red/30 flex items-center justify-center animate-badge-bounce">
            <Swords size={28} className="text-copa-red" />
          </div>

          <h2 className="text-lg font-black text-white mb-2 leading-snug">
            Calma, guerreiro(a). Não se matem! 😅
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-5">
            O <span className="text-white font-semibold">Chat do Bolão</span> — provoca o rival que errou o palpite, comemora quem tá no topo do ranking. Só não esquenta a cabeça de verdade, blz?
          </p>

          <div className="space-y-2 text-left mb-6">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-lg w-9 text-center shrink-0">🤝</span>
              <div>
                <p className="text-sm font-semibold text-white">Pode zoar, só não pesa</p>
                <p className="text-xs text-white/40">Provocar pelo placar é o esporte oficial daqui</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-lg w-9 text-center shrink-0">🚫</span>
              <div>
                <p className="text-sm font-semibold text-white">Nada de ofensa de verdade</p>
                <p className="text-xs text-white/40">Sem preconceito, xingamento pesado ou spam</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3">
              <span className="text-lg w-9 text-center shrink-0">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-white">O admin tá de olho</p>
                <p className="text-xs text-white/40">Mensagem fora da linha pode ser apagada</p>
              </div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-copa-red hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            Prometo me comportar 😇
          </button>
        </div>
      </div>
    </div>
  );
}
