import { z } from "zod";
import { db } from "@/lib/db";
import { canEditAll, err, json, ownPage } from "@/lib/guard";
import { isValidSlug } from "@/lib/util";
import { THEMES } from "@/lib/plans";

const schema = z.object({
  title: z.string().trim().max(80).optional(),
  recipient: z.string().trim().min(1).max(60).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  startDate: z.string().optional(),
  message: z.string().max(4000).optional(),
  theme: z.string().optional(),
  musicUrl: z.string().trim().max(300).optional(),
  captions: z.record(z.string(), z.string().max(200)).optional(),
  order: z.array(z.string()).optional(),
  quizPrize: z.string().trim().max(120).optional(),
  quizNeeded: z.number().int().min(1).max(10).optional(),
  quiz: z.array(z.object({ text: z.string().trim().min(1).max(160), correct: z.string().trim().min(1).max(100), wrong: z.array(z.string().trim().min(1).max(100)).length(3) })).min(3).max(10).optional(),
});

export async function PUT(req: Request, ctx: RouteContext<"/api/pages/[id]">) {
  const { id } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  if (!canEditAll(own.page)) return err("O prazo de 24h para editar já passou. Só a linha do tempo continua editável.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.recipient !== undefined) data.recipient = d.recipient;
  if (d.message !== undefined) data.message = d.message;
  if (d.musicUrl !== undefined) data.musicUrl = d.musicUrl;
  if (d.theme !== undefined) {
    if (!(d.theme in THEMES)) return err("Tema inválido");
    data.theme = d.theme;
  }
  if (d.startDate !== undefined) {
    const date = new Date(d.startDate);
    if (isNaN(date.getTime())) return err("Data inválida");
    if (date.getTime() > Date.now()) return err("A data não pode estar no futuro");
    data.startDate = date;
  }
  if (d.slug !== undefined && d.slug !== own.page.slug) {
    if (!isValidSlug(d.slug)) return err("Link inválido: use 3 a 40 letras minúsculas, números ou hífen");
    if (await db.page.findUnique({ where: { slug: d.slug } })) return err("Esse link já está em uso", 409);
    data.slug = d.slug;
  }
  if (own.page.style === "quiz") {
    if (d.quizPrize !== undefined) data.quizPrize = d.quizPrize;
    if (d.quiz) data.quizNeeded = Math.min(d.quizNeeded ?? own.page.quizNeeded, d.quiz.length);
    else if (d.quizNeeded !== undefined) data.quizNeeded = d.quizNeeded;
  }
  await db.page.update({ where: { id }, data });
  if (own.page.style === "quiz" && d.quiz) {
    await db.$transaction([
      db.quizQuestion.deleteMany({ where: { pageId: id } }),
      db.quizQuestion.createMany({ data: d.quiz.map((q, i) => ({ pageId: id, order: i, text: q.text, correct: q.correct, wrong: q.wrong.join("\n") })) }),
    ]);
  }

  if (d.captions) {
    for (const [photoId, caption] of Object.entries(d.captions)) {
      await db.photo.updateMany({ where: { id: photoId, pageId: id }, data: { caption } });
    }
  }
  if (d.order) {
    for (let i = 0; i < d.order.length; i++) await db.photo.updateMany({ where: { id: d.order[i], pageId: id }, data: { order: i } });
  }
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/pages/[id]">) {
  const { id } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  await db.page.delete({ where: { id } });
  return json({ ok: true });
}
