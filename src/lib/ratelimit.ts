import { createHash } from "node:crypto";
import { db } from "./db";

export function clientIp(req: Request) {
  const forwarded = process.env.VERCEL ? req.headers.get("x-vercel-forwarded-for") : req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}

/** Contador atômico compartilhado por todas as instâncias, sem armazenar IP/e-mail em texto. */
export async function allow(key: string, max: number, windowMs: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${hash}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expires} ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  // Limpa registros antigos em pequenas parcelas das requisições.
  if (Math.random() < 0.01) await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  return rows[0].count <= max;
}
