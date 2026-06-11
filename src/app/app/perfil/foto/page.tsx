export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import FotoClient from "./FotoClient";
import { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function FotoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <FotoClient profile={profile as Profile} />;
}
