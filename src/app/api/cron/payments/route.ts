import { db } from "@/lib/db";
import { syncOrder } from "@/lib/payments";
import { safeTokenEqual } from "@/lib/payments/voidpay-status";
import { tryFlushMetaConversions } from "@/lib/meta-conversions";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Recuperação diária; o webhook continua sendo o caminho imediato. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeTokenEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const orders = await db.order.findMany({ where: { provider: "voidpay", status: "pending", providerRef: { not: null }, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } }, orderBy: { providerCheckedAt: { sort: "asc", nulls: "first" } }, take: 12, select: { id: true } });
  let checked = 0;
  for (let i = 0; i < orders.length; i += 4) {
    const results = await Promise.allSettled(orders.slice(i, i + 4).map((order) => syncOrder(order.id)));
    checked += results.filter((result) => result.status === "fulfilled").length;
  }
  const meta = await tryFlushMetaConversions();
  return Response.json({ checked, meta });
}
