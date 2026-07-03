export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { getInitialMessages } from "./actions";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const messages = await getInitialMessages();

  return (
    <ChatClient
      initialMessages={messages}
      currentUserId={user.id}
      isAdmin={profile?.is_admin ?? false}
    />
  );
}
