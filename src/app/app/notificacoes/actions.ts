"use server";

import { createClient } from "@/lib/supabase/server";
import { MatchReminderData, NotificationEntry, ReactionEmoji, ReactionMessageData } from "@/lib/types";

const LIST_LIMIT = 50;

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) console.error("Falha ao contar notificações:", error);

  return count ?? 0;
}

export async function getNotifications(): Promise<NotificationEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, emoji, read_at, created_at, profiles!notifications_actor_id_fkey(name, avatar_url), chat_messages(reaction_data, message), matches(id, home_team, away_team, home_team_crest, away_team_crest, starts_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) console.error("Falha ao buscar notificações:", error);

  return ((data ?? []) as unknown as Array<{
    id: number;
    type: "reaction" | "match_reminder" | "mention" | "message_reaction";
    emoji: ReactionEmoji | null;
    read_at: string | null;
    created_at: string;
    profiles: { name: string; avatar_url: string | null } | null;
    chat_messages: { reaction_data: ReactionMessageData | null; message: string | null } | null;
    matches: {
      id: number;
      home_team: string;
      away_team: string;
      home_team_crest: string | null;
      away_team_crest: string | null;
      starts_at: string;
    } | null;
  }>).map((row) => ({
    id: row.id,
    type: row.type,
    emoji: row.emoji,
    read_at: row.read_at,
    created_at: row.created_at,
    actor_name: row.profiles?.name ?? null,
    actor_avatar_url: row.profiles?.avatar_url ?? null,
    reaction_data: row.chat_messages?.reaction_data ?? null,
    message_excerpt:
      row.type === "mention" || row.type === "message_reaction" ? (row.chat_messages?.message ?? null) : null,
    match_reminder: row.matches
      ? ({
          matchId: row.matches.id,
          homeTeam: row.matches.home_team,
          awayTeam: row.matches.away_team,
          homeTeamCrest: row.matches.home_team_crest,
          awayTeamCrest: row.matches.away_team_crest,
          startsAt: row.matches.starts_at,
        } satisfies MatchReminderData)
      : null,
  }));
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
