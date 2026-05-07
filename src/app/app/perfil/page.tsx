export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import PerfilClient from "./PerfilClient";
import { Profile } from "@/lib/types";

export default async function PerfilPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return <PerfilClient profile={profile as Profile} />;
}
