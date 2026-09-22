import { saveImage, deleteImage } from "@/lib/storage";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { err, json, ownPage } from "@/lib/guard";
import { sniffImage, MAX_IMAGE_BYTES, IMAGE_TYPES } from "@/lib/image";

export async function POST(req: Request, ctx: RouteContext<"/api/pages/[id]/timeline/[eventId]/photo">) {
  const { id, eventId } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  const ev = await db.timelineEvent.findFirst({ where: { id: eventId, pageId: id } });
  if (!ev) return err("Momento não encontrado", 404);
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) return err("Nenhum arquivo enviado");
  if (f.size > MAX_IMAGE_BYTES) return err("A foto pode ter no máximo 4 MB");
  const bytes = Buffer.from(await f.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return err("Envie imagens JPG, PNG, WEBP ou GIF");
  const file = `${nanoid(16).replace(/[^a-zA-Z0-9]/g, "a")}.${ext}`;
  await saveImage(file, bytes, IMAGE_TYPES[ext]);
  await db.timelineEvent.update({ where: { id: eventId }, data: { photo: file } });
  if (ev.photo) await deleteImage(ev.photo).catch(() => {});
  return json({ photo: `/api/uploads/${file}` });
}
