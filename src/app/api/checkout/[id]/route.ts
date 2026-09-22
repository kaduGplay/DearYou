import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { getProvider, settleOrder } from "@/lib/payments";

export async function GET(_req: Request, ctx: RouteContext<"/api/checkout/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  let order = await db.order.findUnique({ where: { id } });
  if (!user || !order || order.userId !== user.id) return err("Pedido não encontrado", 404);
  if (order.status === "pending" && order.providerRef) {
    const ref = order.providerRef;
    const status = await Promise.resolve().then(() => getProvider().getStatus(ref)).catch(() => "pending" as const);
    if (status === "paid") order = (await settleOrder(order.id)) ?? order;
    else if (status === "failed") order = await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
  }
  return json({ status: order.status });
}
