export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { getNotifications, markAllNotificationsRead } from "./actions";
import NotificationsClient from "./NotificationsClient";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const notifications = await getNotifications();
  await markAllNotificationsRead();

  return <NotificationsClient initialNotifications={notifications} />;
}
