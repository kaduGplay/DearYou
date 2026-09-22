import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import Pricing from "./Pricing";

export const metadata = { title: "Escolha seu plano" };

export default async function PricingPage({ searchParams }: PageProps<"/dashboard/pricing">) {
  const sp = await searchParams;
  const pageId = typeof sp.page === "string" ? sp.page : "";
  const user = await getUser();
  if (!user) redirect("/auth/login?redirect=/dashboard");
  const page = await db.page.findUnique({ where: { id: pageId }, include: { _count: { select: { photos: true } } } });
  if (!page || page.userId !== user.id) notFound();
  if (page.status === "published") redirect("/dashboard");
  return <Pricing pageId={page.id} title={page.title} style={page.style} photos={page._count.photos} />;
}
