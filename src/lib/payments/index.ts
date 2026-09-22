import { db } from "../db";
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
  /** Consulta o status de uma cobrança (o VoidPay confirma por webhook; aqui retorna "pending"). */
  getStatus(providerRef: string): Promise<"pending" | "paid" | "failed">;
}

export function getProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "voidpay") return voidpayProvider;
  // O provedor simulado libera páginas sem pagar: nunca em produção.
  if (process.env.NODE_ENV === "production") throw new Error("Pagamento indisponível no momento. Tente novamente mais tarde.");
  return mockProvider;
}

/** Marca o pedido como pago e publica a página. Idempotente. */
export async function settleOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "paid") return order;
  const plan = PLANS[order.plan as PlanId];
  const now = new Date();
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "paid", paidAt: now } }),
    db.page.update({
      where: { id: order.pageId },
      data: {
        plan: plan.id,
        status: "published",
        publishedAt: now,
        expiresAt: plan.durationHours ? new Date(now.getTime() + plan.durationHours * 3600_000) : null,
        editableUntil: new Date(now.getTime() + 24 * 3600_000),
      },
    }),
  ]);
  return db.order.findUnique({ where: { id: orderId } });
}

/** Confere pagamentos pendentes do usuário (ele pode ter pago e fechado a tela do PIX antes do aviso chegar). */
export async function reconcilePending(userId: string) {
  const pending = await db.order.findMany({ where: { userId, status: "pending", providerRef: { not: null }, createdAt: { gt: new Date(Date.now() - 48 * 3600_000) } } });
  for (const o of pending) {
    try {
      const st = await getProvider().getStatus(o.providerRef!);
      if (st === "paid") await settleOrder(o.id);
      else if (st === "failed") await db.order.update({ where: { id: o.id }, data: { status: "failed" } });
    } catch { /* provedor indisponível: tenta de novo na próxima visita */ }
  }
}
