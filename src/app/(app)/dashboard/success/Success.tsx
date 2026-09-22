/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import Heart from "@/components/Heart";

export default function Success({ slug, pageId, eterno }: { slug: string; pageId: string; eterno: boolean }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/${slug}`;
  useEffect(() => { QRCode.toDataURL(`${window.location.origin}/${slug}`, { margin: 1, width: 260 }).then(setQr); }, [slug]);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-pink-400/15">
        <Heart className="beat mx-auto h-16 w-16 text-pink-500" />
        <h1 className="mt-4 font-serif text-3xl font-bold">Sua página está no ar! 🎉</h1>
        <p className="mt-2 text-[#6b6b80]">Envie o link ou mostre o QR Code. Avisamos por e-mail quando abrirem.</p>
        <p suppressHydrationWarning className="mt-5 break-all rounded-xl bg-pink-50 p-3 font-semibold">{link}</p>
        {qr && <img src={qr} alt="QR Code" className="mx-auto mt-4 h-48 w-48" />}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copiado ✓" : "Copiar link"}</button>
          <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent("Fiz uma surpresa pra você 💌 " + link)}`}>WhatsApp</a>
          <Link className="btn btn-primary" href={`/${slug}`}>Ver página</Link>
        </div>
        <Link href={`/editor/${pageId}`} className="mt-4 block text-sm text-pink-500 underline">Editar página {eterno ? "" : "(24h)"}</Link>
        <Link href="/dashboard" className="mt-2 block text-sm text-[#6b6b80] underline">Minhas páginas</Link>
      </div>
    </main>
  );
}
