import { db } from "@/lib/db";
import { err, json } from "@/lib/guard";
import { syncOrder } from "@/lib/payments";
import { record, textField, transactionData, safeTokenEqual } from "@/lib/payments/voidpay-status";
import { allow } from "@/lib/ratelimit";

export const maxDuration = 60;

/** O callback notifica; a consulta autenticada à VoidPay confirma status, valor e transação. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!Object.keys(record(body)).length) return err("Payload inválido");
  const data = transactionData(body);
  const reference = textField(data, "transactionId", "id") ?? textField(body, "transactionId");
  const identifier = textField(data, "identifier", "clientIdentifier") ?? textField(body, "identifier", "clientIdentifier");
  const order = (reference ? await db.order.findFirst({ where: { provider: "voidpay", providerRef: reference } }) : null)
    ?? (identifier ? await db.order.findUnique({ where: { id: identifier } }) : null);
  if (!order || order.provider !== "voidpay") return err("Pedido não encontrado", 404);
  if (reference && order.providerRef && reference !== order.providerRef) return err("Transação divergente", 400);
  if (identifier && identifier !== order.id) return err("Identificador divergente", 400);
  const token = textField(body, "webhookToken", "token") ?? textField(data, "webhookToken", "token")
    ?? req.headers.get("x-webhook-token") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && order.webhookToken && !safeTokenEqual(token, order.webhookToken)) return err("Não autorizado", 401);
  // Callbacks sem token não têm seu status aceito: só podem solicitar a consulta autenticada à VoidPay.
  if (!await allow(`voidpay-webhook:${order.id}`, 60, 60_000)) return err("Tente novamente em instantes", 429);
  if (!order.providerRef) return err("Cobrança ainda sendo salva. Reenvie o aviso.", 503);
  await db.order.update({ where: { id: order.id }, data: { webhookReceivedAt: new Date() } });
  try {
    const updated = await syncOrder(order.id);
    const declared = textField(data, "status", "transactionStatus") ?? textField(body, "event", "status") ?? "";
    if (updated?.status === "pending" && /(?:^|[._])(?:paid|completed|approved|confirmed)$/i.test(declared)) return err("Confirmação ainda não disponível no gateway. Reenvie o aviso.", 503);
    return json({ ok: true, status: updated?.status });
  } catch {
    // Não confirma recebimento definitivo se não foi possível conferir o pagamento.
    return err("Não foi possível consultar o pagamento. Reenvie o aviso.", 503);
  }
}
