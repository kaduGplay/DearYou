import { deleteImage } from "@/lib/storage";
import { z } from "zod";
import { db } from "@/lib/db";
import { err, json, ownPage } from "@/lib/guard";

const schema = z.object({
  date: z.string(),
  title: z.string().trim().min(1, "Dê um título ao momento").max(80),
  text: z.string().trim().max(600).default(""),
});

export async function POST(req: Request, ctx: RouteContext<"/api/pages/[id]/timeline">) {
  const { id } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  if (own.page.plan !== "eterno") return err("A linha do tempo é exclusiva do Plano Eterno", 403);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const date = new Date(parsed.data.date);
  if (isNaN(date.getTime())) return err("Data inválida");
  const ev = await db.timelineEvent.create({ data: { pageId: id, date, title: parsed.data.title, text: parsed.data.text } });
  return json({ event: ev });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/pages/[id]/timeline">) {
  const { id } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  const eventId = new URL(req.url).searchParams.get("eventId") ?? "";
  const ev = await db.timelineEvent.findFirst({ where: { id: eventId, pageId: id } });
  if (ev?.photo) await deleteImage(ev.photo).catch(() => {});
  await db.timelineEvent.deleteMany({ where: { id: eventId, pageId: id } });
  return json({ ok: true });
}
