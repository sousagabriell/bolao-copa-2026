import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPaymentStatus } from "@/lib/mercadopago";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Validar assinatura do Mercado Pago
  const signatureHeader = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";

  // Extrair ts e v1 do header x-signature
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((s) => s.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const receivedSignature = parts["v1"];

  if (ts && receivedSignature && process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    const manifest = `id:${JSON.parse(rawBody)?.data?.id};request-id:${requestId};ts:${ts};`;
    const expected = crypto
      .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    if (expected !== receivedSignature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const supabase = createServiceClient();

  // Log do webhook
  await supabase.from("webhook_logs").insert({ payload });

  // Processar apenas eventos de pagamento aprovado
  if (payload.type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = String(payload.data?.id);
  if (!paymentId) return NextResponse.json({ received: true });

  const paymentData = await getPaymentStatus(paymentId);

  if (paymentData.status === "approved" && paymentData.external_reference) {
    await supabase
      .from("profiles")
      .update({
        payment_status: "paid",
        payment_id: paymentId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", paymentData.external_reference);

    await supabase
      .from("webhook_logs")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("payload->data->id", paymentId)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  return NextResponse.json({ received: true });
}
