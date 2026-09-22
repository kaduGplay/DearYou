import { db } from "@/lib/db";
import { err, json } from "@/lib/guard";
import { allow, clientIp } from "@/lib/ratelimit";
import { signReset } from "@/lib/resetToken";
import { sendEmail, emailConfigured } from "@/lib/email";

/** Sempre responde OK (não revela se o e-mail existe). */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !email.includes("@")) return err("Informe um e-mail válido");
  if (!await allow(`forgot:${clientIp(req)}`, 5, 60 * 60_000)) return err("Muitas tentativas. Tente novamente mais tarde.", 429);
  if (process.env.NODE_ENV === "production" && !emailConfigured()) return err("A recuperação de senha está temporariamente indisponível.", 503);
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (user) {
    const origin = process.env.APP_URL || new URL(req.url).origin;
    const token = await signReset(user.id, user.passwordHash);
    await sendEmail(user.email, "Redefinir sua senha", `Olá, ${user.name.split(" ")[0]}!\n\nPara criar uma nova senha, acesse (vale por 1 hora):\n${origin}/auth/reset-password?token=${token}\n\nSe não foi você, ignore este e-mail.`);
  }
  return json({ ok: true });
}
