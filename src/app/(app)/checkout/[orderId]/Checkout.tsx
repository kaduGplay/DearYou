/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { trackMeta } from "@/lib/meta-pixel";
import { useRouter } from "next/navigation";

type Props = { orderId: string; amountCents: number; plan: string; paid: boolean; failed: boolean; pageId: string; expiresAt: string | null; planName: string; price: string; pixCode: string; pixQr: string; canSimulate: boolean };

export default function Checkout(p: Props) {
  const router = useRouter();
  const [paid, setPaid] = useState(p.paid);
  const [failed, setFailed] = useState(p.failed);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (p.paid || p.failed || p.canSimulate || !p.pixCode) return;
    const params = { value: p.amountCents / 100, currency: "BRL", content_ids: [p.plan], content_type: "product", payment_method: "pix" };
    trackMeta("AddPaymentInfo", params, `payment-info:${p.orderId}`);
    trackMeta("PIXGenerated", params, `pix-generated:${p.orderId}`, true);
  }, [p.paid, p.failed, p.canSimulate, p.pixCode, p.amountCents, p.plan, p.orderId]);

  useEffect(() => {
    if (paid) {
      router.replace(`/dashboard/success?order=${p.orderId}`);
      return;
    }
    const id = setInterval(async () => {
      const r = await fetch(`/api/checkout/${p.orderId}`).then((x) => x.json()).catch(() => null);
      if (r?.status === "paid") setPaid(true);
      if (r?.status === "failed") setFailed(true);
    }, 4000);
    return () => clearInterval(id);
  }, [paid, p.orderId, router]);

  if (failed) return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-pink-400/15">
        <h1 className="font-serif text-2xl font-bold">Este PIX expirou</h1>
        <p className="mt-2 text-[#6b6b80]">Não se preocupe: sua página continua salva. Gere um novo PIX para publicar.</p>
        <a href={`/dashboard/pricing?page=${p.pageId}`} className="btn btn-primary mt-6">Gerar novo PIX</a>
      </div>
    </main>
  );

  if (paid) return <main className="grid min-h-screen place-items-center"><p className="font-serif text-xl">Pagamento confirmado! Redirecionando…</p></main>;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-pink-400/15">
        <p className="text-sm text-[#6b6b80]">{p.planName}</p>
        <h1 className="font-serif text-4xl font-bold">{p.price}</h1>
        <p className="mt-1 text-sm text-[#6b6b80]">Pague com PIX · aprovação na hora</p>
        {p.pixQr && (<img src={p.pixQr} alt="QR Code PIX" className="mx-auto mt-5 h-56 w-56" />)}
        <p className="mt-4 text-left text-xs font-semibold">PIX copia e cola</p>
        <textarea readOnly value={p.pixCode} rows={3} className="input mt-1 !text-xs" />
        <button className="btn btn-primary mt-3 w-full" onClick={async () => { try { await navigator.clipboard.writeText(p.pixCode); setCopied(true); trackMeta("PIXCopied", { value: p.amountCents / 100, currency: "BRL", content_ids: [p.plan] }, `pix-copied:${p.orderId}`, true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } }}>{copied ? "Copiado ✓" : "Copiar código PIX"}</button>
        {p.expiresAt && <p className="mt-3 text-xs text-[#6b6b80]" suppressHydrationWarning>Este PIX vale até {new Date(p.expiresAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>}
        <p className="mt-4 text-xs text-[#6b6b80]">Aguardando pagamento… assim que o PIX for pago, sua página é publicada automaticamente.</p>
        {p.canSimulate && (
          <button className="mt-4 w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 py-2 text-sm text-amber-800" onClick={async () => { await fetch(`/api/checkout/${p.orderId}/simulate`, { method: "POST" }); setPaid(true); }}>
            🧪 Modo teste: simular pagamento aprovado
          </button>
        )}
      </div>
    </main>
  );
}
