import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { META_PIXEL_ID } from "./meta-pixel";
import { metaConversionPayload } from "./meta-conversion-payload";

export async function queueMetaConversion(tx: Prisma.TransactionClient, orderId: string, name: "Purchase" | "PIXGenerated") {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { user: { select: { email: true } } } });
  if (!order) return;
  const payload = metaConversionPayload(order, name, process.env.APP_URL ?? "https://dearyou-presenteperfeito.vercel.app");
  if (!payload) return;
  await tx.metaConversion.upsert({ where: { id: payload.event_id }, create: { id: payload.event_id, orderId, name, payload }, update: {} });
}

/** Fila durável: a indisponibilidade da Meta nunca desfaz um pagamento confirmado. */
export async function flushMetaConversions(orderId?: string) {
  if (!process.env.META_CAPI_ACCESS_TOKEN) return { configured: false, sent: 0 };
  const now = new Date();
  const events = await db.metaConversion.findMany({ where: { ...(orderId ? { orderId } : {}), status: "pending", nextAttemptAt: { lte: now } }, orderBy: { createdAt: "asc" }, take: 25 });
  if (!events.length) return { configured: true, sent: 0 };
  // Use o horário original e não invente uma nova compra para reenviar eventos antigos.
  const fresh = events.filter((event) => {
    const time = (event.payload as { event_time?: number }).event_time;
    return typeof time === "number" && Date.now() / 1000 - time < 7 * 86400;
  });
  const expired = events.filter((event) => !fresh.includes(event));
  if (expired.length) await db.metaConversion.updateMany({ where: { id: { in: expired.map((event) => event.id) }, status: "pending" }, data: { status: "expired", lastError: "event_too_old" } });
  if (!fresh.length) return { configured: true, sent: 0 };
  const ids = fresh.map((event) => event.id);
  let error = "network_error";
  try {
    const response = await fetch(`https://graph.facebook.com/v26.0/${META_PIXEL_ID}/events`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.META_CAPI_ACCESS_TOKEN}` },
      body: JSON.stringify({ data: fresh.map((event) => event.payload), ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) }),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.events_received === fresh.length) {
      await db.metaConversion.updateMany({ where: { id: { in: ids }, status: "pending" }, data: { status: "sent", sentAt: now, attempts: { increment: 1 }, lastError: null } });
      return { configured: true, sent: fresh.length };
    }
    error = `http_${response.status}_code_${typeof result.error?.code === "number" ? result.error.code : "unknown"}`;
  } catch { /* Registra a falha sem tokens nem dados do cliente. */ }
  const delay = Math.min(3600, 60 * 2 ** Math.min(6, Math.max(...fresh.map((event) => event.attempts))));
  await db.metaConversion.updateMany({ where: { id: { in: ids }, status: "pending" }, data: { attempts: { increment: 1 }, lastError: error, nextAttemptAt: new Date(Date.now() + delay * 1000) } });
  return { configured: true, sent: 0 };
}

export async function tryFlushMetaConversions(orderId?: string) {
  try { return await flushMetaConversions(orderId); } catch { console.error("[meta] Envio adiado; evento permanece na fila"); return { configured: Boolean(process.env.META_CAPI_ACCESS_TOKEN), sent: 0 }; }
}
