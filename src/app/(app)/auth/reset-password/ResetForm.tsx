"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const password = new FormData(e.currentTarget).get("password");
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error ?? "Algo deu errado"); setBusy(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4" style={{ background: "#fffbfc" }}>
      <div className="w-full max-w-[384px] rounded-2xl border border-pink-200/40 p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#fff 0%,#fff5f9 100%)" }}>
        <h1 className="font-serif text-2xl font-bold">Criar nova senha</h1>
        <form onSubmit={submit} className="mt-4">
          <label className="mb-2 block text-sm font-medium">Nova senha (mín. 6 caracteres)</label>
          <input name="password" type="password" minLength={6} required className="input" autoComplete="new-password" />
          {error && <p className="mt-3 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p>}
          <button disabled={busy || !token} className="mt-4 h-10 w-full rounded-xl bg-[#ed68ae] text-sm font-medium text-white transition hover:bg-[#db589e] disabled:opacity-60">{busy ? "Salvando…" : "Salvar nova senha"}</button>
        </form>
        <Link href="/auth/forgot-password" className="mt-5 block text-center text-sm text-pink-500 underline">Pedir um novo link</Link>
      </div>
    </main>
  );
}
