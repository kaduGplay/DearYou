import { db } from "@/lib/db";
import { checkPassword, createSession } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { allow, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!await allow(`login:${clientIp(req)}:${String(email).toLowerCase()}`, 8, 15 * 60_000)) return err("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);
  const user = typeof email === "string" ? await db.user.findUnique({ where: { email: email.trim().toLowerCase() } }) : null;
  if (!user || typeof password !== "string" || !(await checkPassword(password, user.passwordHash))) return err("E-mail ou senha incorretos", 401);
  await createSession(user.id);
  return json({ ok: true });
}
