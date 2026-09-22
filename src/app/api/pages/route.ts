import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { uniqueSlug } from "@/lib/util";

const schema = z.object({
  kind: z.enum(["amor", "amizade", "pai"]).default("amor"),
  recipient: z.string().trim().min(1, "Informe o nome").max(60),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Não autenticado", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const { kind, recipient } = parsed.data;
  const page = await db.page.create({
    data: {
      userId: user.id,
      kind,
      recipient,
      title: kind === "amor" ? "Nossa história" : kind === "amizade" ? "Nossa amizade" : "Para você, pai",
      slug: await uniqueSlug(`${user.name.split(" ")[0]}-${recipient.split(" ")[0]}`),
      startDate: new Date(),
    },
  });
  return json({ id: page.id });
}
