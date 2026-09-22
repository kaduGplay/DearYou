"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Heart from "@/components/Heart";
import { PLANS, STYLES, brl, type PlanId, type StyleId } from "@/lib/plans";
import { trackMeta } from "@/lib/meta-pixel";
import { BRAND } from "@/lib/brand";

export default function Pricing({ pageId, title, style, photos }: { pageId: string; title: string; style: string; photos: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const eternoOnly = STYLES[(style as StyleId) in STYLES ? (style as StyleId) : "classica"].eterno;

  async function pay(plan: PlanId) {
    setBusy(plan); setError("");
    const event = { value: PLANS[plan].priceCents / 100, currency: "BRL", content_ids: [plan], content_type: "product", num_items: 1 };
    trackMeta("AddToCart", event, `cart:${pageId}:${plan}`);
    trackMeta("InitiateCheckout", event, `checkout:${pageId}:${plan}`);
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, plan }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setBusy(null); return; }
    router.push(`/checkout/${d.orderId}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="mx-auto flex w-fit items-center gap-2 font-serif text-2xl font-bold"><Heart className="h-7 w-7 text-pink-500" />{BRAND.name}</Link>
      <div className="mt-8 text-center">
        <p className="text-sm font-semibold text-pink-500">Sua página “{title}” está pronta 🎉</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Escolha como publicar</h1>
        <p className="mt-2 text-[#6b6b80]">Pagamento único via PIX. Sua página entra no ar assim que o pagamento é confirmado.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={`/preview/${pageId}`} className="btn btn-ghost !py-2 text-sm">👁 Ver preview</Link>
          <Link href={`/editor/${pageId}`} className="btn btn-ghost !py-2 text-sm">Editar</Link>
        </div>
      </div>
      {error && <p className="mx-auto mt-6 max-w-md rounded-xl bg-pink-50 px-4 py-2 text-center text-sm text-pink-700">{error}</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {(["dia", "eterno"] as const).map((id) => {
          const p = PLANS[id]; const hot = id === "eterno"; const off = id === "dia" && (eternoOnly || photos > p.maxPhotos);
          return (
            <div key={id} className={`relative rounded-3xl p-7 ${hot ? "bg-[#1a1a2e] text-white shadow-2xl" : "bg-white ring-1 ring-pink-400/20"} ${off ? "opacity-60" : ""}`}>
              {hot && <span className="absolute -top-3 right-6 rounded-full bg-[#ed68ae] px-3 py-1 text-xs font-bold text-white">Mais escolhido</span>}
              <p className={`text-sm ${hot ? "text-pink-200" : "text-[#6b6b80]"}`}>{p.tagline}</p>
              <h2 className="font-serif text-2xl font-bold">{p.name}</h2>
              <p className="mt-3 text-4xl font-bold">{brl(p.priceCents)}</p><p className={`text-sm ${hot ? "text-pink-200" : "text-[#6b6b80]"}`}>pagamento único</p>
              <ul className="mt-5 space-y-2 text-sm">{p.features.map((x) => <li key={x}>✓ {x}</li>)}</ul>
              {off && <p className="mt-4 text-xs text-pink-500">{eternoOnly ? "Este estilo exige o Plano Eterno." : `Você tem ${photos} fotos; este plano permite ${p.maxPhotos}.`}</p>}
              <button disabled={off || !!busy} onClick={() => pay(id)} className={`btn mt-6 w-full ${hot ? "btn-primary" : "btn-ghost"}`}>{busy === id ? "Gerando PIX…" : "Pagar com PIX"}</button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
