/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PageData } from "../public/types";
import MusicSearch from "../MusicSearch";
import { STYLES, THEMES, THEME_ORDER, type KindId, type StyleId, type ThemeId } from "@/lib/plans";
import { musicEmbed } from "@/lib/util";
import { generateMessage } from "./messages";
import { Ico } from "./icons";
import type { Track } from "@/lib/spotify";

type Photo = { file: File; url: string; caption: string };
type Moment = { date: string; title: string; text: string; photo?: File; photoUrl?: string };
type Question = { text: string; correct: string; wrong: [string, string, string] };

const COPY: Record<KindId, { person: string; quizTitle: string; name: string; who: string; ph: string; shareAs: string; dateTitle: string; dateSub: string; dateHelp: string; msgTitle: string; msgSub: string; photosSub: string; musicSub: string; tlSub: string; titlePh: string }> = {
  amor: { person: "seu amor", quizTitle: "Quiz do Casal", name: "Nome do seu amor", who: "Maria", ph: "Ex: Maria", shareAs: "com amor", dateTitle: "Quando essa história começou?", dateSub: "A data que marca o início de tudo", dateHelp: "O contador mostrará quanto tempo vocês estão juntos", msgTitle: "Escreva sua declaração de amor", msgSub: "As palavras que vão emocionar quem você ama", photosSub: "Os momentos mais marcantes do seu amor", musicSub: "Busque no Spotify a trilha sonora do casal", tlSub: "Conte os momentos especiais da história de vocês", titlePh: "Ex: Para o amor da minha vida" },
  amizade: { person: "seu amigo(a)", quizTitle: "Quiz da Amizade", name: "Nome do seu amigo(a)", who: "Carlos", ph: "Ex: Carlos", shareAs: "com carinho", dateTitle: "Quando essa amizade começou?", dateSub: "A data que marca o início de tudo", dateHelp: "O contador mostrará quanto tempo vocês são amigos", msgTitle: "Escreva algo especial para o seu amigo(a)", msgSub: "As palavras que vão emocionar quem você ama", photosSub: "Os momentos mais marcantes da amizade", musicSub: "Busque no Spotify a trilha sonora da amizade", tlSub: "Conte os momentos especiais da amizade de vocês", titlePh: "Ex: Para o meu melhor amigo" },
  pai: { person: "seu pai", quizTitle: "Quiz do Pai", name: "Nome do seu pai", who: "Pai", ph: "Ex: Pai", shareAs: "com carinho", dateTitle: "Qual é a sua data de nascimento?", dateSub: "A data que marca o início de tudo", dateHelp: "O contador mostrará quanto tempo você é filho(a) dele", msgTitle: "Escreva algo especial para o seu pai", msgSub: "As palavras que vão emocionar quem você ama", photosSub: "Os momentos mais marcantes de vocês", musicSub: "Busque no Spotify a música que lembra vocês", tlSub: "Conte os momentos especiais da história de vocês", titlePh: "Ex: Para o melhor pai do mundo" },
};

const STEP_META: Record<string, { label: string; emoji: string }> = {
  estilo: { label: "Estilo", emoji: "✨" }, tema: { label: "Tema", emoji: "🎨" }, dados: { label: "Nome", emoji: "📝" }, data: { label: "Data", emoji: "📅" },
  mensagem: { label: "Mensagem", emoji: "💌" }, fotos: { label: "Fotos", emoji: "📸" }, musica: { label: "Música", emoji: "🎵" }, timeline: { label: "Timeline", emoji: "📖" },
  premio: { label: "Prêmio", emoji: "🎁" }, perguntas: { label: "Perguntas", emoji: "❓" }, regras: { label: "Quiz", emoji: "⚙️" }, conta: { label: "Conta", emoji: "🔒" },
};
const MESSAGES = ["🚀 Vamos começar!", "🚀 Vamos começar!", "✨ Ótimo começo!", "💫 Está ficando lindo!", "🎯 Metade do caminho!", "🎯 Metade do caminho!", "💪 Quase lá!", "🔥 Finalizando...", "🎉 Última etapa!"];

const HEARTS = [[6, 4], [92, 2], [14, 30], [48, 22], [72, 40], [4, 62], [58, 74], [86, 66], [30, 88], [94, 90], [22, 52], [64, 12]];

const maskDate = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const toIso = (v: string) => { const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return ""; const [, dd, mm, yy] = m; const d = new Date(+yy, +mm - 1, +dd); return d.getFullYear() === +yy && d.getMonth() === +mm - 1 && d.getDate() === +dd ? `${yy}-${mm}-${dd}` : ""; };

const field = "w-full rounded-2xl border border-pink-200/60 bg-pink-50/70 px-4 py-3.5 text-center text-[15px] text-[#1a1a2e] outline-none transition placeholder:text-[#6b6b80]/80 focus:border-pink-300 focus:ring-4 focus:ring-pink-200/60";
const fieldL = field.replace("text-center", "text-left");
const skipBtn = "flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200/70 bg-pink-50 py-3.5 text-sm font-medium text-pink-500 transition hover:bg-pink-100";

function Title({ t, s }: { t: string; s?: string }) {
  return (<div className="-mx-16 text-center max-sm:mx-0"><h1 className="mx-auto max-w-[596px] whitespace-nowrap font-serif text-[26px] font-bold leading-tight sm:text-[30px] max-sm:whitespace-normal">{t}</h1>{s && <p className="mt-2 text-[15px] text-[#6b6b80]">{s}</p>}</div>);
}

export default function Wizard({ kind, loggedIn, userName }: { kind: KindId; loggedIn: boolean; userName?: string }) {
  const router = useRouter();
  const c = COPY[kind];
  const [style, setStyle] = useState<StyleId>("classica");
  const [theme, setTheme] = useState<ThemeId>("rosa");
  const [f, setF] = useState({ title: "", recipient: "", dateText: "", message: "", musicUrl: "" });
  const [track, setTrack] = useState<Track | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [adding, setAdding] = useState(false);
  const [md, setMd] = useState<Moment>({ date: "", title: "", text: "" });
  const momentFile = useRef<HTMLInputElement>(null);
  const timelineIds = useRef<string[]>([]);
  const momentsDone = useRef(false);
  const [prize, setPrize] = useState("");
  const [needed, setNeeded] = useState(1);
  const [qs, setQs] = useState<Question[]>([0, 1, 2].map(() => ({ text: "", correct: "", wrong: ["", "", ""] })));
  const [acc, setAcc] = useState({ name: userName ?? "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [errState, setErrState] = useState<{ m: string; s: number } | null>(null);
  const [progress, setProgress] = useState<{ label: string; failed?: boolean } | null>(null);
  const [popular, setPopular] = useState<Track[] | null>(null);
  const [showPopular, setShowPopular] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createdId = useRef<string | null>(null);

  const steps = useMemo(() => [...(style === "quiz" ? ["estilo", "tema", "dados", "data", "premio", "perguntas", "regras"] : ["estilo", "tema", "dados", "data", "mensagem", "fotos", "musica", "timeline"]), ...(loggedIn ? [] : ["conta"])], [style, loggedIn]);
  const cur = steps[step];
  // a mensagem de erro só vale para a etapa em que foi gerada
  const error = errState && errState.s === step ? errState.m : "";
  const setError = (m: string) => setErrState({ m, s: step });
  const last = steps.length - 1;
  const pct = Math.round((step / last) * 100);
  const msg = MESSAGES[Math.min(8, Math.round((step / last) * 8))];
  const iso = toIso(f.dateText);
  const music = musicEmbed(f.musicUrl);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const preview: PageData = useMemo(() => ({
    slug: "preview", kind, style, title: f.title || "Título da página", recipient: f.recipient, plan: "eterno",
    startDate: iso ? new Date(iso + "T00:00:00").toISOString() : new Date().toISOString(),
    message: f.message, theme, musicUrl: f.musicUrl, quizPrize: prize, quizNeeded: Math.min(needed, qs.length), senderName: (acc.name || userName || "").split(" ")[0],
    quiz: qs.map((q, i) => ({ id: String(i), text: q.text, correct: q.correct, wrong: [...q.wrong] })),
    photos: photos.map((p, i) => ({ id: String(i), url: p.url, caption: p.caption })),
    timeline: moments.map((m, i) => ({ id: String(i), date: new Date(toIso(m.date) + "T00:00:00").toISOString(), title: m.title, text: m.text, photo: m.photoUrl ?? null })),
    guestbook: [],
  }), [kind, style, f, iso, theme, photos, moments, prize, needed, qs, acc.name, userName]);

  function validate(): string {
    switch (cur) {
      case "dados": return f.title.trim().length < 2 ? "Dê um título à sua página" : f.recipient.trim().length < 1 ? "Informe o nome" : "";
      case "data": { if (!iso) return "Digite uma data válida (DD/MM/AAAA)"; return new Date(iso + "T00:00:00").getTime() > Date.now() ? "A data não pode estar no futuro" : ""; }
      case "mensagem": return f.message.trim().length < 3 ? "Escreva sua mensagem" : "";
      case "musica": return f.musicUrl && !music ? "Link inválido. Use um link do Spotify ou do YouTube." : "";
      case "premio": return !prize.trim() ? "Defina o prêmio do quiz" : "";
      case "perguntas": return qs.some((q) => !q.text.trim() || !q.correct.trim() || q.wrong.some((w) => !w.trim())) ? "Preencha todas as perguntas e respostas" : "";
      case "conta":
        if (hasAccount) return !acc.email || !acc.password ? "Informe e-mail e senha" : "";
        if (acc.name.trim().length < 2) return "Como podemos te chamar?";
        if (!/^\S+@\S+\.\S+$/.test(acc.email)) return "Esse e-mail não parece válido";
        if (acc.phone.replace(/\D/g, "").length < 10) return "Número incompleto";
        if (acc.password.length < 6) return "A senha precisa ter ao menos 6 caracteres";
        return "";
    }
    return "";
  }
  const valid = !validate();

  async function next() {
    const e = validate();
    if (e) return setError(e);
    if (cur === "conta" || (loggedIn && step === last)) return submit();
    setStep((s) => s + 1);
  }

  async function submit() {
    setProgress({ label: "Preparando a sua página…" });
    try {
      if (hasAccount) {
        const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: acc.email, password: acc.password }) });
        if (!r.ok) throw new Error((await r.json()).error);
      }
      if (!createdId.current) {
        const body = {
          kind, style, title: f.title, recipient: f.recipient, startDate: iso, message: f.message, musicUrl: f.musicUrl, theme,
          timeline: moments.map((m) => ({ date: toIso(m.date), title: m.title, text: m.text })), quiz: style === "quiz" ? { prize, needed: Math.min(needed, qs.length), questions: qs } : undefined,
          account: loggedIn || hasAccount ? undefined : { name: acc.name, email: acc.email, phone: acc.phone, password: acc.password },
        };
        const r = await fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        createdId.current = d.id;
        timelineIds.current = d.timelineIds ?? [];
      }
      await uploadPhotos(createdId.current!);
    } catch (e) { setProgress(null); setError((e as Error).message); }
  }

  async function uploadMomentPhotos(id: string) {
    if (momentsDone.current) return;
    for (let i = 0; i < moments.length; i++) {
      const m = moments[i], tid = timelineIds.current[i];
      if (!m.photo || !tid) continue;
      const fd = new FormData(); fd.append("file", m.photo);
      const response = await fetch(`/api/pages/${id}/timeline/${tid}/photo`, { method: "POST", body: fd });
      if (!response.ok) throw new Error("Não foi possível enviar a foto do momento. Use uma imagem de até 4 MB e tente novamente.");
    }
    momentsDone.current = true;
  }

  async function uploadPhotos(id: string) {
    await uploadMomentPhotos(id);
    if (photos.length) {
      setProgress({ label: "Guardando os seus momentos…" });
      const caps: Record<string, string> = {};
      for (const p of photos) {
        const fd = new FormData(); fd.append("files", p.file);
        const r = await fetch(`/api/pages/${id}/photos`, { method: "POST", body: fd });
        if (!r.ok) { setProgress({ label: "Não foi possível enviar uma das fotos.", failed: true }); return; }
        const d = await r.json(); caps[d.photos[0].id] = p.caption;
      }
      if (Object.values(caps).some(Boolean)) await fetch(`/api/pages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ captions: caps }) });
    }
    router.push(`/dashboard/pricing?page=${id}`);
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const add = [...list].filter((x) => x.type.startsWith("image/")).slice(0, 10 - photos.length);
    if (add.some((x) => x.size > 4 * 1024 * 1024)) return setError("Cada foto pode ter no máximo 4 MB");
    setPhotos((s) => [...s, ...add.map((file) => ({ file, url: URL.createObjectURL(file), caption: "" }))]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function togglePopular() {
    setShowPopular((v) => !v);
    if (popular) return;
    const r = await fetch("/api/spotify/search?q=" + encodeURIComponent("músicas românticas")).then((x) => x.json()).catch(() => null);
    setPopular(r?.tracks ?? []);
  }


  if (progress) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <Ico n="heart" className="beat mx-auto h-16 w-16 text-pink-400" fill />
          <h1 className="mt-5 font-serif text-2xl font-bold">{progress.failed ? "Ops!" : "Criando a sua página"}</h1>
          <p className="mt-2 text-[#6b6b80]">{progress.label}</p>
          {progress.failed && (<div className="mt-5 flex flex-wrap justify-center gap-2"><button className="btn btn-primary" onClick={() => uploadPhotos(createdId.current!)}>Tentar enviar de novo</button><button className="btn btn-ghost" onClick={() => router.push(`/dashboard/pricing?page=${createdId.current}`)}>Continuar mesmo assim</button></div>)}
        </div>
      </main>
    );
  }

  const isLast = step === last;
  const showMilestones = step >= 4;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "linear-gradient(180deg,#fffbfc 0%,#fff5f9 60%,#fffbfc 100%)" }}>
      {HEARTS.map(([x, y], i) => (<Ico key={i} n="heart" fill className="drift pointer-events-none absolute h-3.5 w-3.5" style={{ left: `${x}%`, top: `${y}%`, color: i % 5 === 0 ? "#f472b6" : "#d9d9df", opacity: 0.55, animationDelay: `${i * 0.9}s` }} />))}

      {/* topo: progresso */}
      <div className="relative mx-auto w-full max-w-[480px] px-4 pt-11">
        <div className="flex items-center justify-between text-sm"><span className="text-[#4b4b60]">{msg}</span><span className="font-semibold text-pink-400">{pct}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-pink-50"><div className="wz-bar h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 flex justify-between px-0.5">
          {steps.map((s, i) => (<span key={s} className={`block rounded-full transition-all ${i < step ? "h-1.5 w-1.5 bg-pink-400" : i === step ? "h-2.5 w-2.5 -translate-y-[2px] bg-pink-400" : "h-1.5 w-1.5 bg-[#d9d9e0]"}`} />))}
        </div>
        {showMilestones && (<div className="mt-3 flex justify-center gap-4 text-xs text-[#9b9bb0]">{["Fotos", "Música", "Timeline"].map((m) => (<span key={m} className="flex items-center gap-1"><Ico n="trophy" className="h-3 w-3" />{m}</span>))}</div>)}
      </div>

      <div className="relative mx-auto grid w-full max-w-[1024px] gap-6 px-4 lg:grid-cols-[596px_1fr] lg:gap-0 lg:px-0">
        {/* coluna do passo */}
        <div className="flex min-h-[calc(100vh-190px)] flex-col">
          <div className="flex flex-1 items-center justify-center py-8">
            <div key={cur} className="wz-in w-full max-w-[448px]">
              {cur === "estilo" && (<>
                <Title t="Escolha o estilo do presente" s="Como você quer surpreender quem você ama?" />
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {(Object.keys(STYLES) as StyleId[]).map((k) => {
                    const sel = style === k;
                    const icon = k === "classica" ? <Ico n="heart" fill className="h-5 w-5 text-pink-400" /> : k === "carta" ? <Ico n="mail" className="h-5 w-5 text-pink-400" /> : k === "interativa" ? <span className="text-lg">✉️</span> : <Ico n="trophy" className="h-5 w-5 text-pink-400" />;
                    return (
                      <button key={k} onClick={() => setStyle(k)} className={`relative rounded-2xl border-2 p-3.5 text-left transition ${sel ? "border-pink-400 bg-pink-50 shadow-[0_6px_18px_-6px_rgba(244,114,182,.5)]" : "border-pink-100 bg-white/60 hover:border-pink-200"} ${k === "quiz" ? "col-span-1" : ""}`}>
                        {STYLES[k].eterno && <span className="absolute -top-2 left-2 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-px text-[8px] font-bold text-amber-700">PLANO ETERNO</span>}
                        {sel && <Ico n="check" className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-pink-400" />}
                        <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-pink-50">{icon}</span>
                        <p className="text-sm font-semibold">{STYLES[k].name === "Clássica" ? "Classica" : STYLES[k].name}</p>
                        <p className="mt-0.5 text-xs leading-snug text-[#6b6b80]">{STYLES[k].desc}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-8 text-center text-sm text-[#6b6b80]">Você pode visualizar o resultado ao lado enquanto personaliza</p>
              </>)}

              {cur === "tema" && (<>
                <Title t="Escolha o tema da página" s="As cores que combinam com vocês" />
                <div className="mt-6 flex flex-col items-center text-pink-300"><Ico n="palette" className="h-10 w-10" /><p className="mt-2 text-xs text-[#6b6b80]">Escolha um tema</p></div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {THEME_ORDER.map((k) => {
                    const T = THEMES[k]; const sel = theme === k;
                    return (
                      <button key={k} onClick={() => setTheme(k)} className={`relative h-28 overflow-hidden rounded-2xl text-left transition ${sel ? "ring-2 ring-pink-400 ring-offset-2 ring-offset-[#fffbfc]" : ""}`} style={{ background: T.bg }}>
                        <Ico n="heart" fill className="absolute left-1/2 top-[38%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                        {sel && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-pink-400 text-white"><Ico n="check" className="h-3 w-3" /></span>}
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-2.5 py-1.5 text-[11px] font-medium text-white">{T.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>)}

              {cur === "dados" && (<>
                <Title t="Vamos criar seu presente!" s="Dê um título para a página especial" />
                <div className="mt-8 space-y-1">
                  <label className="text-sm font-medium">Título da página</label>
                  <input autoFocus className={field} placeholder={c.titlePh} value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} />
                  <p className="pt-1 text-center text-xs text-[#6b6b80]">Este título aparecerá no topo da sua página</p>
                </div>
                <div className="mt-5 space-y-1">
                  <label className="text-sm font-medium">{c.name}</label>
                  <input className={field} placeholder={c.ph} value={f.recipient} maxLength={60} onChange={(e) => set("recipient", e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()} />
                  <p className="pt-1 text-center text-xs text-[#6b6b80]">Usamos esse nome quando a surpresa for compartilhada: “Para {f.recipient || c.who}, {c.shareAs}”</p>
                </div>
                <div className="mt-6 flex gap-3 rounded-2xl border border-pink-200/60 bg-pink-50/70 p-4 text-xs leading-relaxed text-[#6b6b80]"><Ico n="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" /><p>O link da sua página é criado automaticamente — você não precisa se preocupar com isso. Ele estará disponível no final, pronto para compartilhar.</p></div>
              </>)}

              {cur === "data" && (<>
                <Title t={c.dateTitle} s={c.dateSub} />
                <div className="mt-8 flex justify-center"><input autoFocus inputMode="numeric" className={`${field} !w-52 !border-pink-300`} placeholder="DD/MM/AAAA" value={f.dateText} onChange={(e) => set("dateText", maskDate(e.target.value))} onKeyDown={(e) => e.key === "Enter" && next()} /></div>
                <p className="mt-3 text-center text-xs text-[#6b6b80]">{c.dateHelp}</p>
              </>)}

              {cur === "mensagem" && (<>
                <Title t={c.msgTitle} s={c.msgSub} />
                <button type="button" onClick={() => set("message", generateMessage(kind, f.recipient, f.message))} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-white shadow-lg shadow-pink-300/40 transition hover:brightness-105" style={{ background: "linear-gradient(90deg,#f72585,#b14cf7)" }}><Ico n="sparkles" className="h-4 w-4" />{f.message ? "Gerar outra declaração" : "Gerar declaração automática"}</button>
                <div className="relative my-3 text-center"><span className="relative bg-[#fffaf9] px-2 text-xs text-[#6b6b80]">ou escreva manualmente</span></div>
                <textarea autoFocus rows={f.message ? 6 : 2} className={`${fieldL} resize-none`} maxLength={4000} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="Escreva aqui tudo o que você sente..." />
                <p className="mt-2 text-right text-xs text-[#6b6b80]">{f.message.length} caracteres</p>
              </>)}

              {cur === "fotos" && (<>
                <Title t="Adicione fotos especiais" s={c.photosSub} />
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                <div className="mt-8 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-medium"><Ico n="image-plus" className="h-4 w-4 text-pink-400" />Fotos</span><span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs text-[#6b6b80]">{photos.length}/10</span></div>
                <button onClick={() => fileRef.current?.click()} disabled={photos.length >= 10} className="mt-3 flex h-36 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#d9d9e0] text-center transition hover:border-pink-300 hover:bg-pink-50/40"><Ico n="upload" className="h-7 w-7 text-[#6b6b80]" /><span className="mt-2 text-sm font-semibold">Adicionar fotos</span><span className="text-xs text-[#6b6b80]">Até 10 fotos (opcional)</span></button>
                {photos.length > 0 && (<div className="mt-4 grid grid-cols-2 gap-3">{photos.map((p, i) => (<div key={p.url} className="overflow-hidden rounded-2xl border border-pink-100 bg-white">{ }<img src={p.url} alt="" className="h-28 w-full object-cover" /><div className="space-y-1 p-2"><input className="w-full rounded-lg border border-pink-100 bg-pink-50/60 px-2 py-1.5 text-xs outline-none" placeholder="Legenda (opcional)" value={p.caption} onChange={(e) => setPhotos((s) => s.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} /><button className="text-xs font-semibold text-pink-500" onClick={() => setPhotos((s) => s.filter((_, j) => j !== i))}>Remover</button></div></div>))}</div>)}
                {photos.length === 0 && <button onClick={() => setStep((s) => s + 1)} className={`${skipBtn} mt-4`}><Ico n="arrow-right" className="h-3.5 w-3.5" />Pular — continuar sem fotos</button>}
              </>)}

              {cur === "musica" && (<>
                <Title t="A música de vocês" s={c.musicSub} />
                <div className="mt-6 flex justify-center text-pink-300"><Ico n="music" className="h-10 w-10" /></div>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium"><Ico n="music" className="h-3.5 w-3.5 text-pink-400" />Buscar no Spotify</p>
                <div className="mt-2"><MusicSearch onPick={(url, t) => { set("musicUrl", url); setTrack(t); }} /></div>
                <div className="relative my-4 text-center"><span className="absolute inset-x-0 top-1/2 h-px bg-pink-100" /><span className="relative bg-[#fffaf9] px-2 text-xs text-[#6b6b80]">ou cole um link</span></div>
                <input className={field} placeholder="Cole um link do YouTube ou Spotify..." value={f.musicUrl} onChange={(e) => { set("musicUrl", e.target.value); setTrack(null); }} />
                {f.musicUrl && !music && <p className="mt-2 text-center text-sm text-pink-600">Link inválido</p>}
                {music && <div className="mt-3">{track && <p className="mb-2 text-center text-sm text-pink-500">Música selecionada: {track.name} — {track.artists}</p>}<iframe title="Prévia" src={music.src} className="w-full rounded-2xl" style={{ height: music.kind === "spotify" ? 152 : 220, border: 0 }} allow="encrypted-media" /></div>}
                <button onClick={togglePopular} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-100 bg-pink-50/50 py-3 text-xs text-[#6b6b80]"><Ico n="sparkles" className="h-3.5 w-3.5" />{showPopular ? "Ocultar sugestões" : "Ver músicas populares"}<Ico n="chevron" className={`h-3.5 w-3.5 transition ${showPopular ? "rotate-180" : ""}`} /></button>
                {showPopular && (<ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-pink-100 bg-white p-1">{(popular ?? []).map((t) => (<li key={t.id}><button onClick={() => { set("musicUrl", t.url); setTrack(t); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-pink-50">{ }{t.image && <img src={t.image} alt="" className="h-10 w-10 rounded-lg" />}<span className="min-w-0"><span className="block truncate text-sm font-semibold">{t.name}</span><span className="block truncate text-xs text-[#6b6b80]">{t.artists}</span></span></button></li>))}{popular === null && <li className="p-3 text-center text-xs text-[#6b6b80]">Carregando…</li>}</ul>)}
                {!f.musicUrl && <button onClick={() => setStep((s) => s + 1)} className={`${skipBtn} mt-3`}><Ico n="arrow-right" className="h-3.5 w-3.5" />Pular — continuar sem música</button>}
              </>)}

              {cur === "timeline" && (<>
                <Title t="Linha do Tempo" s={c.tlSub} />
                <div className="mt-6 flex justify-center text-pink-300"><Ico n="calendar" className="h-10 w-10" /></div>
                <p className="mt-3 text-center text-sm text-[#6b6b80]">Adicione momentos especiais da história de vocês (opcional)</p>
                <ul className="mt-4 space-y-2">{moments.map((m, i) => (<li key={i} className="flex items-start justify-between gap-2 rounded-2xl border border-pink-100 bg-pink-50/60 p-3 text-sm"><span className="flex items-start gap-3">{m.photoUrl &&   <img src={m.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}<span><b>{m.date}</b> · {m.title}{m.text && <span className="block text-xs text-[#6b6b80]">{m.text}</span>}</span></span><button onClick={() => setMoments((s) => s.filter((_, j) => j !== i))} className="text-[#6b6b80]">✕</button></li>))}</ul>
                {adding ? (
                  <div className="mt-4 space-y-2 rounded-2xl border border-pink-100 bg-white/70 p-4">
                    <input className={fieldL} placeholder="Ex: Nosso primeiro beijo" value={md.title} onChange={(e) => setMd({ ...md, title: e.target.value })} />
                    <input inputMode="numeric" className={fieldL} placeholder="DD/MM/AAAA" value={md.date} onChange={(e) => setMd({ ...md, date: maskDate(e.target.value) })} />
                    <textarea className={`${fieldL} resize-none`} rows={2} placeholder="Conte mais sobre esse momento... (opcional)" value={md.text} onChange={(e) => setMd({ ...md, text: e.target.value })} />
                    <input ref={momentFile} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 4 * 1024 * 1024) { setError("Cada foto pode ter no máximo 4 MB"); return; } if (f) setMd((s) => ({ ...s, photo: f, photoUrl: URL.createObjectURL(f) })); }} />
                    <button type="button" onClick={() => momentFile.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-pink-200 bg-white/60 px-4 py-3 text-left text-sm text-[#6b6b80] transition hover:border-pink-300">
                      {md.photoUrl ? <>{ }<img src={md.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /><span>Trocar foto do momento</span></> : <><Ico n="image-plus" className="h-4 w-4 text-pink-400" /><span>Foto do momento (opcional)</span></>}
                    </button>
                    <div className="flex gap-2"><button className={skipBtn} onClick={() => setAdding(false)}>Cancelar</button><button disabled={!md.title.trim() || !toIso(md.date)} className="btn btn-primary w-full !py-3 text-sm" onClick={() => { setMoments((s) => [...s, md].sort((a, b) => toIso(a.date).localeCompare(toIso(b.date)))); setMd({ date: "", title: "", text: "" }); setAdding(false); }}>Adicionar</button></div>
                  </div>
                ) : (
                  <button onClick={() => setAdding(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-[#d9d9e0] py-3.5 text-sm text-[#4b4b60] transition hover:border-pink-300"><Ico n="plus" className="h-4 w-4" />{moments.length ? "Adicionar momento" : "Adicionar primeiro momento"}</button>
                )}
                {moments.length === 0 && !adding && <button onClick={() => setStep((s) => s + 1)} className={`${skipBtn} mt-3`}><Ico n="arrow-right" className="h-3.5 w-3.5" />Pular — adicionar depois</button>}
              </>)}

              {cur === "premio" && (<>
                <Title t="Defina o prêmio do quiz" s={`O que ${c.person} vai ganhar ao acertar?`} />
                <div className="mt-6 flex justify-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-pink-100"><Ico n="gift" className="h-7 w-7 text-pink-400" /></span></div>
                <h2 className="mt-3 text-center text-lg font-semibold">Qual será o prêmio?</h2>
                <p className="mt-1 text-center text-sm text-[#6b6b80]">Defina o que {c.person} vai ganhar se acertar o quiz</p>
                <label className="mt-6 block text-sm font-medium">O prêmio</label>
                <input autoFocus className={`${fieldL} mt-1`} placeholder="Ex: Um jantar romântico, Uma massagem relaxante, Um dia de spa..." value={prize} maxLength={120} onChange={(e) => { setPrize(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && next()} />
                <div className="mt-4 grid grid-cols-2 gap-2">{["Um jantar romântico", "Uma massagem", "Um dia de folga", "Um presente surpresa"].map((x) => <button key={x} type="button" className={`rounded-full border px-3 py-2 text-xs transition ${prize === x ? "border-pink-400 bg-pink-50 text-pink-600" : "border-pink-100 bg-white/60 text-[#6b6b80] hover:border-pink-300"}`} onClick={() => { setPrize(x); setError(""); }}>{x}</button>)}</div>
              </>)}

              {cur === "perguntas" && (<>
                <Title t="Monte as perguntas" s={`Quanto ${c.person} conhece vocês?`} />
                <div className="mt-6 flex justify-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-pink-100"><Ico n="target" className="h-7 w-7 text-pink-400" /></span></div>
                <h2 className="mt-3 text-center text-lg font-semibold">Crie as perguntas</h2>
                <p className="mt-1 text-center text-sm text-[#6b6b80]">Adicione de 3 a 10 perguntas sobre vocês</p>
                <div className="mt-6 space-y-4">
                  {qs.map((x, i) => (
                    <div key={i} className="rounded-2xl border border-pink-200/60 bg-white/70 p-4">
                      <div className="flex items-start gap-3">
                        <span className="pt-1 text-[#c9c9d4]"><Ico n="grip" className="h-4 w-4" /></span>
                        <span className="pt-0.5 text-sm font-semibold text-[#6b6b80]">{i + 1}.</span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between"><span className="text-sm font-medium text-[#6b6b80]">Pergunta</span>{qs.length > 3 && <button type="button" aria-label="Remover pergunta" className="text-[#9b9bb0] hover:text-pink-500" onClick={() => setQs((s) => s.filter((_, j) => j !== i))}><Ico n="x" className="h-4 w-4" /></button>}</div>
                          <input className={fieldL} placeholder="Ex: Onde foi nosso primeiro encontro?" value={x.text} maxLength={160} onChange={(e) => { setQs((s) => s.map((y, j) => (j === i ? { ...y, text: e.target.value } : y))); setError(""); }} />
                          <p className="flex items-center gap-1.5 pt-1 text-sm font-medium text-emerald-500"><Ico n="check-circle" className="h-4 w-4" />Resposta Correta</p>
                          <input className={`${fieldL} !border-emerald-300 focus:!border-emerald-400 focus:!ring-emerald-100`} placeholder="A resposta certa" value={x.correct} maxLength={100} onChange={(e) => { setQs((s) => s.map((y, j) => (j === i ? { ...y, correct: e.target.value } : y))); setError(""); }} />
                          <p className="flex items-center gap-1.5 pt-1 text-sm font-medium text-rose-400"><Ico n="x-circle" className="h-4 w-4" />Respostas Erradas (3)</p>
                          {x.wrong.map((w, k) => <input key={k} className={`${fieldL} !border-rose-200 focus:!border-rose-300 focus:!ring-rose-100`} placeholder={`Resposta errada ${k + 1}`} value={w} maxLength={100} onChange={(e) => { setQs((s) => s.map((y, j) => (j === i ? { ...y, wrong: y.wrong.map((z, m) => (m === k ? e.target.value : z)) as [string, string, string] } : y))); setError(""); }} />)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {qs.length < 10 && <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-[#d9d9e0] py-3.5 text-sm text-[#4b4b60] transition hover:border-pink-300" onClick={() => setQs((s) => [...s, { text: "", correct: "", wrong: ["", "", ""] }])}><Ico n="plus" className="h-4 w-4" />Adicionar pergunta</button>}
              </>)}

              {cur === "regras" && (<>
                <Title t="Configurações do Quiz" s={`Defina quantas perguntas ${c.person} precisa acertar`} />
                <div className="mt-6 flex justify-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-pink-100"><Ico n="trophy" className="h-7 w-7 text-pink-400" /></span></div>
                <h2 className="mt-3 text-center text-lg font-semibold">Regras do Quiz</h2>
                <p className="mt-1 text-center text-sm text-[#6b6b80]">Quantas perguntas precisam ser acertadas para ganhar?</p>
                <div className="mt-6 rounded-3xl border border-pink-200/60 bg-white/70 p-6 text-center">
                  <p className="text-5xl font-bold text-pink-400">{Math.min(needed, qs.length)}</p>
                  <p className="text-sm text-[#6b6b80]">de {qs.length} perguntas</p>
                  <input type="range" min={1} max={qs.length} value={Math.min(needed, qs.length)} onChange={(e) => setNeeded(+e.target.value)} className="mt-5 w-full accent-pink-400" aria-label="Acertos necessários" />
                  <div className="mt-1 flex justify-between text-xs text-[#6b6b80]"><span>Mais fácil (1)</span><span>Mais difícil ({qs.length})</span></div>
                </div>
                <p className="mt-5 rounded-2xl border border-pink-200/60 bg-pink-50/70 p-4 text-center text-sm">{c.person.charAt(0).toUpperCase() + c.person.slice(1)} precisa acertar <b className="text-pink-500">{Math.min(needed, qs.length)} de {qs.length}</b> perguntas para ganhar o prêmio!</p>
              </>)}

              {cur === "conta" && (<>
                <Title t="Último passo!" s="Crie sua conta para salvar e enviar o presente" />
                <div className="mt-6 flex justify-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-pink-100"><Ico n="heart" fill className="h-6 w-6 text-pink-400" /></span></div>
                <p className="mt-3 text-center text-sm text-[#4b4b60]">{hasAccount ? "Entre com a sua conta para continuar" : "Quase lá! Salve sua página criando uma conta"}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {!hasAccount && <input className={fieldL} placeholder="Seu nome" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} autoComplete="name" />}
                  <input type="email" className={`${fieldL} ${hasAccount ? "col-span-2" : ""}`} placeholder="seu@email.com" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} autoComplete="email" />
                  {!hasAccount && <input className={fieldL} inputMode="tel" placeholder="(11) 99999-9999" value={acc.phone} onChange={(e) => setAcc({ ...acc, phone: e.target.value })} autoComplete="tel" />}
                  <div className={`relative ${hasAccount ? "col-span-2" : ""}`}><input type={showPw ? "text" : "password"} className={`${fieldL} pr-11`} placeholder="Senha (mín. 6 caracteres)" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && next()} autoComplete={hasAccount ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b80]"><Ico n="eye" className="h-4 w-4" /></button></div>
                </div>
                <p className="mt-5 text-center text-xs text-[#6b6b80]">{hasAccount ? "Ainda não tem conta?" : "Já tem conta?"} <button className="font-medium text-pink-500" onClick={() => { setHasAccount(!hasAccount); setError(""); }}>{hasAccount ? "Criar conta" : "Fazer login"}</button></p>
                <p className="mt-2 text-center text-[11px] text-[#9b9bb0]">Ao continuar você aceita os <Link className="underline" href="/termos">Termos</Link> e a <Link className="underline" href="/privacidade">Privacidade</Link>.</p>
              </>)}

              {error && <p className="mt-5 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-center text-sm text-pink-700">{error}</p>}
            </div>
          </div>

          {/* barra inferior */}
          <div className="flex items-center justify-between border-t border-pink-100 py-4">
            {step === 0 ? (
              <Link href="/" className="flex items-center gap-2 px-3 text-sm font-medium"><Ico n="arrow-left" className="h-4 w-4" />Cancelar</Link>
            ) : (
              <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 px-3 text-sm font-medium"><Ico n="arrow-left" className="h-4 w-4" />Voltar</button>
            )}
            <span className="text-sm text-[#6b6b80]"><span className="mr-1">{STEP_META[cur].emoji}</span>{STEP_META[cur].label}</span>
            <button onClick={next} className={`flex items-center gap-2 rounded-xl bg-pink-400 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(244,114,182,.9)] transition hover:bg-pink-500 ${valid ? "" : "opacity-50"}`}>
              {isLast ? <><Ico n="check" className="h-4 w-4" />{cur === "conta" ? "Criar Pagina" : "Criar Página"}</> : <>Continuar<Ico n="arrow-right" className="h-4 w-4" /></>}
            </button>
          </div>
        </div>

        {/* prévia */}
        <aside className="hidden lg:block lg:pl-6">
          <div className="sticky top-6 pt-8">
            <p className="mb-4 flex items-center justify-center gap-2 text-sm text-[#6b6b80]"><Ico n="eye" className="h-4 w-4" />Preview em tempo real</p>
            <Phone><PreviewFrame data={preview} /></Phone>
          </div>
        </aside>
      </div>

      <button onClick={() => setShowPreview(true)} className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-pink-500 shadow-lg ring-1 ring-pink-100 lg:hidden"><Ico n="eye" className="h-4 w-4" />Preview</button>
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 lg:hidden" onClick={() => setShowPreview(false)}>
          <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}><Phone><PreviewFrame data={preview} /></Phone><button className="btn btn-primary" onClick={() => setShowPreview(false)}>Fechar preview</button></div>
        </div>
      )}
    </div>
  );
}

function PreviewFrame({ data }: { data: PageData }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const send = () => ref.current?.contentWindow?.postMessage({ type: "dy-preview", data }, window.location.origin);
  useEffect(() => { send(); const on = (e: MessageEvent) => { if (e.data?.type === "dy-preview-ready") send(); }; window.addEventListener("message", on); return () => window.removeEventListener("message", on); });
  return <iframe ref={ref} title="Preview em tempo real" src="/preview-embed" onLoad={send} style={{ width: 390, height: 852, border: 0, transform: "scale(0.682)", transformOrigin: "top left" }} />;
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.7rem] border-[7px] border-[#1c1c1e] bg-white shadow-[0_30px_60px_-20px_rgba(26,26,46,.45)]">
      <div className="absolute left-1/2 top-2 z-10 flex h-6 w-20 -translate-x-1/2 items-center gap-2 rounded-full bg-black px-2.5"><span className="h-2 w-2 rounded-full bg-[#2a2a2e]" /><span className="h-1.5 w-1.5 rounded-full bg-[#1e1e22]" /></div>
      <div className="no-scrollbar h-[581px] overflow-y-auto overflow-x-hidden rounded-[2rem]">{children}</div>
    </div>
  );
}
