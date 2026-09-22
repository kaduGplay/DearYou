import { db } from "./db";

/** Recupera compras recentes quando o cliente retorna depois de fechar a tela do PIX. */
export function recentPaidPurchases(userId: string) {
  return db.order.findMany({
    where: { userId, status: "paid", provider: "voidpay", paidAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
    select: { id: true, amountCents: true, plan: true, status: true, provider: true },
  });
}
