export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { RankingEntry } from "@/lib/types";
import RankingClient from "./RankingClient";

export default async function RankingPage() {
  const supabase = await createClient();

  const [{ data: ranking }, { data: settings }] = await Promise.all([
    supabase.from("ranking").select("*"),
    supabase.from("settings").select("key, value").in("key", ["entry_fee", "bolao_name"]),
  ]);

  const entryFee = parseFloat(
    settings?.find((s) => s.key === "entry_fee")?.value ?? "0"
  );
  const totalPaid = (ranking ?? []).length;
  const totalPrize = entryFee * totalPaid;

  return (
    <RankingClient
      ranking={(ranking ?? []) as RankingEntry[]}
      totalPrize={totalPrize}
      entryFee={entryFee}
    />
  );
}
