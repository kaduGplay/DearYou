import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type MetaAttribution = { fbp?: string; fbc?: string; client_ip_address?: string; client_user_agent?: string };
export function captureMetaAttribution(req: Request): MetaAttribution {
  const values = new Map((req.headers.get("cookie") ?? "").split(";").map((part) => { const i = part.indexOf("="); return [part.slice(0, i).trim(), part.slice(i + 1)]; }));
  const result: MetaAttribution = {};
  for (const key of ["fbp", "fbc"] as const) {
    const value = values.get(`_${key}`);
    if (value && /^fb\.\d+\.\d+\.[A-Za-z0-9_.-]+$/.test(value) && value.length <= 500) result[key] = value;
  }
  const ip = (req.headers.get(process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for") ?? "").split(",")[0].trim();
  if (isIP(ip)) result.client_ip_address = ip;
  const ua = req.headers.get("user-agent");
  if (ua) result.client_user_agent = ua.slice(0, 1000);
  return result;
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
type OrderData = { id: string; userId: string; plan: string; status: string; provider: string; amountCents: number; pixCode: string | null; pixGeneratedAt: Date | null; paidAt: Date | null; metaAttribution: unknown; user: { email: string } };
export function metaConversionPayload(order: OrderData, name: "Purchase" | "PIXGenerated", origin: string) {
  if (order.provider !== "voidpay" || (name === "Purchase" ? order.status !== "paid" || !order.paidAt : !order.pixCode || !order.pixGeneratedAt)) return null;
  const attribution = (order.metaAttribution ?? {}) as MetaAttribution;
  const when = name === "Purchase" ? order.paidAt! : order.pixGeneratedAt!;
  return {
    event_name: name,
    event_id: `${name === "Purchase" ? "purchase" : "pix-generated"}:${order.id}`,
    event_time: Math.floor(when.getTime() / 1000),
    action_source: "website",
    event_source_url: `${origin.replace(/\/$/, "")}/checkout/${order.id}`,
    user_data: { em: [hash(order.user.email.trim().toLowerCase())], external_id: [hash(order.userId)], ...attribution },
    custom_data: { value: order.amountCents / 100, currency: "BRL", content_type: "product", content_ids: [order.plan], num_items: 1, order_id: order.id },
  };
}
