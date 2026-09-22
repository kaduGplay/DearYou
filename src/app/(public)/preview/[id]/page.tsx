import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { toPageData } from "@/lib/serialize";
import PublicPageView from "@/components/public/PublicPageView";

export const metadata = { title: "Preview", robots: { index: false } };

export default async function Preview({ params }: PageProps<"/preview/[id]">) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=/preview/${id}`);
  const page = await db.page.findUnique({ where: { id }, include: { photos: true, timeline: true, guestbook: true, quiz: true } });
  if (!page || page.userId !== user.id) notFound();
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[250] flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white" style={{ background: "#1a1a2e" }}>
        <span>👀 Preview: só você vê isto</span>
        <span className="flex gap-2">
          <Link href={`/editor/${id}`} className="rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,.15)" }}>Voltar a editar</Link>
          {page.status === "draft" && <Link href={`/dashboard/pricing?page=${id}`} className="rounded-full px-3 py-1 font-semibold" style={{ background: "#ed68ae" }}>Publicar</Link>}
        </span>
      </div>
      <PublicPageView data={toPageData(page, user.name.split(" ")[0])} mode="preview" />
    </>
  );
}
