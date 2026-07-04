"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DayItem {
  key: string;
  label: string;
}

interface Props {
  days: DayItem[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
}

export default function DayCarousel({ days, selectedDay, onSelectDay }: Props) {
  const dayIndex = days.findIndex((d) => d.key === selectedDay);

  const goToDay = useCallback(
    (offset: number) => {
      const nextIdx = dayIndex + offset;
      if (nextIdx < 0 || nextIdx >= days.length) return;
      onSelectDay(days[nextIdx].key);
    },
    [dayIndex, days, onSelectDay]
  );

  const dayButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isFirstScroll = useRef(true);

  useEffect(() => {
    const button = dayButtonRefs.current.get(selectedDay);
    button?.scrollIntoView({
      behavior: isFirstScroll.current ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
    isFirstScroll.current = false;
  }, [selectedDay]);

  return (
    <div className="sticky top-0 z-10 bg-copa-dark border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => goToDay(-1)}
          disabled={dayIndex <= 0}
          aria-label="Dia anterior"
          className="shrink-0 p-1.5 rounded-full text-white/70 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {days.map((d) => (
            <button
              key={d.key}
              ref={(el) => {
                if (el) dayButtonRefs.current.set(d.key, el);
                else dayButtonRefs.current.delete(d.key);
              }}
              onClick={() => onSelectDay(d.key)}
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

        <button
          onClick={() => goToDay(1)}
          disabled={dayIndex === -1 || dayIndex >= days.length - 1}
          aria-label="Próximo dia"
          className="shrink-0 p-1.5 rounded-full text-white/70 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
