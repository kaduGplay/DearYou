import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import Heart from "@/components/Heart";
import { BRAND } from "@/lib/brand";
import { KINDS, PLANS, type KindId, type PlanId } from "@/lib/plans";
import { pageIsLive } from "@/lib/util";
import { reconcilePending } from "@/lib/payments";
import LogoutButton from "./LogoutButton";
import { recentPaidPurchases } from "@/lib/purchase-tracking";
import PurchaseEvents from "@/components/analytics/PurchaseEvents";

export const metadata = { title: "Minhas páginas" };

export default async function Dashboard() {
  const user = await getUser();
  if (!user) redirect("/auth/login?next=/dashboard");
  await reconcilePending(user.id);
  const purchases = await recentPaidPurchases(user.id);
  const pages = await db.page.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { photos: true } } } });

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <PurchaseEvents orders={purchases} />
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold"><Heart className="h-6 w-6 text-brand" />{BRAND.name}</Link>
        <div className="flex items-center gap-4 text-sm"><span className="hidden text-neutral-600 sm:block">Olá, {user.name.split(" ")[0]}</span><LogoutButton /></div>
      </header>

      <h1 className="mt-10 font-serif text-3xl font-bold">Minhas páginas</h1>
      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {pages.length === 0 && <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-white p-10 text-center text-neutral-500">Você ainda não criou nenhuma página. Comece ao lado 💌</div>}
          {pages.map((p) => {
            const live = pageIsLive(p);
            const status = p.status === "draft" ? { t: "Rascunho", c: "bg-neutral-100 text-neutral-600" } : live ? { t: "No ar", c: "bg-emerald-100 text-emerald-700" } : { t: "Expirada", c: "bg-amber-100 text-amber-700" };
            return (
              <article key={p.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><span>{KINDS[p.kind as KindId]?.emoji}</span><h2 className="font-serif text-xl font-bold">{p.title || "Sem título"}</h2><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.c}`}>{status.t}</span></div>
                    <p className="mt-1 text-sm text-neutral-500">Para {p.recipient} · {p._count.photos} foto(s){p.plan ? ` · ${PLANS[p.plan as PlanId].name}` : ""}{p.status !== "draft" ? ` · ${p.views} visita(s)` : ""}</p>
                    <p className="mt-1 text-sm text-neutral-500">/{p.slug}{p.expiresAt && live ? ` · expira em ${p.expiresAt.toLocaleString("pt-BR")}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/editor/${p.id}`} className="btn btn-ghost !py-2 text-sm">Editar</Link>
                    <Link href={`/preview/${p.id}`} className="btn btn-ghost !py-2 text-sm">Preview</Link>
                    {p.status === "draft" ? <Link href={`/dashboard/pricing?page=${p.id}`} className="btn btn-primary !py-2 text-sm">Publicar</Link> : live ? <Link href={`/${p.slug}`} className="btn btn-primary !py-2 text-sm">Abrir página</Link> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        <aside className="h-fit space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-pink-400/15">
          <h2 className="font-serif text-xl font-bold">Nova surpresa</h2>
          {(Object.keys(KINDS) as KindId[]).map((k) => <Link key={k} href={k === "amor" ? "/criar" : `/criar-${k}`} className="flex items-center gap-3 rounded-2xl border border-pink-100 p-3 text-sm font-semibold transition hover:bg-pink-50"><span className="text-2xl">{KINDS[k].emoji}</span>{KINDS[k].label}</Link>)}
        </aside>
      </div>
    </main>
  );
}
