import MercadoPagoConfig, { Payment, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function createPixPayment(params: {
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  appUrl: string;
}): Promise<{
  id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
}> {
  const payment = new Payment(client);

  const response = await payment.create({
    body: {
      transaction_amount: params.amount,
      payment_method_id: "pix",
      payer: {
        email: params.userEmail,
        first_name: params.userName,
      },
      description: "Bolão Copa 2026 — Inscrição",
      external_reference: params.userId,
      notification_url: `${params.appUrl}/api/webhooks/mercadopago`,
    },
  });

  const pointOfInteraction = response.point_of_interaction;
  if (!pointOfInteraction?.transaction_data) {
    throw new Error("Mercado Pago não retornou dados do PIX");
  }

  return {
    id: String(response.id),
    qr_code: pointOfInteraction.transaction_data.qr_code ?? "",
    qr_code_base64:
      pointOfInteraction.transaction_data.qr_code_base64 ?? "",
    ticket_url: pointOfInteraction.transaction_data.ticket_url ?? "",
  };
}

export async function getPaymentStatus(paymentId: string) {
  const payment = new Payment(client);
  const response = await payment.get({ id: paymentId });
  return {
    status: response.status,
    external_reference: response.external_reference,
  };
}
