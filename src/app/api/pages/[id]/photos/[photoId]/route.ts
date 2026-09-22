import { deleteImage } from "@/lib/storage";
import { db } from "@/lib/db";
import { canEditAll, err, json, ownPage } from "@/lib/guard";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/pages/[id]/photos/[photoId]">) {
  const { id, photoId } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  if (!canEditAll(own.page)) return err("O prazo de edição terminou", 403);
  const photo = await db.photo.findFirst({ where: { id: photoId, pageId: id } });
  if (!photo) return err("Foto não encontrada", 404);
  await db.photo.delete({ where: { id: photoId } });
  await deleteImage(photo.file).catch(() => {});
  return json({ ok: true });
}
