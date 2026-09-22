"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ico } from "@/components/wizard/icons";
import { BRAND } from "@/lib/brand";

export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("redirect") || params.get("next") || "/dashboard";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Algo deu errado"); setBusy(false); return; }
    router.push(next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  const input = "h-9 w-full rounded-lg border border-pink-200/50 bg-pink-50/70 px-3 text-sm outline-none transition placeholder:text-[#6b6b80]/70 focus:border-pink-300 focus:ring-4 focus:ring-pink-200/50";

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-[88px]" style={{ background: "#fffbfc" }}>
      <Link href="/" className="flex items-center gap-2"><Ico n="heart" fill className="h-6 w-6 text-pink-400" /><span className="font-serif text-2xl font-bold text-pink-400">{BRAND.name}</span></Link>
      <Link href="/" className="mt-5 flex items-center gap-2 text-sm text-[#6b6b80] transition hover:text-pink-500"><Ico n="arrow-left" className="h-3.5 w-3.5" />Voltar para a página inicial</Link>

      <div className="mt-9 w-full max-w-[384px] rounded-2xl border border-pink-200/40 p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#fff 0%,#fff5f9 100%)" }}>
        <h1 className="font-serif text-2xl font-bold">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-sm text-[#6b6b80]">Entre com seu email e senha</p>


        <form onSubmit={submit} className="mt-6">
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input name="email" type="email" required className={input} placeholder="seu@email.com" autoComplete="email" />
          <label className="mb-2 mt-5 block text-sm font-medium">Senha</label>
          <input name="password" type="password" required className={input} autoComplete="current-password" />
          <div className="mt-5 text-right"><Link href="/auth/forgot-password" className="text-sm text-[#6b6b80] transition hover:text-pink-500">Esqueceu sua senha?</Link></div>
          {error && <p className="mt-3 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p>}
          <button disabled={busy} className="mt-4 h-9 w-full rounded-xl bg-[#ed68ae] text-sm font-medium text-white transition hover:bg-[#db589e] disabled:opacity-60">{busy ? "Entrando…" : "Entrar"}</button>
        </form>
        <p className="mt-4 text-center text-sm">Não tem uma conta? <Link href="/criar" className="border-b border-pink-400 text-pink-500">Criar Conta</Link></p>
      </div>
    </main>
  );
}
