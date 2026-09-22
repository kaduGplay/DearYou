import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { err, json } from "@/lib/guard";
import { PLANS, type PlanId } from "@/lib/plans";
import { getProvider } from "@/lib/payments";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Não autenticado", 401);
  const { pageId, plan } = await req.json().catch(() => ({}));
  if (!(plan in PLANS)) return err("Plano inválido");
  const page = await db.page.findUnique({ where: { id: String(pageId) }, include: { photos: true } });
  if (!page || page.userId !== user.id) return err("Página não encontrada", 404);
  const p = PLANS[plan as PlanId];
  // Todas as cobranças PIX usam o mesmo CPF configurado; o cliente não informa CPF.
  const cpf = (process.env.VOIDPAY_DEFAULT_DOCUMENT ?? "").replace(/\D/g, "") || null;
  if (process.env.PAYMENT_PROVIDER === "voidpay" && !cpf) return err("Pagamento indisponível: CPF padrão não configurado.", 503);
  if (p.id === "dia" && page.style !== "classica") return err("Este estilo de página exige o Plano Eterno.");
  if (page.photos.length > p.maxPhotos) return err(`O ${p.name} permite até ${p.maxPhotos} fotos. Remova algumas ou escolha o Plano Eterno.`);

  let provider;
  try { provider = getProvider(); } catch (e) { return err(e instanceof Error ? e.message : "Pagamento indisponível", 503); }
  const order = await db.order.create({ data: { userId: user.id, pageId: page.id, plan: p.id, amountCents: p.priceCents, method: "pix", provider: provider.name } });
  try {
    const origin = process.env.APP_URL || new URL(req.url).origin;
    const charge = await provider.createPix({
      orderId: order.id,
      planId: p.id,
      amountCents: p.priceCents,
      callbackUrl: `${origin}/api/webhooks/voidpay`,
      description: p.name,
      customer: { name: user.name, email: user.email, phone: user.phone, document: cpf },
    });
    const pixQr = charge.pixQr ?? (await QRCode.toDataURL(charge.pixCode, { margin: 1, width: 320 }));
    await db.order.update({ where: { id: order.id }, data: { providerRef: charge.providerRef, pixCode: charge.pixCode, pixQr, webhookToken: charge.webhookToken ?? null, expiresAt: charge.expiresAt ?? null } });
    return json({ orderId: order.id });
  } catch (e) {
    await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
    return err(e instanceof Error ? e.message : "Não foi possível gerar o PIX", 502);
  }
}
