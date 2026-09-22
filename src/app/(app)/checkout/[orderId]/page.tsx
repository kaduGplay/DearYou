import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { PLANS, brl, type PlanId } from "@/lib/plans";
import Checkout from "./Checkout";

export const metadata = { title: "Pagamento" };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[orderId]">) {
  const { orderId } = await params;
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=/checkout/${orderId}`);
  const order = await db.order.findUnique({ where: { id: orderId }, include: { page: true } });
  if (!order || order.userId !== user.id) notFound();
  return (
    <Checkout
      orderId={order.id}
      amountCents={order.amountCents}
      plan={order.plan}
      paid={order.status === "paid"}
      failed={order.status === "failed"}
      pageId={order.pageId}
      expiresAt={order.expiresAt?.toISOString() ?? null}
      planName={PLANS[order.plan as PlanId].name}
      price={brl(order.amountCents)}
      pixCode={order.pixCode ?? ""}
      pixQr={order.pixQr ?? ""}
      canSimulate={order.provider === "mock"}
    />
  );
}
