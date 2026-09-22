"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const email = new FormData(e.currentTarget).get("email");
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(d.error ?? "Algo deu errado");
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4" style={{ background: "#fffbfc" }}>
      <div className="w-full max-w-[384px] rounded-2xl border border-pink-200/40 p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#fff 0%,#fff5f9 100%)" }}>
        <h1 className="font-serif text-2xl font-bold">Recuperar senha</h1>
        {sent ? (
          <p className="mt-3 text-sm text-[#6b6b80]">Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Ele vale por 1 hora.</p>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <p className="text-sm text-[#6b6b80]">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
            <label className="mb-2 mt-5 block text-sm font-medium">Email</label>
            <input name="email" type="email" required className="input" placeholder="seu@email.com" autoComplete="email" />
            {error && <p className="mt-3 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p>}
            <button disabled={busy} className="mt-4 h-10 w-full rounded-xl bg-[#ed68ae] text-sm font-medium text-white transition hover:bg-[#db589e] disabled:opacity-60">{busy ? "Enviando…" : "Enviar link"}</button>
          </form>
        )}
        <Link href="/auth/login" className="mt-5 block text-center text-sm text-pink-500 underline">Voltar para o login</Link>
      </div>
    </main>
  );
}
