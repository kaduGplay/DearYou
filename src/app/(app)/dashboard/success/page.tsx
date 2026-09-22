import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import Success from "./Success";
import PurchaseEvents from "@/components/analytics/PurchaseEvents";

export const metadata = { title: "Página no ar" };

export default async function SuccessPage({ searchParams }: PageProps<"/dashboard/success">) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/auth/login?redirect=/dashboard");
  const order = await db.order.findUnique({ where: { id: typeof sp.order === "string" ? sp.order : "" }, include: { page: true } });
  if (!order || order.userId !== user.id) notFound();
  if (order.status !== "paid") redirect(`/checkout/${order.id}`);
  return <><PurchaseEvents orders={[{ id: order.id, amountCents: order.amountCents, plan: order.plan, status: order.status, provider: order.provider }]} /><Success slug={order.page.slug} pageId={order.pageId} eterno={order.plan === "eterno"} /></>;
}
