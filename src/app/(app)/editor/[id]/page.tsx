import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { canEditAll } from "@/lib/guard";
import Editor from "./Editor";

export const metadata = { title: "Editor" };

export default async function EditorPage({ params, searchParams }: PageProps<"/editor/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=/editor/${id}`);
  const page = await db.page.findUnique({ where: { id }, include: { photos: { orderBy: { order: "asc" } }, timeline: { orderBy: { date: "asc" } }, quiz: { orderBy: { order: "asc" } } } });
  if (!page || page.userId !== user.id) notFound();
  return (
    <Editor
      openPlans={sp.publicar === "1"}
      fullEdit={canEditAll(page)}
      page={{
        id: page.id, slug: page.slug, kind: page.kind, style: page.style, quizPrize: page.quizPrize, quizNeeded: page.quizNeeded,
        quiz: page.quiz.map((q) => ({ text: q.text, correct: q.correct, wrong: q.wrong.split("\n").filter(Boolean) })), status: page.status, plan: page.plan, title: page.title, recipient: page.recipient,
        startDate: page.startDate.toISOString().slice(0, 10), message: page.message, theme: page.theme, musicUrl: page.musicUrl,
        editableUntil: page.editableUntil?.toISOString() ?? null,
        photos: page.photos.map((p) => ({ id: p.id, url: `/api/uploads/${p.file}`, caption: p.caption })),
        timeline: page.timeline.map((e) => ({ id: e.id, date: e.date.toISOString().slice(0, 10), title: e.title, text: e.text, photo: e.photo ? `/api/uploads/${e.photo}` : null })),
      }}
    />
  );
}
