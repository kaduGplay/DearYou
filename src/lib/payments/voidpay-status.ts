import { timingSafeEqual } from "node:crypto";

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function textField(value: unknown, ...keys: string[]) {
  const object = record(value);
  for (const key of keys) if (typeof object[key] === "string" && object[key]) return object[key] as string;
}
export function transactionData(value: unknown) {
  const object = record(value), data = record(object.data);
  return Object.keys(record(data.transaction)).length ? record(data.transaction)
    : Object.keys(record(object.transaction)).length ? record(object.transaction)
    : Object.keys(data).length ? data : object;
}
export function safeTokenEqual(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Só interpreta respostas da consulta autenticada ao gateway, nunca o status enviado pelo visitante. */
export function providerStatus(response: unknown, reference: string, amountCents?: number): "pending" | "paid" | "failed" {
  const data = transactionData(response);
  const id = textField(data, "id", "transactionId");
  if (!id || id !== reference) throw new Error("Transação divergente na resposta do gateway");
  if (amountCents !== undefined && (typeof data.amount !== "number" || Math.round(data.amount * 100) !== amountCents)) throw new Error("Valor divergente na resposta do gateway");
  const status = (textField(data, "status", "transactionStatus") ?? "").toUpperCase();
  // Reembolso/estorno não representam uma nova compra; não reaplicam a publicação.
  if (["REFUNDED", "CHARGEBACK", "REFUND_PENDING"].includes(status)) return "pending";
  if (["COMPLETED", "PAID", "APPROVED", "CONFIRMED"].includes(status)) return "paid";
  if (["FAILED", "EXPIRED", "CANCELED", "CANCELLED", "REJECTED"].includes(status)) return "failed";
  return "pending";
}
