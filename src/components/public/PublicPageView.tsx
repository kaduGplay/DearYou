/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import gates from "./gates.json";
import icons from "./icons.json";
import type { PageData } from "./types";
import { diff } from "../Counter";
import { THEMES, type ThemeId } from "@/lib/plans";
import { musicEmbed } from "@/lib/util";
import { heartBurst, injectFx, startEq } from "@/lib/fx";
import { EnvelopeGate, LetterHero, QuizFlow, type QuizPhase, type Tk } from "./StyleViews";
import { mountSpotify, loadSpotifyApi, ytCommand, type SpotifyCtl } from "@/lib/spotifyPlayer";

type Mode = "live" | "preview" | "embed";
type KindKey = "amor" | "amizade" | "pai";

const KIND: Record<KindKey, { since: string; days: string; music: string; share: string; cta: string; ctaHref: string; footer: string; title: string; sub: string }> = {
  amor: { since: "Juntos desde", days: "dias de amor", music: "A trilha sonora do nosso amor", share: "Compartilhe esse amor", cta: "Criar minha página de amor", ctaHref: "/criar", footer: "Crie sua própria página de amor", title: "Gostou? Crie a sua também", sub: "Surpreenda quem você ama com uma página assim, feita do seu jeito. Leva menos de 5 minutos." },
  amizade: { since: "Amigos desde", days: "dias de amizade", music: "A trilha sonora dessa amizade", share: "Compartilhe essa amizade", cta: "Criar minha página de amizade", ctaHref: "/criar-amizade", footer: "Crie sua própria página de amizade", title: "Gostou? Crie a sua também", sub: "Surpreenda aquele amigo ou amiga que merece com uma página assim, feita do seu jeito. Leva menos de 5 minutos." },
  pai: { since: "Você é meu pai desde", days: "dias sendo meu pai", music: "A trilha sonora da nossa história", share: "Compartilhe esse amor", cta: "Criar a página do meu pai", ctaHref: "/criar-pai", footer: "Crie uma página para o seu pai", title: "Gostou? Crie a sua também", sub: "Surpreenda o seu pai com uma página assim, feita do seu jeito. Leva menos de 5 minutos." },
};

function Ico({ n, className = "", style, fill }: { n: string; className?: string; style?: React.CSSProperties; fill?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden dangerouslySetInnerHTML={{ __html: (icons as Record<string, string>)[n] ?? "" }} />;
}

/** Entrada com fade/slide quando o elemento aparece na tela (como no site original). */
function R({ as: Tag = "div", y = 30, scale, delay = 0, className, style, children }: { as?: "div" | "section" | "h2" | "p"; y?: number; scale?: number; delay?: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  const C = Tag as React.ElementType;
  return <C ref={ref} className={className} style={{ ...style, opacity: on ? 1 : 0, transform: on ? "none" : `translateY(${y}px)${scale ? ` scale(${scale})` : ""}`, transition: scale ? `opacity .6s ease ${delay}ms, transform .9s cubic-bezier(.34,1.56,.64,1) ${delay}ms` : `opacity .8s ease ${delay}ms, transform .9s cubic-bezier(.2,.7,.2,1) ${delay}ms` }}>{children}</C>;
}

const fmtLong = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const ago = (iso: string, nowMs: number) => {
  const ms = nowMs - new Date(iso).getTime(), h = Math.floor(ms / 3600e3), d = Math.floor(ms / 86400e3);
  if (ms < 60e3) return "agora mesmo"; if (h < 1) return `há ${Math.floor(ms / 60e3)} min`; if (h < 24) return `há ${h} horas`; if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
};

function Eq({ n, acc, phase = 0, paused }: { n: number; acc: string; phase?: number; paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!ref.current || paused) return; return startEq(ref.current, phase); }, [paused, phase]);
  return <div ref={ref} className="flex items-end gap-[3px] h-5">{Array.from({ length: n }).map((_, i) => <div key={i} className="w-[3px] rounded-full" style={{ background: acc, height: "60%" }} />)}</div>;
}

function Line({ acc }: { acc: string }) {
  return <R y={0} className="h-px w-32" style={{ background: `linear-gradient(90deg, transparent, ${acc}, transparent)` }} />;
}

function Divider({ acc }: { acc: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Line acc={acc} /><Ico n="heart" className="mx-4 h-4 w-4 dy-pulse" style={{ color: acc }} fill={acc} /><Line acc={acc} />
    </div>
  );
}

function Head({ title, sub, icon, acc, tx, serif }: { title: string; sub: string; icon?: string; acc: string; tx: (o: number) => string; serif: React.CSSProperties }) {
  return (
    <R y={20} className="text-center mb-12 md:mb-16">
      {icon && <div className="flex items-center justify-center gap-2 mb-4"><Ico n={icon} className="w-6 h-6" style={{ color: acc }} /></div>}
      <h2 className="text-3xl md:text-5xl font-bold mb-4" style={serif}>{title}</h2>
      <p style={{ color: tx(0.5) }}>{sub}</p>
    </R>
  );
}

export default function PublicPageView({ data, mode = "live", createHref }: { data: PageData; mode?: Mode; createHref?: string }) {
  const t = THEMES[(data.theme as ThemeId) in THEMES ? (data.theme as ThemeId) : "rosa"];
  const kind = (data.kind in KIND ? data.kind : "amor") as KindKey;
  const K = KIND[kind];
  const embed = mode === "embed";
  const A = t.accent, acc = `rgb(${A})`, aa = (o: number) => `rgba(${A},${o})`;
  const txt = t.dark ? "#ffffff" : "#1a1a2e", txtRgb = t.dark ? "255,255,255" : "26,26,46";
  const tx = (o: number) => `rgba(${txtRgb},${o})`;
  const accDark = `rgb(${t.accentDark})`;
  const card: React.CSSProperties = { background: aa(0.06), border: `1px solid ${aa(0.15)}`, backdropFilter: "blur(20px)" };
  const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
  const g = gates[kind];

  const [loading, setLoading] = useState(mode === "live");
  const isQuiz = data.style === "quiz", isEnv = data.style === "interativa";
  const letter = data.style === "carta" || isEnv;
  const [gateOpen, setGateOpen] = useState(!isQuiz && (mode === "live" || mode === "preview" || (isEnv && embed)));
  const [quizPhase, setQuizPhase] = useState<QuizPhase>(isQuiz ? "intro" : "done");
  const [now, setNow] = useState<Date | null>(null);
  const [entries, setEntries] = useState(data.guestbook);
  const [musicOn, setMusicOn] = useState(false);
  const [heroIn, setHeroIn] = useState(embed);
  const [barOn, setBarOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState("");
  const gateRef = useRef<HTMLDivElement>(null);
  const spotifyBox = useRef<HTMLDivElement>(null);
  const spotifyCtl = useRef<SpotifyCtl | null>(null);
  const ytFrame = useRef<HTMLIFrameElement>(null);
  const music = musicEmbed(data.musicUrl);
  const eterno = data.plan === "eterno";

  useEffect(() => { injectFx(); }, []);
  useEffect(() => { if (music?.kind === "spotify") loadSpotifyApi(); }, [music?.kind]);
  // começa a tocar direto no clique (Spotify iFrame API) e mantém o botão sincronizado
  useEffect(() => {
    if (!musicOn || music?.kind !== "spotify" || !spotifyBox.current) return;
    let dead = false;
    const id = music.src.match(/track\/([A-Za-z0-9]+)/)?.[1];
    if (!id) return;
    mountSpotify(spotifyBox.current, id, (playing) => { if (!dead) setPaused(!playing); }).then((c) => { if (dead) c.destroy(); else spotifyCtl.current = c; });
    return () => { dead = true; spotifyCtl.current?.destroy(); spotifyCtl.current = null; };
  }, [musicOn, music?.kind, music?.src]);
  const togglePlay = () => {
    if (music?.kind === "spotify") { spotifyCtl.current?.togglePlay(); return; }
    ytCommand(ytFrame.current, paused ? "playVideo" : "pauseVideo"); setPaused(!paused);
  };
  useEffect(() => {
    const el = gateRef.current; if (!el || !gateOpen || loading) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const all = Array.from(el.querySelectorAll<HTMLElement>("[style]")).filter((n) => /opacity:\s*0(?![.\d])/.test(n.getAttribute("style") ?? ""));
    const isHeart = (n: HTMLElement) => n.classList.contains("pointer-events-none");
    all.filter((n) => !isHeart(n)).forEach((n, k) => ids.push(setTimeout(() => { n.style.transition = "opacity .7s ease, transform .8s cubic-bezier(.34,1.56,.64,1)"; n.style.opacity = "1"; n.style.transform = "none"; }, 60 + k * 120)));
    all.filter(isHeart).forEach((n, k) => ids.push(setTimeout(() => { n.style.transition = "opacity .8s ease, transform .9s cubic-bezier(.34,1.56,.64,1)"; n.style.opacity = "0.7"; n.style.transform = "none"; ids.push(setTimeout(() => { n.style.transition = "none"; n.style.animation = `dyFloat ${4 + (k % 3)}s ease-in-out ${k * 0.4}s infinite`; }, 900)); }, 60 + k * 80)));
    const mascot = el.querySelector<HTMLElement>("img"); if (mascot) mascot.style.animation = "dyFloat 4.5s ease-in-out infinite";
    return () => ids.forEach(clearTimeout);
  }, [gateOpen, loading]);
  useEffect(() => { if (mode === "live") { const id = setTimeout(() => setLoading(false), 900); return () => clearTimeout(id); } }, [mode]);
  useEffect(() => { if (!gateOpen || embed) { const id = setTimeout(() => setHeroIn(true), 250); return () => clearTimeout(id); } }, [gateOpen, embed]);
  useEffect(() => { const t0 = setTimeout(() => setNow(new Date()), 0); const id = setInterval(() => setNow(new Date()), 1000); return () => { clearTimeout(t0); clearInterval(id); }; }, []);
  useEffect(() => { if (mode === "live") fetch(`/api/public/${data.slug}/view`, { method: "POST" }).catch(() => {}); }, [mode, data.slug]);
  useEffect(() => { document.body.style.overflow = (loading || gateOpen) && !embed ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [loading, gateOpen, embed]);

  // contador
  const start = new Date(data.startDate);
  const has = !!now && !isNaN(start.getTime()) && start.getTime() < now.getTime() - 60_000;
  const d = now && has ? diff(start, now) : { y: 0, m: 0, d: 0, h: 0, mi: 0, s: 0 };
  const totalDays = now && has ? Math.floor((now.getTime() - start.getTime()) / 86400000) : 0;
  const cells: [string, number][] = [];
  if (d.y > 0) cells.push(["Anos", d.y]);
  if (d.y > 0 || d.m > 0) cells.push(["Meses", d.m]);
  cells.push(["Dias", d.d]);
  const two = (n: number) => String(n).padStart(2, "0");

  // carrossel
  const photos = data.photos;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const touch = useRef<number | null>(null);
  useEffect(() => { if (!playing || photos.length < 2) return; const id = setTimeout(() => setIdx((i) => (i + 1) % photos.length), 5000); return () => clearTimeout(id); }, [idx, playing, photos.length]);
  const go = (n: number) => setIdx((n + photos.length) % photos.length);

  const url = () => (mode === "live" ? `${window.location.origin}/${data.slug}` : window.location.href);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  if (loading) return <div dangerouslySetInnerHTML={{ __html: g.loader }} />;

  const tk: Tk = { acc, accDark, aa, txt, tx, card, serif, bg: t.bg, dark: t.dark };

  // Quiz do Casal: a pessoa joga antes de ver a página
  if (isQuiz && quizPhase !== "done") return <QuizFlow data={data} tk={tk} now={now} phase={quizPhase} setPhase={setQuizPhase} embed={embed} />;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ color: txt, background: t.bg }}>
      <style>{`@keyframes dy-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@keyframes dy-rise{from{transform:translateY(110vh);opacity:0}10%{opacity:.5}90%{opacity:.5}to{transform:translateY(-10vh);opacity:0}}@keyframes dy-bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}`}</style>
      {/* partículas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 15 }).map((_, i) => <div key={i} className="absolute rounded-full" style={{ left: `${(i * 6.67) % 100}%`, top: `${(i * 7.5) % 100}%`, width: 3, height: 3, background: acc, opacity: 0.4, animation: `dyTwinkle ${3 + (i % 4)}s ease-in-out ${i * 0.35}s infinite` }} />)}
      </div>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="absolute" style={{ left: `${i * 16.6}%`, animation: `dyRise ${13 + i * 2.2}s linear ${i * 2.4}s infinite`, opacity: 0 }}><Ico n="heart" className="h-4 w-4" style={{ color: acc }} fill={acc} /></div>)}
      </div>

      {/* hero */}
      {letter ? <LetterHero data={data} tk={tk} now={now} /> : (
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20" style={embed ? { minHeight: 852 } : undefined}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${aa(0.25)} 0%, transparent 50%)` }} />
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="mb-8" style={{ transform: heroIn ? "none" : "scale(0) rotate(-180deg)", transition: "transform 1.3s cubic-bezier(.34,1.56,.64,1)" }}><div className="relative inline-block"><div className="dy-pulse"><Ico n="heart" className="mx-auto" style={{ width: "clamp(60px, 8vw, 102px)", height: "clamp(60px, 8vw, 102px)", color: acc, animation: "dyGlow 3s ease-in-out infinite" }} fill={acc} /></div></div></div>
          <R as="h2" className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight" style={{ ...serif, textShadow: `0 0 60px ${aa(0.25)}` }}>{data.title || "Título da página"}</R>
          {has && <div className="flex items-center justify-center gap-3 mb-12"><Ico n="calendar" className="w-5 h-5" style={{ color: acc }} /><span className="text-sm md:text-base tracking-wide" style={{ color: tx(0.5) }}>{K.since} {fmtLong(data.startDate)}</span></div>}
          <div className="space-y-10">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              {cells.map(([label, v], ci) => (
                <R key={label} y={20} scale={0.5} delay={ci * 140}>
                  <div className="relative group" style={{ ...card, borderRadius: 24, padding: "clamp(20px, 4vw, 40px)", minWidth: "clamp(90px, 18vw, 140px)" }}>
                    <div className="relative" style={{ transform: "scale(1.1)" }}>
                      <span className="block text-5xl md:text-7xl lg:text-8xl font-bold tabular-nums" style={{ ...serif, background: `linear-gradient(180deg, ${txt} 0%, ${acc} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: `0 0 40px ${aa(0.25)}` }}>{has ? v : 0}</span>
                    </div>
                    <div className="text-xs md:text-sm mt-2 uppercase tracking-[0.2em] font-medium" style={{ color: acc }}>{label}</div>
                  </div>
                </R>
              ))}
            </div>
            {has && (<>
              <div className="flex items-center justify-center gap-1">
                <div className="flex items-center gap-2 px-6 py-3 rounded-full" style={{ background: aa(0.06), border: `1px solid ${aa(0.15)}` }}>
                  <span className="text-xl md:text-2xl font-mono font-medium tabular-nums" style={{ color: accDark }}>{two(d.h)}</span><span style={{ color: acc }} className="text-xl font-light">:</span>
                  <span className="text-xl md:text-2xl font-mono font-medium tabular-nums" style={{ color: accDark }}>{two(d.mi)}</span><span style={{ color: acc }} className="text-xl font-light">:</span>
                  <span className="text-xl md:text-2xl font-mono font-medium tabular-nums" style={{ color: accDark }}>{two(d.s)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3" style={{ color: tx(0.7) }}>
                  <Ico n="sparkles" className="w-4 h-4" style={{ color: acc }} />
                  <span className="text-sm md:text-base tracking-wide">São <span className="font-semibold" style={{ color: txt, textShadow: `0 0 20px ${aa(0.25)}` }}>{totalDays.toLocaleString("pt-BR")}</span> {K.days}</span>
                  <Ico n="sparkles" className="w-4 h-4" style={{ color: acc }} />
                </div>
              </div>
            </>)}
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2"><div className="w-6 h-10 rounded-full flex items-start justify-center p-2" style={{ border: `2px solid ${aa(0.15)}` }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: acc }} /></div></div>
      </section>
      )}

      {/* música */}
      {music && (
        <section className="relative py-12 md:py-16 px-4">
          <R y={20} className="w-full max-w-md mx-auto">
            <div className="relative rounded-3xl overflow-hidden" style={{ ...card, boxShadow: `0 20px 50px -15px ${aa(0.25)}` }}>
              <div className="p-6 md:p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `linear-gradient(135deg, ${aa(0.3)}, ${aa(0.1)})`, border: `2px solid ${aa(0.4)}` }}><Ico n="music" className="w-7 h-7" style={{ color: acc }} /></div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2" style={serif}>Nossa Música</h3>
                  <p className="text-sm" style={{ color: tx(0.55) }}>{K.music}</p>
                </div>
                {!musicOn ? (
                  <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); heartBurst(r.left + r.width / 2, r.top + 20, acc, 16); setMusicOn(true); setBarOn(true); setPaused(false); }} className="w-full py-4 px-6 rounded-2xl font-medium text-white transition-all duration-300 flex items-center justify-center gap-3 group dy-shine" style={{ background: `linear-gradient(135deg, ${acc}, ${accDark})`, boxShadow: `0 10px 30px -10px ${aa(0.25)}` }}>
                    <Ico n="play" className="w-5 h-5" /><span>Clique para descobrir</span>
                  </button>
                ) : (
                  <div className="dy-in">
                    <div className="text-center mb-4"><div className="flex items-center justify-center gap-2 mb-2"><Eq n={4} acc={acc} paused={paused} /><span className="text-sm font-medium mx-2" style={{ color: acc }}>{paused ? "Pausado" : "Tocando"}</span><Eq n={4} acc={acc} phase={1} paused={paused} /></div></div>
                    <div className="dy-in" style={{ animationDelay: ".25s" }}>{music.kind === "spotify" ? <div ref={spotifyBox} className="rounded-2xl overflow-hidden" style={{ minHeight: 152 }} /> : <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}><iframe ref={ytFrame} title="Música" src={music.src + "&autoplay=1&playsinline=1&enablejsapi=1"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" className="w-full h-full" style={{ border: 0 }} /></div>}</div>
                  </div>
                )}
              </div>
            </div>
          </R>
        </section>
      )}

      {/* mensagem */}
      {!letter && data.message.trim() && (<>
        <Divider acc={acc} />
        <section className="relative py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <R y={50} className="relative">
              <div className="absolute -top-6 -left-2 md:-left-6 text-7xl md:text-9xl font-serif leading-none select-none" style={{ color: acc, opacity: 0.2 }}>&quot;</div>
              <div className="absolute -bottom-12 -right-2 md:-right-6 text-7xl md:text-9xl font-serif leading-none rotate-180 select-none" style={{ color: acc, opacity: 0.2 }}>&quot;</div>
              {data.style === "carta" || data.style === "interativa" ? (
                <div className="rounded-md p-8 md:p-12 shadow-xl" style={{ background: t.dark ? "#f6ecd9" : "#fffdf6", color: "#3a2a1f", backgroundImage: "repeating-linear-gradient(transparent 0 35px, rgba(120,90,60,.12) 35px 36px)" }}>
                  <p className="font-serif text-sm italic opacity-60">{data.recipient ? `Querido(a) ${data.recipient},` : "Querido(a),"}</p>
                  <p className="text-lg md:text-xl whitespace-pre-wrap break-words mt-3" style={{ ...serif, lineHeight: "2.25rem" }}>{data.message}</p>
                </div>
              ) : (
                <div className="rounded-3xl p-8 md:p-12" style={{ ...card, boxShadow: `0 30px 60px -20px ${aa(0.25)}` }}>
                  <p className="text-lg md:text-xl lg:text-2xl leading-relaxed whitespace-pre-wrap text-center font-light italic break-words " style={{ color: tx(0.9) }}>{data.message}</p>
                </div>
              )}
            </R>
          </div>
        </section>
      </>)}

      {/* fotos */}
      {photos.length > 0 && (<>
        <Divider acc={acc} />
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <Head title="Nossos Momentos" sub="Memórias que guardamos no coração" acc={acc} tx={tx} serif={serif} />
            <R className="relative max-w-4xl mx-auto">
              <div className="relative aspect-[4/3] md:aspect-[16/10] rounded-3xl overflow-hidden" style={{ boxShadow: `0 30px 60px -20px ${aa(0.25)}`, border: `1px solid ${aa(0.15)}`, background: "rgba(0,0,0,0.3)" }}
                onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1)); touch.current = null; }}>
                <div className="absolute inset-0 flex items-center justify-center" style={{ touchAction: "pan-y" }}>
                  <img key={photos[idx].id} alt={photos[idx].caption || "Foto de vocês"} className="object-contain" style={{ position: "absolute", height: "100%", width: "100%", inset: 0, animation: "dy-fade .5s both, dyKen 6s ease-out both" }} src={photos[idx].url} />
                </div>
                <style>{`@keyframes dy-fade{from{opacity:0}to{opacity:1}}`}</style>
                {photos.length > 1 && (<>
                  <button aria-label="Anterior" onClick={() => go(idx - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all duration-300 group"><Ico n="chevron-left" className="w-6 h-6 text-white" /></button>
                  <button aria-label="Próxima" onClick={() => go(idx + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all duration-300 group"><Ico n="chevron-right" className="w-6 h-6 text-white" /></button>
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      {photos.map((p, i) => (
                        <button key={p.id} aria-label={`Foto ${i + 1}`} onClick={() => setIdx(i)} className="relative h-2 rounded-full transition-all duration-500 overflow-hidden" style={{ width: i === idx ? 32 : 8, background: i === idx ? "transparent" : "rgba(255,255,255,0.3)" }}>
                          {i === idx && (<><div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} /><div key={`${idx}-${playing}`} className="absolute inset-0 rounded-full origin-left" style={{ background: acc, transform: playing ? "scaleX(1)" : "scaleX(0)", transition: playing ? "transform 5s linear" : "none" }} /></>)}
                        </button>
                      ))}
                    </div>
                    <button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => setPlaying(!playing)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all duration-300"><Ico n={playing ? "pause" : "play"} className="w-4 h-4 text-white" /></button>
                  </div>
                </>)}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.4)", color: "white" }}>{idx + 1} / {photos.length}</div>
              </div>
              {photos.length > 1 && (
                <div className="mt-4 flex justify-center gap-2 overflow-x-auto pb-2 px-4">
                  {photos.map((p, i) => (
                    <button key={p.id} onClick={() => setIdx(i)} className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden transition-all duration-300" style={{ opacity: i === idx ? 1 : 0.5, transform: `scale(${i === idx ? 1.05 : 1})`, border: `2px solid ${i === idx ? acc : "transparent"}`, boxShadow: i === idx ? `0 0 20px ${aa(0.25)}` : "none" }}>
                      <img alt={`Miniatura ${i + 1}`} loading="lazy" className="object-cover" style={{ position: "absolute", height: "100%", width: "100%", inset: 0 }} src={p.url} />
                    </button>
                  ))}
                </div>
              )}
            </R>
          </div>
        </section>
      </>)}

      {/* linha do tempo */}
      {data.timeline.length > 0 && (<>
        <Divider acc={acc} />
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <Head title="Nossa História" sub="Momentos que marcaram nossa jornada" icon="clock" acc={acc} tx={tx} serif={serif} />
            <div className="relative">
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2" style={{ background: `linear-gradient(180deg, transparent, ${acc}, transparent)` }} />
              <div className="space-y-8 md:space-y-12">
                {data.timeline.map((e, i) => (
                  <R key={e.id} className={`relative flex items-start gap-4 md:gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full" style={{ background: aa(0.06), border: `2px solid ${acc}`, boxShadow: `0 0 20px ${aa(0.25)}` }}><Ico n="heart" className="w-5 h-5" style={{ color: acc }} /></div>
                    <div className={`ml-20 md:ml-0 md:w-[calc(50%-40px)] ${i % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"}`}>
                      <div className="rounded-2xl p-5 md:p-6" style={card}>
                        <p className="text-xs md:text-sm font-medium mb-2 uppercase tracking-wider" style={{ color: acc }}>{fmtLong(e.date)}</p>
                        <h3 className="text-lg md:text-xl font-bold mb-2" style={{ ...serif, color: txt }}>{e.title}</h3>
                        {e.text && <p className="text-sm md:text-base" style={{ color: tx(0.7) }}>{e.text}</p>}
                        {e.photo && (
                          <div className="relative rounded-xl overflow-hidden mt-4" style={{ border: `1px solid ${aa(0.15)}` }}>
                            <img alt={e.title} loading="lazy" className="w-full h-auto object-contain" style={{ color: "transparent" }} src={e.photo} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="hidden md:block md:w-[calc(50%-40px)]" />
                  </R>
                ))}
              </div>
            </div>
          </div>
        </section>
      </>)}

      {/* livro de visitas */}
      {eterno && !embed && (<>
        <Divider acc={acc} />
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <Head title="Livro de Visitas" sub="Mensagens de carinho de quem nos ama" icon="message-circle" acc={acc} tx={tx} serif={serif} />
            <div className="max-w-2xl mx-auto">
              <Guestbook slug={data.slug} live={mode === "live"} onAdd={(e) => setEntries((x) => [e, ...x])} card={card} accDark={accDark} aa={aa} txt={txt} />
              <div className="space-y-4">
                <p className="text-sm text-center mb-6" style={{ color: tx(0.45) }}>{entries.length} {entries.length === 1 ? "mensagem" : "mensagens"} de carinho</p>
                {entries.map((e) => (
                  <R key={e.id} y={20} className="p-5 rounded-2xl" style={card}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: aa(0.2), border: `1px solid ${aa(0.4)}` }}><Ico n="heart" className="w-4 h-4" style={{ color: acc }} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1"><p className="font-medium truncate" style={{ color: txt }}>{e.author}</p><p className="text-xs flex-shrink-0" style={{ color: tx(0.45) }}>{now ? ago(e.createdAt, now.getTime()) : ""}</p></div>
                        <p className="text-sm whitespace-pre-wrap break-words" style={{ color: tx(0.7) }}>{e.message}</p>
                      </div>
                    </div>
                  </R>
                ))}
              </div>
            </div>
          </div>
        </section>
      </>)}

      {/* compartilhar + CTA + rodapé */}
      {!embed && (<>
        <Divider acc={acc} />
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <R y={20} className="text-center">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={serif}>{K.share}</h2>
              <p className="mb-10" style={{ color: tx(0.5) }}>Envie para alguém especial</p>
              <div className="flex flex-col items-center gap-6">
                <button onClick={async () => { const u = url(); if (navigator.share) { try { await navigator.share({ title: data.title, url: u }); return; } catch {} } await navigator.clipboard.writeText(u); flash("Link copiado!"); }} className="flex items-center gap-3 rounded-2xl px-7 py-4 font-semibold text-base md:text-lg text-white" style={{ background: accDark, boxShadow: `0 18px 45px -12px ${aa(0.25)}` }}><Ico n="send" className="w-5 h-5" />Compartilhar no Story</button>
                <p className="text-xs -mt-3" style={{ color: tx(0.55) }}>ou envie de outro jeito</p>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  {[
                    { title: "WhatsApp", icon: "message-circle", on: () => window.open(`https://wa.me/?text=${encodeURIComponent(`Fiz uma surpresa pra você 💌 ${url()}`)}`, "_blank") },
                    { title: "Copiar link", icon: "copy", on: async () => { await navigator.clipboard.writeText(url()); flash("Link copiado!"); } },
                    { title: "QR Code", icon: "qr-code", on: async () => setQr(await QRCode.toDataURL(url(), { margin: 1, width: 260 })) },
                  ].map((b) => (
                    <button key={b.title} title={b.title} onClick={b.on} className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300" style={{ ...card, boxShadow: `0 10px 30px -10px ${aa(0.25)}` }}><Ico n={b.icon} className="w-6 h-6" style={{ color: acc }} /></button>
                  ))}
                </div>
              </div>
            </R>
          </div>
        </section>
        <Divider acc={acc} />
        <section className="pb-16 md:pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            <R y={20} className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-12 md:py-14 text-center" style={{ ...card, boxShadow: `0 30px 80px -30px ${aa(0.25)}` }}>
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl" style={{ background: aa(0.25) }} />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5" style={{ background: aa(0.25) }}><Ico n="gift" className="w-7 h-7" style={{ color: acc }} /></div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={serif}>{K.title}</h2>
                <p className="mb-8 max-w-md mx-auto" style={{ color: tx(0.5) }}>{K.sub}</p>
                <div className="inline-block"><Link className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 font-semibold text-base md:text-lg text-white" style={{ background: accDark, boxShadow: `0 18px 45px -12px ${aa(0.25)}` }} href={createHref ?? K.ctaHref}>{K.cta}<Ico n="arrow-right" className="w-5 h-5" /></Link></div>
                <p className="text-xs mt-4" style={{ color: tx(0.3) }}>Pronta em minutos, sem precisar saber programar</p>
              </div>
            </R>
          </div>
        </section>
        <footer className="py-12 px-4" style={{ borderTop: `1px solid ${aa(0.15)}` }}>
          <div className="max-w-6xl mx-auto text-center">
            <Link className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity group" href="/"><Ico n="heart" className="w-6 h-6" style={{ color: acc }} fill={acc} /><span className="text-xl font-bold" style={serif}>DearYou</span></Link>
            <p className="text-sm" style={{ color: tx(0.3) }}>{K.footer}</p>
          </div>
        </footer>
      </>)}

      {barOn && !embed && music && (
        <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom" style={{ background: "linear-gradient(135deg, rgba(0,0,0,.85), rgba(0,0,0,.95))", backdropFilter: "blur(20px)", borderTop: `1px solid ${aa(0.15)}`, animation: "dyIn .7s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div className="flex items-center gap-3 px-4 py-3 max-w-md mx-auto">
            <button className="p-2.5 rounded-full transition-all flex-shrink-0" aria-label={paused ? "Tocar música" : "Pausar música"} onClick={togglePlay} style={{ boxShadow: `0 4px 15px -3px ${aa(0.25)}`, color: "#fff", background: aa(0.35) }}><Ico n={paused ? "play" : "pause"} className="w-4 h-4" /></button>
            <Eq n={5} acc={acc} phase={2} paused={paused} />
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: accDark === acc ? acc : "rgb(190, 24, 93)" }}>Nossa Música</p><p className="text-xs text-white/40 truncate">{paused ? "Pausado" : "Tocando agora"}</p></div>
            <button className="p-2 rounded-full transition-colors" aria-label="Minimizar player" onClick={() => setBarOn(false)} style={{ color: acc }}><Ico n="music" className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-5 py-2.5 text-sm text-white" style={{ zIndex: 300 }}>{toast}</div>}
      {qr && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-6" style={{ zIndex: 300 }} onClick={() => setQr("")}>
          <div className="rounded-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <img src={qr} alt="QR Code" className="mx-auto" style={{ height: 224, width: 224 }} /><p className="mt-3 text-sm text-gray-500">Aponte a câmera para abrir a página</p>
          </div>
        </div>
      )}

      {/* tela "Clique aqui" (abertura) */}
      {gateOpen && isEnv && <EnvelopeGate data={data} tk={tk} onOpen={() => setGateOpen(false)} />}
      {gateOpen && !isEnv && !embed && (
        <div ref={gateRef} onClick={(e) => { const b = (e.target as HTMLElement).closest("button"); if (!b) return; const r = b.getBoundingClientRect(); heartBurst(r.left + r.width / 2, r.top + r.height / 2, acc); const el = gateRef.current; if (el) { el.style.transition = "opacity .9s ease .25s, transform .9s ease .25s"; el.style.opacity = "0"; el.style.transform = "scale(1.06)"; el.style.pointerEvents = "none"; } document.body.style.overflow = ""; setTimeout(() => setGateOpen(false), 1150); }} dangerouslySetInnerHTML={{ __html: g.gate }} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
      )}
    </div>
  );
}

function Guestbook({ slug, live, onAdd, card, accDark, aa, txt }: { slug: string; live: boolean; onAdd: (e: PageData["guestbook"][number]) => void; card: React.CSSProperties; accDark: string; aa: (o: number) => string; txt: string }) {
  const [author, setAuthor] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const field: React.CSSProperties = { width: "100%", borderRadius: 14, padding: "12px 14px", background: aa(0.06), border: `1px solid ${aa(0.2)}`, color: txt, outline: "none" };
  async function send(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!live) { onAdd({ id: String(Date.now()), author, message, createdAt: new Date().toISOString() }); setMessage(""); return; }
    setBusy(true);
    const r = await fetch(`/api/public/${slug}/guestbook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author, message }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return setError(d.error);
    onAdd(d.entry); setMessage("");
  }
  return (
    <form onSubmit={send} className="p-5 md:p-6 rounded-2xl mb-8 space-y-3" style={card}>
      <h3 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Deixe sua mensagem</h3>
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Seu nome" required maxLength={40} style={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva uma mensagem de carinho…" required maxLength={500} rows={3} style={{ ...field, resize: "none" }} />
      {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}
      <button disabled={busy} className="w-full rounded-2xl py-3 font-semibold text-white" style={{ background: accDark, boxShadow: `0 10px 30px -10px ${aa(0.4)}` }}>{busy ? "Enviando…" : "Enviar mensagem"}</button>
    </form>
  );
}
