import { z } from "zod";
import { db } from "@/lib/db";
import { err, json } from "@/lib/guard";
import { pageIsLive } from "@/lib/util";
import { allow, clientIp } from "@/lib/ratelimit";

const schema = z.object({ author: z.string().trim().min(1, "Informe seu nome").max(40), message: z.string().trim().min(1, "Escreva uma mensagem").max(500) });

export async function POST(req: Request, ctx: RouteContext<"/api/public/[slug]/guestbook">) {
  const { slug } = await ctx.params;
  if (!await allow(`gb:${clientIp(req)}:${slug}`, 6, 10 * 60_000)) return err("Você enviou muitas mensagens. Aguarde um pouco.", 429);
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || !pageIsLive(page)) return err("Não encontrada", 404);
  if (page.plan !== "eterno") return err("Livro de visitas indisponível", 403);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const entry = await db.guestbookEntry.create({ data: { pageId: page.id, ...parsed.data } });
  return json({ entry });
}
