import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPixPayment } from "@/lib/mercadopago";

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verificar se já pagou
  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_status, name")
    .eq("id", user.id)
    .single();

  if (profile?.payment_status === "paid") {
    return NextResponse.json({ error: "Pagamento já realizado" }, { status: 400 });
  }

  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "entry_fee")
    .single();

  const amount = parseFloat(setting?.value ?? "50");

  const pixData = await createPixPayment({
    userId: user.id,
    userEmail: user.email!,
    userName: profile?.name ?? "Participante",
    amount,
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  });

  return NextResponse.json({ ...pixData, amount });
}
