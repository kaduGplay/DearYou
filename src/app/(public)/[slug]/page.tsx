import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageIsLive } from "@/lib/util";
import { toPageData } from "@/lib/serialize";
import PublicPageView from "@/components/public/PublicPageView";

export async function generateMetadata({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const p = await db.page.findUnique({ where: { slug } });
  return { title: p ? p.title || "Uma surpresa para você" : "Página não encontrada", robots: { index: false } };
}

export default async function Public({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = await db.page.findUnique({ where: { slug }, include: { photos: true, timeline: true, guestbook: true, quiz: true, user: { select: { name: true } } } });
  if (!page || page.status === "draft") notFound();
  if (!pageIsLive(page)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "linear-gradient(135deg,#FFFBFC,#fff5f9,#fef1f6)", color: "#1a1a2e" }}>
        <p className="text-5xl">⌛</p>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Esta surpresa já passou do prazo</h1>
        <p className="mt-2" style={{ color: "rgba(26,26,46,.5)" }}>O plano de 24 horas terminou.</p>
        <Link href="/criar" className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 font-semibold text-white" style={{ background: "rgb(190, 24, 93)" }}>Criar a minha</Link>
      </main>
    );
  }
  return <PublicPageView data={toPageData(page, page.user.name.split(" ")[0])} mode="live" />;
}
