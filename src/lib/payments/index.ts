import { db } from "../db";
import { queueMetaConversion, tryFlushMetaConversions } from "../meta-conversions";
import { PLANS, type PlanId } from "../plans";
import { mockProvider } from "./mock";
import { voidpayProvider } from "./voidpay";

export type PixCharge = { providerRef: string; pixCode: string; pixQr?: string | null; webhookToken?: string | null; expiresAt?: Date | null };

export interface PaymentProvider {
  name: string;
  /** Gera a cobrança PIX (copia-e-cola + QR opcional). */
  createPix(args: {
    orderId: string;
    planId: string;
    amountCents: number;
    description: string;
    callbackUrl: string;
    customer: { name: string; email: string; phone?: string | null; document?: string | null };
  }): Promise<PixCharge>;
  /** Consulta o status autenticado no provedor. */
  getStatus(providerRef: string, amountCents?: number): Promise<"pending" | "paid" | "failed">;
}

export function getProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "voidpay") return voidpayProvider;
  // O provedor simulado libera páginas sem pagar: nunca em produção.
  if (process.env.NODE_ENV === "production") throw new Error("Pagamento indisponível no momento. Tente novamente mais tarde.");
  return mockProvider;
}

/** Atualização condicional e publicação na mesma transação: callbacks concorrentes não renovam o prazo. */
export async function settleOrder(orderId: string) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return null;
    const plan = PLANS[order.plan as PlanId];
    if (!plan) throw new Error("Plano desconhecido no pedido");
    const now = new Date();
    const changed = await tx.order.updateMany({ where: { id: orderId, status: { not: "paid" } }, data: { status: "paid", paidAt: now } });
    if (changed.count) await tx.page.update({ where: { id: order.pageId }, data: {
      plan: plan.id, status: "published", publishedAt: now,
      expiresAt: plan.durationHours ? new Date(now.getTime() + plan.durationHours * 3600_000) : null,
      editableUntil: new Date(now.getTime() + 24 * 3600_000),
    } });
    await queueMetaConversion(tx, orderId, "Purchase");
    return tx.order.findUnique({ where: { id: orderId } });
  }, { timeout: 15000 });
  await tryFlushMetaConversions(orderId);
  return result;
}

/** Falhas atrasadas nunca rebaixam um pedido já pago. */
export async function failOrder(orderId: string) {
  await db.order.updateMany({ where: { id: orderId, status: "pending" }, data: { status: "failed" } });
}

export async function syncOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.status === "paid") { await tryFlushMetaConversions(orderId); return order; }
  if (!order.providerRef) throw new Error("Cobrança ainda está sendo salva");
  const provider = order.provider === "voidpay" ? voidpayProvider : getProvider();
  const status = await provider.getStatus(order.providerRef, order.amountCents);
  await db.order.update({ where: { id: order.id }, data: { providerCheckedAt: new Date() } });
  if (status === "paid") return settleOrder(order.id);
  if (status === "failed") await failOrder(order.id);
  return db.order.findUnique({ where: { id: order.id } });
}

/** Complementa o webhook quando o cliente volta ao painel. */
export async function reconcilePending(userId: string) {
  const pending = await db.order.findMany({ where: { userId, status: "pending", providerRef: { not: null }, createdAt: { gt: new Date(Date.now() - 48 * 3600_000) } } });
  for (const order of pending) {
    try { await syncOrder(order.id); } catch { /* Gateway indisponível: preserva o pedido para tentar depois. */ }
  }
}
