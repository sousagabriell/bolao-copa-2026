"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Target, Trophy, User, Star } from "lucide-react";
import NewRuleAnnouncement from "./NewRuleAnnouncement";

const tabs = [
  { href: "/app/palpites", label: "Palpites", Icon: Target },
  { href: "/app/ranking", label: "Ranking", Icon: Trophy },
  { href: "/app/extras", label: "Extras", Icon: Star },
  { href: "/app/perfil", label: "Perfil", Icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideChrome = pathname === "/app/perfil/foto";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      {!hideChrome && (
        <header className="bg-copa-red text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/Logo_copa_2026.png"
              alt="Copa 2026"
              width={32}
              height={32}
              className="rounded"
              unoptimized
            />
            <span className="font-bold text-sm tracking-wide">Bolão Copa 2026</span>
          </div>
        </header>
      )}

      {/* Conteúdo */}
      <main className={`flex-1 overflow-y-auto ${hideChrome ? "" : "pb-20"}`}>
        {children}
      </main>

      {/* Tab bar inferior */}
      {!hideChrome && (
        <nav className="fixed bottom-0 left-0 right-0 bg-copa-dark border-t border-red-700/50 flex z-50">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
                  active ? "text-white" : "text-white/60"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {!hideChrome && <NewRuleAnnouncement />}
    </div>
  );
}
