"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { getUnreadNotificationCount } from "@/app/app/notificacoes/actions";

const POLL_INTERVAL_MS = 15000;

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const hasFetchedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const fresh = await getUnreadNotificationCount();
        if (cancelled) return;
        setCount((prev) => {
          if (hasFetchedOnceRef.current && fresh > prev) {
            toast("Você tem uma nova notificação! 🔔");
          }
          hasFetchedOnceRef.current = true;
          return fresh;
        });
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link href="/app/notificacoes" aria-label="Notificações" className="relative p-1.5 -mr-1.5">
      <Bell size={22} />
      {count > 0 && (
        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-copa-gold text-copa-dark text-[10px] font-bold leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
