import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { json, err } from "@/lib/guard";
import { getUser } from "@/lib/auth";
import { pageIsLive } from "@/lib/util";

/** Conta a visita e avisa o dono por e-mail (não conta as visitas do próprio dono). */
export async function POST(_req: Request, ctx: RouteContext<"/api/public/[slug]/view">) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({ where: { slug }, include: { user: true } });
  if (!page || !pageIsLive(page)) return err("Não encontrada", 404);
  const viewer = await getUser();
  if (viewer?.id === page.userId) return json({ counted: false });
  const updated = await db.page.update({ where: { id: page.id }, data: { views: { increment: 1 } } });
  await sendEmail(
    page.user.email,
    `${page.recipient || "Alguém"} abriu a sua página 💌`,
    `Sua página "${page.title}" acabou de ser aberta em ${new Date().toLocaleString("pt-BR")}.\nTotal de visitas: ${updated.views}.`,
  );
  return json({ counted: true });
}
