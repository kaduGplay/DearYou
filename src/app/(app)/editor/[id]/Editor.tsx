/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KINDS, PLANS, THEMES, brl, type KindId, type PlanId, type ThemeId } from "@/lib/plans";
import { musicEmbed } from "@/lib/util";
import { BRAND } from "@/lib/brand";
import MusicSearch from "@/components/MusicSearch";

type P = {
  style: string; quizPrize: string; quizNeeded: number; quiz: { text: string; correct: string; wrong: string[] }[];
  id: string; slug: string; kind: string; status: string; plan: string | null; title: string; recipient: string; startDate: string; message: string; theme: string; musicUrl: string; editableUntil: string | null;
  photos: { id: string; url: string; caption: string }[];
  timeline: { id: string; date: string; title: string; text: string; photo?: string | null }[];
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Algo deu errado");
  return data;
}

export default function Editor({ page, fullEdit, openPlans }: { page: P; fullEdit: boolean; openPlans: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ title: page.title, recipient: page.recipient, slug: page.slug, startDate: page.startDate, message: page.message, theme: page.theme, musicUrl: page.musicUrl });
  const isQuiz = page.style === "quiz";
  const [prize, setPrize] = useState(page.quizPrize);
  const [needed, setNeeded] = useState(page.quizNeeded);
  const [qs, setQs] = useState(page.quiz.length ? page.quiz.map((q) => ({ ...q, wrong: [...q.wrong, "", "", ""].slice(0, 3) })) : [0, 1, 2].map(() => ({ text: "", correct: "", wrong: ["", "", ""] })));
  const [photos, setPhotos] = useState(page.photos);
  const [timeline, setTimeline] = useState(page.timeline);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState(openPlans);
  const fileRef = useRef<HTMLInputElement>(null);
  const kind = KINDS[page.kind as KindId] ?? KINDS.amor;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const flash = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 3500); };
  const published = page.status !== "draft";
  const music = musicEmbed(f.musicUrl);

  async function save(silent = false) {
    setBusy(true);
    try {
      await api(`/api/pages/${page.id}`, "PUT", { ...f, startDate: new Date(f.startDate + "T12:00:00").toISOString(), captions: Object.fromEntries(photos.map((p) => [p.id, p.caption])), order: photos.map((p) => p.id), ...(isQuiz ? { quizPrize: prize, quizNeeded: Math.min(needed, qs.length), quiz: qs } : {}) });
      if (!silent) flash("Alterações salvas ✓");
      return true;
    } catch (e) { flash((e as Error).message, false); return false; } finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if ([...files].some((f) => f.size > 4 * 1024 * 1024)) return flash("Cada foto pode ter no máximo 4 MB", false);
    setBusy(true);
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append("files", file);
        const res = await fetch(`/api/pages/${page.id}/photos`, { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Não foi possível enviar a foto");
        const d = await res.json();
        setPhotos((s) => [...s, ...d.photos.map((p: { id: string; file: string; caption: string }) => ({ id: p.id, url: `/api/uploads/${p.file}`, caption: p.caption }))]);
      }
    } catch (e) { flash((e as Error).message, false); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function removePhoto(id: string) {
    try { await api(`/api/pages/${page.id}/photos/${id}`, "DELETE"); setPhotos((s) => s.filter((p) => p.id !== id)); } catch (e) { flash((e as Error).message, false); }
  }

  const move = (i: number, d: -1 | 1) => setPhotos((s) => { const a = [...s]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function goPay(plan: PlanId) {
    if (!(await save(true))) return;
    setBusy(true);
    try { const d = await api("/api/checkout", "POST", { pageId: page.id, plan }); router.push(`/checkout/${d.orderId}`); } catch (e) { flash((e as Error).message, false); setBusy(false); }
  }

  const [ev, setEv] = useState({ date: "", title: "", text: "" });
  const [evFile, setEvFile] = useState<File | null>(null);
  const evFileRef = useRef<HTMLInputElement>(null);
  async function addEvent() {
    try {
      const d = await api(`/api/pages/${page.id}/timeline`, "POST", ev);
      let photo: string | null = null;
      if (evFile && evFile.size > 4 * 1024 * 1024) { flash("Cada foto pode ter no máximo 4 MB", false); return; }
    if (evFile) { const fd = new FormData(); fd.append("file", evFile); const r = await fetch(`/api/pages/${page.id}/timeline/${d.event.id}/photo`, { method: "POST", body: fd }); if (r.ok) photo = (await r.json()).photo; else flash("O momento foi salvo, mas a foto não pôde ser enviada", false); }
      setTimeline((s) => [...s, { ...d.event, date: d.event.date.slice(0, 10), photo }].sort((a, b) => a.date.localeCompare(b.date)));
      setEv({ date: "", title: "", text: "" }); setEvFile(null); if (evFileRef.current) evFileRef.current.value = "";
    } catch (e) { flash((e as Error).message, false); }
  }
  async function delEvent(id: string) { await api(`/api/pages/${page.id}/timeline?eventId=${id}`, "DELETE"); setTimeline((s) => s.filter((x) => x.id !== id)); }

  const card = "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100";
  const dis = !fullEdit;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-32 pt-8">
      <div className="flex items-center justify-between text-sm">
        <Link href="/dashboard" className="font-semibold text-brand">← Minhas páginas</Link>
        <span className="text-neutral-500">{BRAND.name}</span>
      </div>
      <h1 className="mt-5 font-serif text-3xl font-bold">{kind.emoji} Monte a sua surpresa</h1>
      {published && <p className="mt-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-rose-100">{fullEdit ? `Você pode editar tudo até ${new Date(page.editableUntil!).toLocaleString("pt-BR")}.` : "O prazo de edição de 24h terminou. Só a linha do tempo continua editável."}</p>}

      <div className="mt-6 space-y-5">
        <section className={card}>
          <h2 className="font-serif text-xl font-bold">Básico</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label">Título da página</label><input className="input" value={f.title} disabled={dis} onChange={(e) => set("title", e.target.value)} maxLength={80} /></div>
            <div><label className="label">{kind.recipientLabel}</label><input className="input" value={f.recipient} disabled={dis} onChange={(e) => set("recipient", e.target.value)} maxLength={60} /></div>
            <div><label className="label">{kind.dateLabel}</label><input type="date" className="input" value={f.startDate} disabled={dis} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("startDate", e.target.value)} /></div>
            <div><label className="label">Link da página</label><div className="flex items-center gap-1 text-sm"><span className="text-neutral-500">{BRAND.domain}/</span><input className="input !py-2" value={f.slug} disabled={dis} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></div></div>
          </div>
        </section>

        {!isQuiz && (
        <section className={card}>
          <h2 className="font-serif text-xl font-bold">Declaração</h2>
          <textarea className="input mt-4" rows={7} value={f.message} disabled={dis} onChange={(e) => set("message", e.target.value)} maxLength={4000} placeholder="Escreva o que você sente…" />
          <p className="mt-1 text-right text-xs text-neutral-400">{f.message.length}/4000</p>
        </section>
        )}

        {isQuiz && (
          <section className={card}>
            <h2 className="font-serif text-xl font-bold">Quiz</h2>
            <label className="label mt-4">Prêmio</label>
            <input className="input" value={prize} disabled={dis} maxLength={120} onChange={(e) => setPrize(e.target.value)} placeholder="Ex: Um jantar romântico" />
            <p className="mt-4 text-sm font-semibold">Perguntas ({qs.length}) <span className="font-normal text-neutral-500">· de 3 a 10</span></p>
            <div className="mt-2 space-y-4">
              {qs.map((q, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-pink-100 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold"><span>Pergunta {i + 1}</span>{qs.length > 3 && !dis && <button type="button" className="text-xs font-semibold text-pink-600" onClick={() => setQs((s) => s.filter((_, j) => j !== i))}>Remover</button>}</div>
                  <input className="input" value={q.text} disabled={dis} maxLength={160} placeholder="Pergunta" onChange={(e) => setQs((s) => s.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)))} />
                  <input className="input !border-emerald-300" value={q.correct} disabled={dis} maxLength={100} placeholder="Resposta correta" onChange={(e) => setQs((s) => s.map((y, j) => (j === i ? { ...y, correct: e.target.value } : y)))} />
                  {q.wrong.map((w, k) => <input key={k} className="input !border-rose-200" value={w} disabled={dis} maxLength={100} placeholder={`Resposta errada ${k + 1}`} onChange={(e) => setQs((s) => s.map((y, j) => (j === i ? { ...y, wrong: y.wrong.map((z, m) => (m === k ? e.target.value : z)) } : y)))} />)}
                </div>
              ))}
            </div>
            {qs.length < 10 && !dis && <button type="button" className="btn btn-ghost mt-3 !py-2 text-sm" onClick={() => setQs((s) => [...s, { text: "", correct: "", wrong: ["", "", ""] }])}>+ Adicionar pergunta</button>}
            <label className="label mt-5">Acertos necessários: {Math.min(needed, qs.length)} de {qs.length}</label>
            <input type="range" min={1} max={qs.length} value={Math.min(needed, qs.length)} disabled={dis} onChange={(e) => setNeeded(+e.target.value)} className="w-full accent-pink-400" />
          </section>
        )}

        <section className={card}>
          <h2 className="font-serif text-xl font-bold">Tema de cores</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(Object.keys(THEMES) as ThemeId[]).map((k) => (
              <button key={k} type="button" disabled={dis} onClick={() => set("theme", k)} className={`rounded-2xl border-2 p-2 text-xs font-semibold ${f.theme === k ? "border-brand" : "border-transparent"}`}>
                <div className="mb-1 h-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${THEMES[k].sw} 0%, ${THEMES[k].accent} 100%)`, border: "1px solid #0001" }} />{THEMES[k].name}
              </button>
            ))}
          </div>
        </section>

        {!isQuiz && (
        <section className={card}>
          <h2 className="font-serif text-xl font-bold">Música</h2>
          <div className="mt-4">{!dis && <MusicSearch onPick={(url) => set("musicUrl", url)} />}</div>
          <input className="input mt-3" placeholder="Ou cole o link do Spotify ou do YouTube" value={f.musicUrl} disabled={dis} onChange={(e) => set("musicUrl", e.target.value)} />
          {f.musicUrl && !music && <p className="mt-2 text-sm text-brand-dark">Link não reconhecido. Use um link de música do Spotify ou de vídeo do YouTube.</p>}
          {music && <iframe title="Prévia" src={music.src} className="mt-4 w-full rounded-2xl" style={{ height: music.kind === "spotify" ? 152 : 240, border: 0 }} allow="encrypted-media" />}
        </section>
        )}

        {!isQuiz && (
        <section className={card}>
          <div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Fotos <span className="text-sm font-normal text-neutral-500">({photos.length})</span></h2>
            <button disabled={dis || busy} onClick={() => fileRef.current?.click()} className="btn btn-ghost !py-2 text-sm">+ Adicionar</button></div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          <p className="mt-1 text-sm text-neutral-500">Plano 1 Dia: até {PLANS.dia.maxPhotos} fotos · Plano Eterno: ilimitadas.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {photos.map((p, i) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border border-rose-100">
                <img src={p.url} alt="" className="h-40 w-full object-cover" />
                <div className="space-y-2 p-2">
                  <input className="input !py-1.5 text-sm" placeholder="Legenda (opcional)" value={p.caption} disabled={dis} onChange={(e) => setPhotos((s) => s.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))} />
                  <div className="flex justify-between text-xs"><span className="space-x-2"><button disabled={dis} onClick={() => move(i, -1)}>◀</button><button disabled={dis} onClick={() => move(i, 1)}>▶</button></span><button disabled={dis} onClick={() => removePhoto(p.id)} className="font-semibold text-brand-dark">Remover</button></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {!isQuiz && (
        <section className={card}>
          <h2 className="font-serif text-xl font-bold">Linha do tempo <span className="text-sm font-normal text-neutral-500">· Plano Eterno</span></h2>
          {page.plan === "eterno" ? (
            <>
              <ul className="mt-4 space-y-2">{timeline.map((e) => (<li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-rose-50 p-3 text-sm"><span className="flex items-start gap-3">{e.photo && <img src={e.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />}<span><b>{new Date(e.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</b> · {e.title}{e.text && <span className="block text-neutral-600">{e.text}</span>}</span></span><button onClick={() => delEvent(e.id)} className="text-brand-dark">✕</button></li>))}</ul>
              <div className="mt-4 grid gap-2 sm:grid-cols-[150px_1fr]"><input type="date" className="input" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} /><input className="input" placeholder="Título do momento" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></div>
              <textarea className="input mt-2" rows={2} placeholder="Conte um pouco (opcional)" value={ev.text} onChange={(e) => setEv({ ...ev, text: e.target.value })} />
              <input ref={evFileRef} type="file" accept="image/*" hidden onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => evFileRef.current?.click()} className="btn btn-ghost mt-2 !py-2 text-sm">{evFile ? `📷 ${evFile.name.slice(0, 24)}` : "📷 Foto do momento (opcional)"}</button>
              <button onClick={addEvent} disabled={!ev.date || !ev.title} className="btn btn-ghost ml-2 mt-2 !py-2 text-sm">+ Adicionar momento</button>
            </>
          ) : <p className="mt-2 text-sm text-neutral-500">Disponível ao publicar com o Plano Eterno. Depois de publicada, você adiciona os momentos aqui.</p>}
        </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <span className={`text-sm ${msg?.ok === false ? "text-brand-dark" : "text-emerald-600"}`}>{msg?.t}</span>
          <div className="flex gap-2">
            {fullEdit && <button disabled={busy} onClick={() => save()} className="btn btn-ghost !py-2 text-sm">Salvar</button>}
            {fullEdit && <button disabled={busy} onClick={async () => { if (await save(true)) router.push(`/preview/${page.id}`); }} className="btn btn-ghost !py-2 text-sm">Ver preview</button>}
            {!published && <button disabled={busy} onClick={async () => { if (await save(true)) router.push(`/dashboard/pricing?page=${page.id}`); }} className="btn btn-primary !py-2 text-sm">Publicar</button>}
            {published && <Link href={`/${page.slug}`} className="btn btn-primary !py-2 text-sm">Abrir página</Link>}
          </div>
        </div>
      </div>

      {plans && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPlans(false)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-2xl font-bold">Escolha o plano</h3>
            <p className="text-sm text-neutral-500">Pagamento único via PIX. Sua página entra no ar assim que o pagamento é confirmado.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(["dia", "eterno"] as const).map((id) => { const p = PLANS[id]; return (
                <div key={id} className={`rounded-2xl p-5 ring-1 ${id === "eterno" ? "bg-rose-50 ring-brand" : "ring-rose-100"}`}>
                  <p className="font-serif text-lg font-bold">{p.name}</p><p className="text-3xl font-bold">{brl(p.priceCents)}</p>
                  <ul className="mt-3 space-y-1 text-sm text-neutral-600">{p.features.map((x) => <li key={x}>✓ {x}</li>)}</ul>
                  <button disabled={busy} onClick={() => goPay(id)} className="btn btn-primary mt-4 w-full !py-2.5">{busy ? "Aguarde…" : "Pagar com PIX"}</button>
                </div>); })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
