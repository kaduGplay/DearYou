import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { settleOrder } from "@/lib/payments";

/** Somente com o provedor simulado: confirma o pagamento para testar o fluxo. */
export async function POST(_req: Request, ctx: RouteContext<"/api/checkout/[id]/simulate">) {
  if (process.env.PAYMENT_PROVIDER === "voidpay" || process.env.NODE_ENV === "production") return err("Indisponível", 404);
  const { id } = await ctx.params;
  const user = await getUser();
  const order = await db.order.findUnique({ where: { id } });
  if (!user || !order || order.userId !== user.id) return err("Pedido não encontrado", 404);
  await settleOrder(id);
  return json({ ok: true });
}
