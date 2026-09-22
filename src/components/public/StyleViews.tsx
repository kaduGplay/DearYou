"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import icons from "./icons.json";
import type { PageData } from "./types";
import { diff } from "../Counter";
import { heartBurst, injectFx } from "@/lib/fx";

/** Cores e estilos do tema, calculados pela página pública e repassados às telas de cada estilo. */
export type Tk = {
  acc: string; accDark: string; aa: (o: number) => string; txt: string; tx: (o: number) => string;
  card: React.CSSProperties; serif: React.CSSProperties; bg: string; dark: boolean;
};

const ext = icons as Record<string, string>;
function Ico({ n, className = "", style, fill }: { n: string; className?: string; style?: React.CSSProperties; fill?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden dangerouslySetInnerHTML={{ __html: ext[n] ?? EXTRA[n] ?? "" }} />;
}
const EXTRA: Record<string, string> = {
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  feather: '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  "x-circle": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
};

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const WORD: Record<string, string> = { amor: "juntos", amizade: "de amizade", pai: "de carinho" };
const CLOSING: Record<string, string> = { amor: "Com todo meu amor,", amizade: "Com todo meu carinho,", pai: "Com todo meu carinho," };
const QUIZ_TITLE: Record<string, string> = { amor: "Quiz do Casal", amizade: "Quiz da Amizade", pai: "Quiz do Pai" };
/** "Querido(a) Maria," — para o pai vira "Querido Pai,". */
export const salutation = (kind: string, name: string) => (name ? `${kind === "pai" ? "Querido" : "Querido(a)"} ${name},` : kind === "pai" ? "Querido," : "Querido(a),");

/** "5 anos, 4 meses, 7 dias" — depende do horário atual (now), para não usar Date.now() na renderização. */
export function humanSince(startIso: string, now: Date | null, kind: string) {
  const s = new Date(startIso);
  if (!now || isNaN(s.getTime()) || s.getTime() > now.getTime() - 60_000) return "";
  const d = diff(s, now);
  const parts = [d.y > 0 ? pl(d.y, "ano", "anos") : "", d.y > 0 || d.m > 0 ? pl(d.m, "mês", "meses") : "", pl(d.d, "dia", "dias")].filter(Boolean);
  return `${parts.join(", ")} ${WORD[kind] ?? "juntos"}`;
}

const fmtLong = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Brand({ tk, tag }: { tk: Tk; tag?: string }) {
  return (
    <div className="text-center">
      <Link href="/" className="inline-flex items-center gap-1.5"><Ico n="heart" className="h-3.5 w-3.5" style={{ color: tk.acc }} fill={tk.acc} /><span className="text-sm font-bold" style={tk.serif}>DearYou</span></Link>
      {tag && <p className="mt-0.5 text-[10px]" style={{ color: tk.tx(0.35) }}>{tag}</p>}
    </div>
  );
}

/* ───────────────────────── CARTA DE AMOR ───────────────────────── */

export function LetterHero({ data, tk, now }: { data: PageData; tk: Tk; now: Date | null }) {
  const since = humanSince(data.startDate, now, data.kind);
  const corner = (pos: string): React.CSSProperties => ({ position: "absolute", width: 22, height: 22, borderColor: tk.aa(0.35), borderStyle: "solid", borderWidth: 0, ...(pos.includes("t") ? { top: 10, borderTopWidth: 1.5 } : { bottom: 10, borderBottomWidth: 1.5 }), ...(pos.includes("l") ? { left: 10, borderLeftWidth: 1.5 } : { right: 10, borderRightWidth: 1.5 }), borderRadius: 8 });
  const paper = tk.dark ? "rgba(255,255,255,0.07)" : "linear-gradient(180deg,#fffefb 0%,#fff9f2 100%)";
  const ink = tk.dark ? "rgba(255,255,255,0.92)" : "#3b2f2f";
  const script: React.CSSProperties = { fontFamily: "'Playfair Display', serif", fontStyle: "italic" };
  return (
    <section className="relative px-4 pb-10 pt-16 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${tk.aa(0.22)}, transparent)` }} />
      <div className="relative mx-auto max-w-xl">
        <Ico n="heart" className="dy-pulse mx-auto h-9 w-9" style={{ color: tk.acc, animation: "dyGlow 3s ease-in-out infinite" }} fill={tk.acc} />
        <h1 className="mt-4 text-3xl font-bold leading-tight md:text-5xl" style={tk.serif}>{data.title || "Título da página"}</h1>
        {since && <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs" style={{ background: tk.aa(0.08), border: `1px solid ${tk.aa(0.2)}`, color: tk.accDark }}><Ico n="heart" className="h-3 w-3" fill={tk.acc} style={{ color: tk.acc }} /><span className="font-medium">{since.replace(/ (juntos|de amizade|de carinho)$/, "")}</span><span style={{ color: tk.tx(0.45) }}>{since.match(/(juntos|de amizade|de carinho)$/)?.[0]}</span></div>}

        <div className="relative mt-8 rounded-2xl px-7 pb-8 text-left shadow-xl md:px-12" style={{ paddingTop: 48, background: paper, border: `1px solid ${tk.aa(0.18)}`, boxShadow: `0 30px 60px -25px ${tk.aa(0.35)}`, color: ink }}>
          <span style={corner("tl")} /><span style={corner("tr")} /><span style={corner("bl")} /><span style={corner("br")} />
          <p className="flex items-center gap-2 text-lg" style={{ ...script, color: tk.acc }}><Ico n="feather" className="h-4 w-4" />{salutation(data.kind, data.recipient)}</p>
          <p className="mt-4 whitespace-pre-wrap break-words text-base md:text-lg" style={{ fontFamily: "'Playfair Display', serif", lineHeight: "2rem" }}>{data.message.trim() || "Sua mensagem de amor aparecerá aqui…"}</p>
          <div className="mt-8 text-right">
            <p className="text-lg" style={{ ...script, color: tk.accDark }}>{CLOSING[data.kind] ?? CLOSING.amor}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm" style={{ color: tk.acc }}><Ico n="heart" className="h-3 w-3" fill={tk.acc} />{data.senderName || "Seu nome"}</p>
          </div>
          <p className="mt-6 text-center text-[11px]" style={{ color: ink, opacity: 0.45 }}>{data.style === "quiz" ? "" : `Desde ${fmtLong(data.startDate)}`}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CARTA INTERATIVA (envelope) ───────────────────────── */

export function EnvelopeGate({ data, tk, onOpen }: { data: PageData; tk: Tk; onOpen: () => void }) {
  const [phase, setPhase] = useState<"closed" | "opening">("closed");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => { injectFx(); const t = timers.current; return () => t.forEach(clearTimeout); }, []);
  const open = (e: React.MouseEvent) => {
    if (phase !== "closed") return;
    setPhase("opening");
    heartBurst(e.clientX, e.clientY, tk.acc, 22);
    timers.current.push(setTimeout(onOpen, 1900));
  };
  const opening = phase === "opening";
  // peças 100% opacas (a carta não pode aparecer através do envelope)
  const base = tk.dark ? `color-mix(in srgb, ${tk.acc} 24%, #170f27)` : "#e9d9df";
  const body = { backgroundColor: base, backgroundImage: tk.dark ? "linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.02))" : "linear-gradient(145deg,#f8eff2 0%,#e9d9df 100%)" };
  const front = { backgroundColor: base, backgroundImage: tk.dark ? "linear-gradient(160deg, rgba(255,255,255,.18), rgba(255,255,255,.04))" : "linear-gradient(160deg,#f3e6ea 0%,#dfc9d1 100%)" };
  const flap = { backgroundColor: base, backgroundImage: tk.dark ? "linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.08))" : "linear-gradient(180deg,#ead9df 0%,#d8c0c9 100%)" };
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6" style={{ background: tk.bg, color: tk.txt, opacity: 1 }} onClick={open} role="button" aria-label="Abrir carta">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, ${tk.aa(0.22)}, transparent 55%)` }} />
      {Array.from({ length: 12 }).map((_, i) => <span key={i} className="pointer-events-none absolute" style={{ left: `${(i * 8.3 + 5) % 100}%`, top: `${(i * 13 + 8) % 90}%`, width: 5, height: 5, borderRadius: 9, background: tk.acc, opacity: 0.4, animation: `dyTwinkle ${3 + (i % 4)}s ease-in-out ${i * 0.3}s infinite` }} />)}

      <div className="relative" style={{ width: 288, height: 196, perspective: 900, transform: opening ? "translateY(60px)" : "none", transition: "transform 1.2s ease .5s", animation: opening ? "none" : "dyFloat 4.5s ease-in-out infinite" }}>
        <div className="absolute inset-0 rounded-xl" style={{ ...body, boxShadow: `0 30px 60px -20px ${tk.aa(0.45)}`, border: `1px solid ${tk.aa(0.18)}` }} />
        {/* carta que sobe */}
        <div className="absolute rounded-md p-4 text-left" style={{ left: 16, right: 16, top: 14, height: 168, background: "linear-gradient(180deg,#fffefb,#fff7ec)", border: "1px solid rgba(160,120,90,.25)", transform: opening ? "translateY(-150px) scale(1.06)" : "translateY(0)", transition: "transform 1.1s cubic-bezier(.34,1.3,.64,1) .45s", zIndex: opening ? 4 : 1, boxShadow: "0 10px 25px -10px rgba(0,0,0,.25)" }}>
          <p className="text-sm italic" style={{ fontFamily: "'Playfair Display', serif", color: tk.accDark }}>{salutation(data.kind, data.recipient)}</p>
          <div className="mt-3 space-y-2">{[90, 100, 70, 85].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: "rgba(120,90,60,.16)" }} />)}</div>
        </div>
        {/* frente do envelope */}
        <div className="absolute inset-0 rounded-xl" style={{ ...front, clipPath: "polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)", zIndex: 2, border: `1px solid ${tk.aa(0.12)}` }} />
        <p className="absolute inset-x-0 text-center text-sm font-bold" style={{ bottom: 22, zIndex: 3, fontFamily: "'Playfair Display', serif", color: tk.accDark, opacity: opening ? 0 : 1, transition: "opacity .4s" }}>Para: {data.title || "você"}</p>
        {/* aba */}
        <div className="absolute inset-x-0 top-0" style={{ height: "58%", ...flap, clipPath: "polygon(0 0, 100% 0, 50% 100%)", transformOrigin: "top", transform: opening ? "rotateX(180deg)" : "rotateX(0)", transition: "transform .9s ease .1s", zIndex: opening ? 0 : 3, borderRadius: "12px 12px 0 0" }} />
        <div className="absolute left-1/2 flex items-center justify-center h-11 w-11 -translate-x-1/2  rounded-full" style={{ top: "44%", zIndex: 5, background: tk.aa(0.18), border: `2px solid ${tk.aa(0.5)}`, boxShadow: `0 0 26px ${tk.aa(0.55)}`, opacity: opening ? 0 : 1, transition: "opacity .3s" }}><Ico n="heart" className="dy-pulse h-5 w-5" fill={tk.acc} style={{ color: tk.acc }} /></div>
      </div>

      <p className="relative text-xs tracking-wide" style={{ marginTop: 64, color: tk.aa(0.8), opacity: opening ? 0 : 1, transition: "opacity .3s", animation: "dyIn 1s both" }}>Toque para abrir</p>
      <div className="absolute inset-x-0 bottom-6"><Brand tk={tk} /></div>
    </div>
  );
}

/* ───────────────────────── QUIZ DO CASAL ───────────────────────── */

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };

type Q = { text: string; options: string[]; answer: string };
export type QuizPhase = "intro" | "playing" | "won" | "lost" | "done";

export function QuizFlow({ data, tk, now, phase, setPhase, embed }: { data: PageData; tk: Tk; now: Date | null; phase: QuizPhase; setPhase: (p: QuizPhase) => void; embed: boolean }) {
  const total = data.quiz.length;
  const needed = Math.min(Math.max(data.quizNeeded, 1), Math.max(total, 1));
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [hits, setHits] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const since = humanSince(data.startDate, now, data.kind);
  const busy = useRef(false);

  useEffect(() => { injectFx(); }, []);
  useEffect(() => { if (phase === "won") { const id = setTimeout(() => heartBurst(window.innerWidth / 2, window.innerHeight * 0.35, tk.acc, 34), 250); return () => clearTimeout(id); } }, [phase, tk.acc]);

  const start = () => {
    if (!total) return;
    setQs(data.quiz.map((q) => ({ text: q.text, answer: q.correct, options: shuffle([q.correct, ...q.wrong]) })));
    setI(0); setHits(0); setPicked(null); busy.current = false; setPhase("playing");
  };
  function pick(o: string) {
    if (busy.current || picked) return;
    busy.current = true; setPicked(o);
    const nh = hits + (o === qs[i].answer ? 1 : 0);
    setTimeout(() => {
      setHits(nh); setPicked(null); busy.current = false;
      if (nh >= needed) return setPhase("won");
      // já não dá mais para chegar à meta (ou acabaram as perguntas): termina na hora
      if (i + 1 >= qs.length || nh + (qs.length - i - 1) < needed) return setPhase("lost");
      setI(i + 1);
    }, 1100);
  }

  const wrap: React.CSSProperties = { background: tk.bg, color: tk.txt, minHeight: embed ? 852 : "100dvh" };
  const box: React.CSSProperties = { ...tk.card, boxShadow: `0 20px 50px -20px ${tk.aa(0.35)}` };
  const btn: React.CSSProperties = { background: tk.dark ? tk.aa(0.18) : "#fff", color: tk.txt, border: `1px solid ${tk.aa(0.2)}`, boxShadow: `0 14px 30px -14px ${tk.aa(0.5)}` };
  const label = (icon: string, t: string) => <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tk.acc }}><Ico n={icon} className="h-3 w-3" />{t}</p>;

  return (
    <main className="relative flex flex-col items-center justify-center px-5 py-12" style={wrap}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${tk.aa(0.22)}, transparent)` }} />
      <div className="relative w-full max-w-md">
        {phase === "intro" && (
          <div className="dy-in text-center">
            <span className="mx-auto flex items-center justify-center h-20 w-20  rounded-full" style={{ background: tk.aa(0.14), boxShadow: `0 0 40px ${tk.aa(0.35)}` }}><Ico n="trophy" className="dy-pulse h-9 w-9" style={{ color: tk.acc }} /></span>
            <h1 className="mt-5 text-3xl font-bold md:text-4xl" style={tk.serif}>{QUIZ_TITLE[data.kind] ?? QUIZ_TITLE.amor}</h1>
            <p className="mt-1 text-sm" style={{ color: tk.tx(0.6) }}>Para: {data.title || "você"}</p>
            {since && <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs" style={{ background: tk.aa(0.08), border: `1px solid ${tk.aa(0.2)}`, color: tk.accDark }}><Ico n="heart" className="h-3 w-3" fill={tk.acc} style={{ color: tk.acc }} /><span className="font-medium">{since.replace(/ (juntos|de amizade|de carinho)$/, "")}</span><span style={{ color: tk.tx(0.45) }}>{since.match(/(juntos|de amizade|de carinho)$/)?.[0]}</span></div>}
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl px-5 py-4" style={{ ...box, background: tk.dark ? tk.aa(0.12) : "#fff" }}>{label("gift", "Prêmio em jogo")}<p className="mt-2 text-lg font-bold" style={{ ...tk.serif, color: tk.accDark }}>{data.quizPrize || "Um prêmio surpresa"}</p></div>
              <div className="rounded-2xl px-5 py-4" style={box}>{label("target", "Desafio")}<p className="mt-2 text-sm">{total ? <>Acerte <b>{needed}</b> de <b>{total}</b> perguntas para ganhar!</> : "Adicione perguntas ao quiz"}</p></div>
              {embed && data.quiz.slice(0, 2).map((q, k) => <div key={q.id} className="rounded-2xl px-4 py-3 text-left" style={box}><p className="text-[10px]" style={{ color: tk.tx(0.45) }}>Pergunta {k + 1}:</p><p className="text-xs">{q.text}</p></div>)}
              {embed && total > 2 && <p className="text-[11px]" style={{ color: tk.tx(0.45) }}>+{total - 2} {total - 2 === 1 ? "pergunta" : "perguntas"}</p>}
            </div>
            <button onClick={start} disabled={!total} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold transition hover:scale-[1.02] disabled:opacity-60" style={btn}><Ico n="play" className="h-4 w-4" />Começar Quiz</button>
            <div className="mt-8"><Brand tk={tk} /></div>
          </div>
        )}

        {phase === "playing" && qs[i] && (
          <div key={i} className="dy-in">
            <div className="flex items-center justify-between text-xs" style={{ color: tk.tx(0.6) }}><span>Pergunta {i + 1} de {qs.length}</span><span className="flex items-center gap-1"><Ico n="heart" className="h-3 w-3" fill={tk.acc} style={{ color: tk.acc }} />{hits}/{needed} acertos</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: tk.aa(0.15) }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${((i + (picked ? 1 : 0)) / qs.length) * 100}%`, background: `linear-gradient(90deg, ${tk.acc}, ${tk.accDark})` }} /></div>
            <div className="mt-6 rounded-3xl p-6 text-center" style={box}>
              <span className="mx-auto flex items-center justify-center h-12 w-12  rounded-full" style={{ background: tk.aa(0.14) }}><Ico n="target" className="h-5 w-5" style={{ color: tk.acc }} /></span>
              <h2 className="mt-4 text-xl font-bold leading-snug md:text-2xl" style={tk.serif}>{qs[i].text}</h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {qs[i].options.map((o) => {
                const isRight = !!picked && o === qs[i].answer, isWrong = picked === o && o !== qs[i].answer;
                return (
                  <button key={o} onClick={() => pick(o)} disabled={!!picked} className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-sm font-medium transition" style={{ background: isRight ? "rgba(34,197,94,.14)" : isWrong ? "rgba(239,68,68,.12)" : tk.dark ? tk.aa(0.1) : "#fff", border: `1.5px solid ${isRight ? "#22c55e" : isWrong ? "#ef4444" : tk.aa(0.22)}`, color: tk.txt, animation: isWrong ? "dyShake .4s" : undefined }}>
                    <span>{o}</span>{isRight && <Ico n="check-circle" className="h-5 w-5 shrink-0 text-emerald-500" />}{isWrong && <Ico n="x-circle" className="h-5 w-5 shrink-0 text-rose-500" />}
                  </button>
                );
              })}
            </div>
            <style>{`@keyframes dyShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
          </div>
        )}

        {phase === "won" && (
          <div className="dy-in text-center">
            <span className="mx-auto flex items-center justify-center h-24 w-24  rounded-full" style={{ background: tk.aa(0.16), boxShadow: `0 0 60px ${tk.aa(0.5)}` }}><Ico n="trophy" className="dy-pulse h-11 w-11" style={{ color: tk.acc }} /></span>
            <h1 className="mt-5 text-3xl font-bold md:text-4xl" style={tk.serif}>Você acertou! 🎉</h1>
            <p className="mt-2 text-sm" style={{ color: tk.tx(0.65) }}>{hits} de {qs.length || total} — o seu prêmio é:</p>
            <div className="mt-6 rounded-3xl px-6" style={{ paddingTop: 28, paddingBottom: 28, ...box, background: tk.dark ? tk.aa(0.14) : "#fff" }}>{label("gift", "Seu prêmio")}<p className="mt-3 text-2xl font-bold" style={{ ...tk.serif, color: tk.accDark }}>{data.quizPrize || "Um prêmio surpresa"}</p></div>
            <button onClick={() => setPhase("done")} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white transition hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${tk.acc}, ${tk.accDark})`, boxShadow: `0 16px 40px -14px ${tk.aa(0.6)}` }}>Ver a nossa página<Ico n="arrow-right" className="h-4 w-4" /></button>
          </div>
        )}

        {phase === "lost" && (
          <div className="dy-in text-center">
            <p className="text-6xl">🥲</p>
            <h1 className="mt-4 text-3xl font-bold" style={tk.serif}>Quase lá!</h1>
            <p className="mt-2 text-sm" style={{ color: tk.tx(0.65) }}>Você acertou {hits}, mas precisava de {needed}. Tente de novo para ganhar o prêmio!</p>
            <button onClick={start} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold transition hover:scale-[1.02]" style={btn}><Ico n="play" className="h-4 w-4" />Tentar novamente</button>
          </div>
        )}
      </div>
    </main>
  );
}
