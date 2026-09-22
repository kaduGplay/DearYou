import type { PaymentProvider } from "./index";

/**
 * Integração VoidPay: POST {base}/api/v1/gateway/pix/receive
 * Headers: x-public-key / x-secret-key. Valores em reais (number).
 * A confirmação chega por webhook em /api/webhooks/voidpay (callbackUrl).
 */
/** O VoidPay recusa (403) endereços de aviso locais; só envia o webhook se o site for público em https. */
const isPublicHttps = (u: string) => {
  try { const x = new URL(u); return x.protocol === "https:" && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(x.hostname) && x.hostname.includes("."); } catch { return false; }
};
const base = () => (process.env.VOIDPAY_BASE_URL || "https://dash.voidpayments.com").replace(/\/$/, "");

type VoidError = { message?: string; errorCode?: string; details?: { path: string; error: { message: string } }[] };

export const voidpayProvider: PaymentProvider = {
  name: "voidpay",

  async createPix({ orderId, planId, amountCents, description, callbackUrl, customer }) {
    const publicKey = process.env.VOIDPAY_PUBLIC_KEY, secretKey = process.env.VOIDPAY_SECRET_KEY;
    if (!publicKey || !secretKey) throw new Error("Pagamento indisponível: chaves do VoidPay não configuradas.");
    if (!customer.phone) throw new Error("Precisamos do seu WhatsApp para gerar o PIX. Atualize seu cadastro.");
    if (!customer.document) throw new Error("Pagamento indisponível: CPF padrão não configurado.");

    const price = Math.round(amountCents) / 100;
    const res = await fetch(`${base()}/api/v1/gateway/pix/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-public-key": publicKey, "x-secret-key": secretKey },
      body: JSON.stringify({
        identifier: orderId,
        amount: price,
        client: { name: customer.name, email: customer.email, phone: customer.phone, ...(customer.document ? { document: customer.document } : {}) },
        products: [{ id: planId, name: description, quantity: 1, price }],
        metadata: { provider: "DearYou", orderId },
        ...(isPublicHttps(callbackUrl) ? { callbackUrl } : {}),
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = data as VoidError;
      const detail = e.details?.[0] ? ` (${e.details[0].path}: ${e.details[0].error.message})` : "";
      console.error("[voidpay] erro", res.status, e.errorCode, e.message, JSON.stringify(e.details ?? []));
      throw new Error(`Não foi possível gerar o PIX${detail}. Tente novamente.`);
    }
    if (data.status && ["FAILED", "REJECTED", "CANCELED"].includes(data.status)) {
      console.error("[voidpay] cobrança recusada", data.status, data.errorDescription);
      throw new Error(data.errorDescription || "O pagamento foi recusado. Tente novamente.");
    }
    if (!data.transactionId || !data.pix?.code) throw new Error("Resposta inesperada do gateway de pagamento.");

    return {
      providerRef: String(data.transactionId),
      pixCode: String(data.pix.code),
      webhookToken: data.webhookToken ? String(data.webhookToken) : null,
      expiresAt: data.pix.expiresAt ? new Date(data.pix.expiresAt) : null,
    };
  },

  /** Consulta a transação: GET /api/v1/gateway/transactions?id=<transactionId> (status + payedAt). */
  async getStatus(providerRef) {
    const publicKey = process.env.VOIDPAY_PUBLIC_KEY, secretKey = process.env.VOIDPAY_SECRET_KEY;
    if (!publicKey || !secretKey) throw new Error("Chaves do VoidPay não configuradas");
    const res = await fetch(`${base()}/api/v1/gateway/transactions?id=${encodeURIComponent(providerRef)}`, {
      headers: { "x-public-key": publicKey, "x-secret-key": secretKey }, cache: "no-store",
    });
    if (!res.ok) throw new Error(`VoidPay respondeu ${res.status}`);
    const d = await res.json();
    const st = String(d.status ?? d.transactionStatus ?? "").toUpperCase();
    if (d.payedAt || ["COMPLETED", "OK", "PAID", "APPROVED", "CONFIRMED"].includes(st)) return "paid";
    if (["FAILED", "EXPIRED", "CANCELED", "REJECTED"].includes(st)) return "failed";
    return "pending";
  },
};
