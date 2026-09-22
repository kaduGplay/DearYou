export const META_PIXEL_ID = "27993934270289164";
type Params = Record<string, string | number | boolean | string[]>;
type PixelCall = (command: string, ...args: unknown[]) => void;
declare global { interface Window { fbq?: PixelCall } }
type Event = { name: string; params: Params; id?: string; custom: boolean };
const pending: Event[] = [];
const sent = new Set<string>();

function alreadySent(id: string) {
  if (sent.has(id)) return true;
  try { return localStorage.getItem(`dy:meta:${id}`) === "1"; } catch { return false; }
}
function dispatch(event: Event) {
  if (event.id && alreadySent(event.id)) return;
  if (!window.fbq) { pending.push(event); return; }
  try {
    window.fbq(event.custom ? "trackSingleCustom" : "trackSingle", META_PIXEL_ID, event.name, event.params, event.id ? { eventID: event.id } : {});
    if (event.id) {
      sent.add(event.id);
      try { localStorage.setItem(`dy:meta:${event.id}`, "1"); } catch { /* Navegação privada: mantém a proteção em memória. */ }
    }
  } catch { /* Analytics nunca bloqueia cadastro, pagamento ou navegação. */ }
}
export function flushMetaEvents() {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const event of pending.splice(0)) dispatch(event);
}
export function trackMeta(name: string, params: Params = {}, id?: string, custom = false) {
  if (typeof window === "undefined") return;
  dispatch({ name, params, id, custom });
}
export type Purchase = { id: string; amountCents: number; plan: string; status: string; provider: string };
export function trackPurchase(order: Purchase) {
  if (order.status !== "paid" || order.provider !== "voidpay" || !Number.isInteger(order.amountCents) || order.amountCents <= 0) return;
  trackMeta("Purchase", {
    value: order.amountCents / 100, currency: "BRL", content_type: "product",
    content_ids: [order.plan], num_items: 1, order_id: order.id,
  }, `purchase:${order.id}`);
}
