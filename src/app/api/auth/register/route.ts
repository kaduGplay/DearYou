import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { allow, clientIp } from "@/lib/ratelimit";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().optional(),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

export async function POST(req: Request) {
  if (!await allow(`register:${clientIp(req)}`, 10, 60 * 60_000)) return err("Muitas tentativas. Tente novamente mais tarde.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(parsed.error.issues[0].message);
  const { name, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return err("Este e-mail já está cadastrado", 409);
  const user = await db.user.create({ data: { name, email, phone, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  return json({ ok: true });
}
