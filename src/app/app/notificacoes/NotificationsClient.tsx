"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { NotificationEntry, translateTeamName } from "@/lib/types";

const TZ = "America/Sao_Paulo";

interface Props {
  initialNotifications: NotificationEntry[];
}

function describeReaction(entry: NotificationEntry): string {
  const data = entry.reaction_data;
  if (!data) return "reagiu a você";

  if (data.kind === "prediction") {
    const home = translateTeamName(data.homeTeam);
    const away = translateTeamName(data.awayTeam);
    return `reagiu com ${data.emoji} ao seu palpite: ${data.homeScorePred}x${data.awayScorePred} (${home} x ${away})`;
  }

  const position = data.position !== null ? ` (#${data.position + 1})` : "";
  return `reagiu com ${data.emoji} à sua posição no ranking${position}`;
}

function describeMatchReminder(entry: NotificationEntry): string {
  const data = entry.match_reminder;
  if (!data) return "Um jogo está prestes a começar e seu palpite ainda não foi salvo!";

  const home = translateTeamName(data.homeTeam);
  const away = translateTeamName(data.awayTeam);
  const time = formatInTimeZone(new Date(data.startsAt), TZ, "HH:mm");
  return `⏰ Faltam ~1h para ${home} x ${away} (às ${time}) e seu palpite ainda não foi salvo!`;
}

export default function NotificationsClient({ initialNotifications }: Props) {
  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-white mb-4">Notificações</h1>

      {initialNotifications.length === 0 && (
        <div className="text-center py-16">
          <Bell size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Nenhuma notificação ainda.</p>
          <p className="text-white/25 text-xs mt-1">Reações aos seus palpites e ranking vão aparecer aqui.</p>
        </div>
      )}

      <div className="space-y-2">
        {initialNotifications.map((entry) => {
          const unread = entry.read_at === null;
          const isReminder = entry.type === "match_reminder";

          return (
            <Link
              key={entry.id}
              href={isReminder ? "/app/palpites" : "/app/chat"}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                unread
                  ? "bg-copa-red/10 border-copa-red/30"
                  : "bg-copa-dark-800 border-white/10"
              }`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10 bg-copa-dark-700 flex items-center justify-center">
                {isReminder ? (
                  <Clock size={16} className="text-copa-gold" />
                ) : entry.actor_avatar_url ? (
                  <Image src={entry.actor_avatar_url} alt={entry.actor_name ?? ""} width={36} height={36} className="object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{(entry.actor_name ?? "?").charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 leading-snug break-words">
                  {isReminder ? (
                    describeMatchReminder(entry)
                  ) : (
                    <>
                      <span className="font-semibold text-white">{entry.actor_name}</span> {describeReaction(entry)}
                    </>
                  )}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: true })}
                </p>
              </div>

              {unread && <span className="shrink-0 w-2 h-2 rounded-full bg-copa-gold mt-1.5" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
