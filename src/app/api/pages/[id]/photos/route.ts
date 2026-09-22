import { saveImage } from "@/lib/storage";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { canEditAll, err, json, ownPage } from "@/lib/guard";
import { PLANS, type PlanId } from "@/lib/plans";
import { sniffImage, MAX_IMAGE_BYTES, IMAGE_TYPES } from "@/lib/image";


export async function POST(req: Request, ctx: RouteContext<"/api/pages/[id]/photos">) {
  const { id } = await ctx.params;
  const own = await ownPage(id);
  if ("error" in own) return own.error;
  if (!canEditAll(own.page)) return err("O prazo de edição terminou", 403);

  // Antes de pagar vale o limite do plano maior (o usuário ainda escolhe o plano); após pagar, o do plano contratado.
  const limit = own.page.plan ? PLANS[own.page.plan as PlanId].maxPhotos : PLANS.eterno.maxPhotos;
  const count = await db.photo.count({ where: { pageId: id } });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length > 1) return err("Envie uma foto por requisição");
  if (!files.length) return err("Nenhum arquivo enviado");
  if (count + files.length > limit) return err(`Seu plano permite até ${limit} fotos`);

  const created = [];
  for (const [i, f] of files.entries()) {
    if (f.size > MAX_IMAGE_BYTES) return err("Cada foto pode ter no máximo 4 MB");
    const bytes = Buffer.from(await f.arrayBuffer());
    const ext = sniffImage(bytes);
    if (!ext) return err("Envie imagens JPG, PNG, WEBP ou GIF");
    const file = `${nanoid(16).replace(/[^a-zA-Z0-9]/g, "a")}.${ext}`;
    await saveImage(file, bytes, IMAGE_TYPES[ext]);
    created.push(await db.photo.create({ data: { pageId: id, file, order: count + i } }));
  }
  return json({ photos: created });
}
