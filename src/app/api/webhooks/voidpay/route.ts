import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { err, json } from "@/lib/guard";
import { settleOrder } from "@/lib/payments";

const PAID = new Set(["COMPLETED", "OK", "PAID", "APPROVED", "CONFIRMED"]);
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const pick = (o: unknown, ...keys: string[]): string | undefined => {
  for (const k of keys) { const v = (o as Record<string, unknown> | null)?.[k]; if (typeof v === "string" && v) return v; }
};

/**
 * Webhook do VoidPay (callbackUrl). Autenticado pelo webhookToken devolvido na criação da cobrança.
 * O formato exato do payload não veio na documentação recebida: aceita variações comuns
 * (token no corpo ou em header; id em transactionId/id/identifier; status em status/transactionStatus).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return err("Payload inválido");
  const nested = (body as { transaction?: unknown }).transaction ?? body;

  const ref = pick(nested, "transactionId", "id") ?? pick(body, "transactionId");
  const identifier = pick(nested, "identifier", "clientIdentifier") ?? pick(body, "identifier");
  const order = (ref && (await db.order.findFirst({ where: { providerRef: ref } }))) || (identifier ? await db.order.findUnique({ where: { id: identifier } }) : null);
  if (!order || order.provider !== "voidpay") return err("Pedido não encontrado", 404);

  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = pick(body, "webhookToken", "token") ?? pick(nested, "webhookToken", "token") ?? req.headers.get("x-webhook-token") ?? auth ?? "";
  if (!order.webhookToken || !token || !same(token, order.webhookToken)) {
    console.warn("[voidpay] webhook recusado: token ausente ou inválido. Campos recebidos:", Object.keys(body));
    return err("Não autorizado", 401);
  }

  const status = (pick(nested, "transactionStatus", "status") ?? pick(body, "event", "status") ?? "").toUpperCase();
  if (PAID.has(status)) await settleOrder(order.id);
  else if (["FAILED", "EXPIRED", "CANCELED", "REJECTED"].includes(status)) await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
  return json({ ok: true });
}
