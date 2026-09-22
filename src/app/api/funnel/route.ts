import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getUser, hashPassword } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { uniqueSlug } from "@/lib/util";
import { allow, clientIp } from "@/lib/ratelimit";
import { THEMES } from "@/lib/plans";

const schema = z.object({
  kind: z.enum(["amor", "amizade", "pai"]),
  style: z.enum(["classica", "carta", "interativa", "quiz"]).default("classica"),
  title: z.string().trim().min(1, "Dê um título à página").max(80),
  recipient: z.string().trim().min(1, "Informe o nome").max(60),
  startDate: z.string(),
  message: z.string().max(4000).default(""),
  musicUrl: z.string().trim().max(300).default(""),
  theme: z.string().default("rosa"),
  timeline: z.array(z.object({ date: z.string(), title: z.string().trim().min(1).max(80), text: z.string().trim().max(600).default("") })).max(30).default([]),
  quiz: z.object({
    prize: z.string().trim().max(120).default(""),
    needed: z.number().int().min(1).max(10).default(1),
    questions: z.array(z.object({ text: z.string().trim().min(1).max(160), correct: z.string().trim().min(1).max(100), wrong: z.array(z.string().trim().min(1).max(100)).length(3) })).max(10),
  }).optional(),
  account: z.object({
    name: z.string().trim().min(2, "Informe seu nome"),
    email: z.string().trim().toLowerCase().email("E-mail inválido"),
    phone: z.string().trim().max(30).optional(),
    password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
  }).optional(),
});

/** Funil: cria a conta (se preciso) e a página de uma vez, como no fluxo "monte primeiro, cadastre depois". */
export async function POST(req: Request) {
  if (!await allow(`funnel:${clientIp(req)}`, 20, 60 * 60_000)) return err("Muitas tentativas. Tente novamente mais tarde.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const d = parsed.data;
  if (!(d.theme in THEMES)) return err("Tema inválido");
  const start = new Date(d.startDate + "T12:00:00");
  if (isNaN(start.getTime()) || start.getTime() > Date.now()) return err("Data inválida");
  if (d.style === "quiz" && (!d.quiz || d.quiz.questions.length < 3)) return err("O quiz precisa de ao menos 3 perguntas");

  let user = await getUser();
  const createdAccount = !user;
  if (!user) {
    if (!d.account) return err("Crie sua conta para salvar a página", 401);
    if (await db.user.findUnique({ where: { email: d.account.email } })) return err("Este e-mail já tem conta. Use “Já tenho conta” para entrar.", 409);
    user = await db.user.create({ data: { name: d.account.name, email: d.account.email, phone: d.account.phone, passwordHash: await hashPassword(d.account.password) } });
    await createSession(user.id);
  }

  const page = await db.page.create({
    data: {
      userId: user.id, kind: d.kind, style: d.style, title: d.title, recipient: d.recipient, startDate: start, message: d.message, musicUrl: d.musicUrl, theme: d.theme,
      slug: await uniqueSlug(`${user.name.split(" ")[0]}-${d.recipient.split(" ")[0]}`),
      quizPrize: d.quiz?.prize ?? "", quizNeeded: d.quiz?.needed ?? 1,
      quiz: d.style === "quiz" && d.quiz ? { create: d.quiz.questions.map((q, i) => ({ order: i, text: q.text, correct: q.correct, wrong: q.wrong.join("\n") })) } : undefined,
    },
  });
  const timelineIds: string[] = [];
  for (const e of d.timeline) {
    const ev = await db.timelineEvent.create({ data: { pageId: page.id, date: new Date(e.date + "T12:00:00"), title: e.title, text: e.text } });
    timelineIds.push(ev.id);
  }
  return json({ id: page.id, timelineIds, createdAccount });
}
