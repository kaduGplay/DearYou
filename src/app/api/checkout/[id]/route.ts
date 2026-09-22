import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { syncOrder } from "@/lib/payments";

export async function GET(_req: Request, ctx: RouteContext<"/api/checkout/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  let order = await db.order.findUnique({ where: { id } });
  if (!user || !order || order.userId !== user.id) return err("Pedido não encontrado", 404);
  if (order.status === "pending" && order.providerRef) {
    order = await syncOrder(order.id).catch(() => order) ?? order;
  }
  return json({ status: order.status });
}
