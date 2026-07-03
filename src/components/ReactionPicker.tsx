"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";
import { REACTION_EMOJIS, ReactionEmoji } from "@/lib/types";

const POPOVER_WIDTH = 230;
const GAP = 8;

interface Props {
  onSelect: (emoji: ReactionEmoji) => void | Promise<void>;
  disabled?: boolean;
}

interface PopoverPos {
  mode: "up" | "down";
  value: number;
  left: number;
}

export default function ReactionPicker({ onSelect, disabled }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const left = Math.max(8, Math.min(rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8));

    setPos(
      spaceBelow < 56
        ? { mode: "up", value: window.innerHeight - rect.top + GAP, left }
        : { mode: "down", value: rect.bottom + GAP, left }
    );
    setPickerOpen(true);
  }

  // Fecha o popover ao rolar (captura eventos de qualquer contêiner com
  // scroll próprio, como o main do app ou o modal de "ver palpites") ou
  // redimensionar, já que a posição foi calculada em coordenadas fixas.
  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pickerOpen]);

  function handleSelect(emoji: ReactionEmoji) {
    setPickerOpen(false);
    onSelect(emoji);
  }

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
        disabled={disabled}
        aria-label="Reagir com emoji"
        title="Reagir com emoji"
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors disabled:opacity-40 ${
          pickerOpen
            ? "bg-copa-red/30 text-copa-red"
            : "bg-white/10 hover:bg-white/20 text-white/50 hover:text-white"
        }`}
      >
        <SmilePlus size={13} />
      </button>

      {/* Popover flutuante — em portal + coordenadas fixas, pra nunca ser
          cortado por um contêiner com overflow (ex: o modal de palpites). */}
      {pickerOpen && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[65]" onClick={() => setPickerOpen(false)} />
          <div
            className="fixed z-[70] flex items-center gap-0.5 bg-copa-dark-800 border border-white/15 rounded-full px-1.5 py-1.5 shadow-xl shadow-black/40"
            style={{
              [pos.mode === "up" ? "bottom" : "top"]: pos.value,
              left: pos.left,
              width: POPOVER_WIDTH,
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="text-base w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
