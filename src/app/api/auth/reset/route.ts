import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { allow, clientIp } from "@/lib/ratelimit";
import { readReset } from "@/lib/resetToken";

export async function POST(req: Request) {
  if (!await allow(`reset:${clientIp(req)}`, 10, 60 * 60_000)) return err("Muitas tentativas. Tente novamente mais tarde.", 429);
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 6) return err("A senha precisa ter ao menos 6 caracteres");
  const t = typeof token === "string" ? await readReset(token) : null;
  const user = t ? await db.user.findUnique({ where: { id: t.uid } }) : null;
  if (!t || !user || user.passwordHash.slice(-12) !== t.pw) return err("Link inválido ou expirado. Peça um novo.", 400);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  return json({ ok: true });
}
