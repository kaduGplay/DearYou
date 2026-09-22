import type { Page, Photo, TimelineEvent, GuestbookEntry, QuizQuestion } from "@prisma/client";
import type { PageData } from "@/components/public/types";

type Full = Page & { photos: Photo[]; timeline: TimelineEvent[]; guestbook: GuestbookEntry[]; quiz: QuizQuestion[] };

export function toPageData(p: Full, senderName = ""): PageData {
  return {
    slug: p.slug, kind: p.kind, senderName, style: p.style, quizPrize: p.quizPrize, quizNeeded: p.quizNeeded,
    quiz: [...p.quiz].sort((a, b) => a.order - b.order).map((q) => ({ id: q.id, text: q.text, correct: q.correct, wrong: q.wrong.split("\n").filter(Boolean) })), title: p.title, recipient: p.recipient, startDate: p.startDate.toISOString(), message: p.message, theme: p.theme, musicUrl: p.musicUrl, plan: p.plan,
    photos: [...p.photos].sort((a, b) => a.order - b.order).map((x) => ({ id: x.id, url: `/api/uploads/${x.file}`, caption: x.caption })),
    timeline: [...p.timeline].sort((a, b) => a.date.getTime() - b.date.getTime()).map((e) => ({ id: e.id, date: e.date.toISOString(), title: e.title, text: e.text, photo: e.photo ? `/api/uploads/${e.photo}` : null })),
    guestbook: [...p.guestbook].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((g) => ({ id: g.id, author: g.author, message: g.message, createdAt: g.createdAt.toISOString() })),
  };
}
