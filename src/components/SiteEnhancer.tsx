"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import icons from "./public/icons.json";
import { diff } from "./Counter";
import { heartBurst, injectFx, startEq } from "@/lib/fx";
import { loadSpotifyApi, mountSpotify, ytCommand, type SpotifyCtl } from "@/lib/spotifyPlayer";

const CREATE: Record<string, { create: string; example: string }> = {
  "/": { create: "/criar", example: "/exemplo" },
  "/amizade": { create: "/criar-amizade", example: "/exemplo-amizade" },
  "/pai": { create: "/criar-pai", example: "/exemplo-pai" },
  "/precos": { create: "/criar", example: "/exemplo" },
  "/exemplo": { create: "/criar", example: "/exemplo" },
  "/exemplo-amizade": { create: "/criar-amizade", example: "/exemplo-amizade" },
  "/exemplo-pai": { create: "/criar-pai", example: "/exemplo-pai" },
};

/** Música de cada exemplo (a mesma do site original). */
const MUSIC: Record<string, { kind: "spotify" | "youtube"; id: string }> = {
  "/exemplo": { kind: "spotify", id: "00j16DuIL1HPHjjLMNcYX0" },
  "/exemplo-amizade": { kind: "youtube", id: "6k8cpUkKK4c" },
  "/exemplo-pai": { kind: "youtube", id: "Vzlwd0vyuGQ" },
};

const SPRING = "cubic-bezier(.34,1.56,.64,1)";
const EASE = "cubic-bezier(.2,.7,.2,1)";
const ico = (n: string, cls: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${(icons as Record<string, string>)[n]}</svg>`;
/** Elementos que começam invisíveis (opacity:0), mesmo que o atributo style tenha sido reescrito. */
const hidden = (root: ParentNode): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>("[style]")).filter((el) => /opacity:\s*0(?![.\d])/.test(el.getAttribute("style") ?? ""));
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Liga o comportamento (que no site original vinha do React) ao HTML estático. */
export default function SiteEnhancer() {
  const path = usePathname();

  useEffect(() => {
    injectFx();
    const routes = CREATE[path] ?? CREATE["/"];
    const isExample = path.startsWith("/exemplo");
    const cleanups: (() => void)[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };
    const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
    const $$ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));

    // ---------- exemplo: carregamento + tela "Clique aqui" ----------
    let gate: HTMLElement | null = null;
    if (isExample) {
      gate = $('[class*="z-[100]"]');
      const loader = $('[class*="z-[200]"]');
      if (gate) document.body.style.overflow = "hidden";
      if (loader) later(() => { loader.style.transition = "opacity .5s"; loader.style.opacity = "0"; loader.style.pointerEvents = "none"; later(() => loader.remove(), 550); }, 900);
      if (gate) {
        // entrada em cascata, corações flutuando
        const g = gate;
        const all = hidden(g);
        const isHeart = (el: HTMLElement) => el.classList.contains("pointer-events-none");
        const main = all.filter((el) => !isHeart(el)), hearts = all.filter(isHeart);
        const base = loader ? 700 : 60;
        main.forEach((el, k) => later(() => { el.style.transition = `opacity .7s ease, transform .8s ${SPRING}`; el.style.opacity = "1"; el.style.transform = "none"; }, base + k * 120));
        hearts.forEach((el, k) => later(() => {
          el.style.transition = `opacity .8s ease, transform .9s ${SPRING}`; el.style.opacity = "0.7"; el.style.transform = "none";
          later(() => { el.style.transition = "none"; el.style.animation = `dyFloat ${4 + (k % 3)}s ease-in-out ${k * 0.4}s infinite`; }, 900);
        }, base + k * 80));
        const mascot = $('img', g);
        if (mascot) mascot.style.animation = "dyFloat 4.5s ease-in-out infinite";
      }
    }

    // ---------- revelar ao rolar ----------
    const inGate = (el: Element) => !!gate && gate.contains(el);
    const els = hidden(document).filter((el) => !inGate(el));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const st = el.getAttribute("style") ?? "";
        const isScale = /scale\(/.test(st), isDivider = /scaleX\(0\)/.test(st);
        const sibs = el.parentElement ? Array.from(el.parentElement.children) : [];
        const delay = Math.min(sibs.indexOf(el), 5) * (isScale ? 140 : 90);
        el.style.transition = isDivider ? `transform 1.1s ${EASE} ${delay}ms` : isScale ? `opacity .6s ease ${delay}ms, transform .9s ${SPRING} ${delay}ms` : `opacity .8s ease ${delay}ms, transform .9s ${EASE} ${delay}ms`;
        el.style.opacity = "1"; el.style.transform = "none";
        io.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // ---------- partículas e brilho ----------
    $$('.fixed.inset-0.pointer-events-none > .absolute.rounded-full').forEach((el, i) => { el.style.opacity = "0.4"; el.style.animation = `dyTwinkle ${3 + (i % 4)}s ease-in-out ${i * 0.35}s infinite`; });
    $$('[style*="translateY(110vh)"]').forEach((el, i) => { el.style.transform = ""; el.style.opacity = "0"; el.style.animation = `dyRise ${13 + i * 2.2}s linear ${i * 2.4}s infinite`; });
    const heroHeart = $('.mb-8[style*="scale(0)"]');
    if (heroHeart) {
      later(() => { heroHeart.style.transition = `transform 1.2s ${SPRING}`; heroHeart.style.transform = "none"; const svg = $("svg", heroHeart); if (svg) svg.style.animation = "dyGlow 3s ease-in-out infinite"; heroHeart.classList.add("dy-pulse"); }, isExample ? 2200 : 300);
    }
    const heroTitle = $("h1[style*='Playfair']");
    if (heroTitle) heroTitle.style.transition = "text-shadow 1s";

    // ---------- contador ao vivo ----------
    if (isExample) {
      const since = $$("span").find((s) => /(desde)/i.test(s.textContent ?? "") && /\d{4}/.test(s.textContent ?? ""));
      const m = since?.textContent?.match(/(\d{1,2}) de ([a-zçãé]+) de (\d{4})/i);
      const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
      if (m && mi >= 0) {
        const start = new Date(+m[3], mi, +m[1]);
        const boxes = $$(".tabular-nums").filter((n) => n.classList.contains("block"));
        const pill = $$(".font-mono");
        const days = $$("span.font-semibold").find((n) => /^[\d.]+$/.test(n.textContent?.trim() ?? ""));
        const tick = () => {
          const d = diff(start, new Date());
          boxes.forEach((b) => {
            const label = b.parentElement?.parentElement?.lastElementChild?.textContent?.trim().toLowerCase();
            const v = label?.startsWith("ano") ? d.y : label?.startsWith("mes") ? d.m : label?.startsWith("dia") ? d.d : null;
            if (v !== null && v !== undefined) b.textContent = String(v);
          });
          const two = (n: number) => String(n).padStart(2, "0");
          if (pill.length === 3) { pill[0].textContent = two(d.h); pill[1].textContent = two(d.mi); pill[2].textContent = two(d.s); }
          if (days) days.textContent = Math.floor((Date.now() - start.getTime()) / 86400000).toLocaleString("pt-BR");
        };
        tick(); const id = setInterval(tick, 1000); cleanups.push(() => clearInterval(id));
      }
    }

    // ---------- música: "Clique para descobrir" ----------
    const music = MUSIC[path];
    let bar: HTMLElement | null = null;
    let spotCtl: SpotifyCtl | null = null;
    let ytIfr: HTMLIFrameElement | null = null;
    let isPaused = false;
    if (music?.kind === "spotify") loadSpotifyApi();
    const setPausedUi = (p: boolean) => {
      isPaused = p;
      const b = bar && $("[data-bar-pause]", bar); if (b) b.innerHTML = ico(p ? "play" : "pause", "w-4 h-4");
      const st = bar && $("[data-bar-status]", bar); if (st) st.textContent = p ? "Pausado" : "Tocando agora";
      const hd = $("[data-now]"); if (hd) hd.textContent = p ? "Pausado" : "Tocando";
    };
    const playMusic = (btn: HTMLElement) => {
      if (!music) return;
      const card = btn.closest<HTMLElement>(".rounded-3xl");
      if (!card) return;
      const eq = (n: number) => Array.from({ length: n }, () => `<div class="w-[3px] rounded-full" style="background:rgb(244,114,182);height:60%"></div>`).join("");
      const player = music.kind === "spotify"
        ? `<div data-spotify class="rounded-2xl overflow-hidden" style="min-height:152px"></div>`
        : `<div class="rounded-2xl overflow-hidden" style="aspect-ratio:16/9"><iframe data-yt frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" width="100%" height="100%" src="https://www.youtube.com/embed/${music.id}?autoplay=1&playsinline=1&enablejsapi=1"></iframe></div>`;
      card.style.transition = "box-shadow .8s"; card.style.boxShadow = "0 25px 70px -12px rgba(244,114,182,.55)";
      card.innerHTML = `<div class="p-4 dy-in"><div class="text-center mb-4"><div class="flex items-center justify-center gap-2 mb-2"><div class="flex items-end gap-[3px] h-5" data-eq>${eq(4)}</div><span class="text-sm font-medium mx-2" style="color:rgb(244,114,182)" data-now>Tocando</span><div class="flex items-end gap-[3px] h-5" data-eq>${eq(4)}</div></div></div><div class="dy-in" style="animation-delay:.25s">${player}</div></div>`;
      $$("[data-eq]", card).forEach((c, i) => cleanups.push(startEq(c, i)));
      const host = $("[data-spotify]", card);
      if (host && music.kind === "spotify") mountSpotify(host, music.id, (playing) => setPausedUi(!playing)).then((c) => { spotCtl = c; cleanups.push(() => c.destroy()); });
      ytIfr = $<HTMLIFrameElement>("iframe[data-yt]", card);
      bar = document.createElement("div");
      bar.className = "fixed bottom-0 left-0 right-0 z-40 safe-area-bottom";
      bar.style.cssText = "background:linear-gradient(135deg,rgba(0,0,0,.85),rgba(0,0,0,.95));backdrop-filter:blur(20px);border-top:1px solid rgba(244,114,182,.15);transform:translateY(100%);transition:transform .7s " + SPRING;
      bar.innerHTML = `<div class="flex items-center gap-3 px-4 py-3 max-w-md mx-auto"><button class="p-2.5 rounded-full transition-all flex-shrink-0" aria-label="Pausar música" data-bar-pause style="box-shadow:0 4px 15px -3px rgba(244,114,182,.25);color:#fff;background:rgba(244,114,182,.35)">${ico("pause", "w-4 h-4")}</button><div class="flex items-end gap-[3px] h-5" data-eq>${eq(5)}</div><div class="flex-1 min-w-0"><p class="text-sm font-medium truncate" style="color:rgb(190,24,93)">Nossa Música</p><p class="text-xs text-white/40 truncate" data-bar-status>Tocando agora</p></div><button class="p-2 rounded-full transition-colors" aria-label="Minimizar player" data-bar-min style="color:rgb(244,114,182)">${ico("music", "w-4 h-4")}</button></div>`;
      document.body.appendChild(bar);
      cleanups.push(startEq($("[data-eq]", bar)!, 2));
      requestAnimationFrame(() => requestAnimationFrame(() => { if (bar) bar.style.transform = "none"; }));
      heartBurst(btn.getBoundingClientRect().left + btn.offsetWidth / 2, btn.getBoundingClientRect().top + 20, "rgb(244,114,182)", 16);
    };

    // ---------- carrossel de fotos ----------
    const momentos = $$("h2").find((h) => h.textContent?.includes("Nossos Momentos"))?.closest("section");
    if (momentos) {
      const stage = $(".aspect-\\[4\\/3\\]", momentos);
      const main = stage ? $<HTMLImageElement>("img.object-contain", stage) : null;
      const thumbs = $$<HTMLButtonElement>("button.flex-shrink-0", momentos);
      const srcs = thumbs.map((b) => $<HTMLImageElement>("img", b)?.getAttribute("src") ?? "");
      if (stage && main && srcs.length > 1) {
        let i = 0, playing = true, timer: ReturnType<typeof setTimeout> | undefined;
        const counter = $(".absolute.top-4.right-4", stage);
        const ctrl = $$<HTMLButtonElement>("button.absolute", stage);
        const prev = ctrl.find((b) => b.classList.contains("left-4")), next = ctrl.find((b) => b.classList.contains("right-4"));
        const dotsWrap = $(".absolute.bottom-4", stage);
        const dotBox = dotsWrap?.firstElementChild as HTMLElement | undefined;
        const pauseBtn = dotsWrap?.lastElementChild as HTMLButtonElement | undefined;
        main.style.animation = "dyKen 6s ease-out both";
        const paint = () => {
          main.style.opacity = "0";
          later(() => { main.src = srcs[i]; main.style.animation = "none"; void main.offsetWidth; main.style.animation = "dyKen 6s ease-out both"; main.style.transition = "opacity .5s"; main.style.opacity = "1"; }, 180);
          if (counter) counter.textContent = `${i + 1} / ${srcs.length}`;
          thumbs.forEach((b, k) => { const on = k === i; b.style.opacity = on ? "1" : "0.5"; b.style.transform = `scale(${on ? 1.05 : 1})`; b.style.border = `2px solid ${on ? "rgb(244,114,182)" : "transparent"}`; b.style.boxShadow = on ? "0 0 20px rgba(244,114,182,.25)" : "none"; });
          const strip = thumbs[i].parentElement;
          if (strip) strip.scrollTo({ left: thumbs[i].offsetLeft - strip.clientWidth / 2 + thumbs[i].clientWidth / 2, behavior: "smooth" });
          if (dotBox) {
            dotBox.innerHTML = "";
            srcs.forEach((_, k) => {
              const d = document.createElement("button"); d.className = "relative h-2 rounded-full transition-all duration-500 overflow-hidden"; d.setAttribute("aria-label", `Foto ${k + 1}`);
              d.style.width = k === i ? "32px" : "8px"; d.style.background = k === i ? "transparent" : "rgba(255,255,255,0.3)";
              if (k === i) d.innerHTML = `<div class="absolute inset-0 rounded-full" style="background:rgba(255,255,255,.3)"></div><div class="absolute inset-0 rounded-full origin-left" style="background:rgb(244,114,182);transform:scaleX(0);transition:transform ${playing ? 5 : 0}s linear" data-fill></div>`;
              d.onclick = () => { i = k; paint(); };
              dotBox.appendChild(d);
            });
            const fill = $("[data-fill]", dotBox); if (fill && playing) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transform = "scaleX(1)"; }));
          }
          clearTimeout(timer); if (playing) timer = setTimeout(() => { i = (i + 1) % srcs.length; paint(); }, 5000);
        };
        if (prev) prev.onclick = () => { i = (i - 1 + srcs.length) % srcs.length; paint(); };
        if (next) next.onclick = () => { i = (i + 1) % srcs.length; paint(); };
        thumbs.forEach((b, k) => { b.onclick = () => { i = k; paint(); }; });
        if (pauseBtn) pauseBtn.onclick = () => { playing = !playing; pauseBtn.innerHTML = ico(playing ? "pause" : "play", "w-4 h-4 text-white"); paint(); };
        let x0: number | null = null;
        stage.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
        stage.ontouchend = (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { i = (i + (dx < 0 ? 1 : -1) + srcs.length) % srcs.length; paint(); } x0 = null; };
        paint();
        cleanups.push(() => clearTimeout(timer));
      }
    }

    // ---------- livro de visitas (exemplo): adiciona mensagem localmente ----------
    const gbForm = $("form");
    if (isExample && gbForm) gbForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = gbForm as HTMLFormElement; const inputs = $$<HTMLInputElement | HTMLTextAreaElement>("input, textarea", f);
      const name = inputs[0]?.value.trim(), msg = inputs[1]?.value.trim(); if (!name || !msg) return;
      const list = $$("p").find((p) => /mensagens? de carinho|mensagens/.test(p.textContent ?? ""))?.parentElement ?? f.parentElement;
      const item = document.createElement("div"); item.className = "p-5 rounded-2xl dy-in"; item.style.cssText = "background:rgba(244,114,182,.06);border:1px solid rgba(244,114,182,.15);backdrop-filter:blur(20px);margin-top:16px";
      item.innerHTML = `<div class="flex items-start gap-3"><div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:rgba(244,114,182,.2);border:1px solid rgba(244,114,182,.4)">${ico("heart", "w-4 h-4")}</div><div class="flex-1 min-w-0"><div class="flex items-center justify-between gap-2 mb-1"><p class="font-medium truncate"></p><p class="text-xs flex-shrink-0" style="opacity:.5">agora mesmo</p></div><p class="text-sm whitespace-pre-wrap break-words" style="opacity:.75"></p></div></div>`;
      item.querySelectorAll("p")[0].textContent = name; item.querySelectorAll("p")[2].textContent = msg;
      f.insertAdjacentElement("afterend", item); inputs.forEach((x) => { x.value = ""; }); void list;
    });

    // ---------- cliques ----------
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      const btn = target.closest("button");
      if (!btn) return;
      const text = (btn.textContent ?? "").trim().toLowerCase();
      if (btn.closest("a")) return;
      if (gate && gate.contains(btn)) {
        const r = btn.getBoundingClientRect();
        heartBurst(r.left + r.width / 2, r.top + r.height / 2);
        gate.style.transition = "opacity .9s ease .25s, transform .9s ease .25s"; gate.style.opacity = "0"; gate.style.transform = "scale(1.06)"; gate.style.pointerEvents = "none";
        document.body.style.overflow = "";
        const g = gate; later(() => g.remove(), 1250); gate = null;
        return;
      }
      if (text.includes("clique para descobrir")) { playMusic(btn); return; }
      if (btn.hasAttribute("data-bar-pause") && bar) {
        if (spotCtl) spotCtl.togglePlay();
        else if (ytIfr) { ytCommand(ytIfr, isPaused ? "playVideo" : "pauseVideo"); setPausedUi(!isPaused); }
        return;
      }
      if (btn.hasAttribute("data-bar-min") && bar) { bar.style.transform = "translateY(100%)"; return; }
      if (text.includes("ver exemplo")) window.location.href = routes.example;
      else if (text.includes("compartilhar no story")) { const u = window.location.href; if (navigator.share) navigator.share({ url: u }).catch(() => {}); else navigator.clipboard.writeText(u); }
      else if (btn.title === "WhatsApp") window.open(`https://wa.me/?text=${encodeURIComponent("Olha que lindo 💌 " + window.location.href)}`, "_blank");
      else if (btn.title === "Copiar link") navigator.clipboard.writeText(window.location.href);
      else if (text.includes("criar")) window.location.href = routes.create;
      else if (text.includes("ver mais") && text.includes("prints")) {
        const sec = document.getElementById("prints");
        sec?.querySelectorAll<HTMLElement>('[class*="hidden"]').forEach((n) => n.classList.remove("hidden"));
        btn.remove();
      } else if (btn.getAttribute("class")?.includes("relative block w-full")) window.location.href = routes.example;
    };
    document.addEventListener("click", onClick);
    cleanups.push(() => document.removeEventListener("click", onClick));

    return () => { cleanups.forEach((f) => f()); timers.forEach(clearTimeout); document.body.style.overflow = ""; bar?.remove(); };
  }, [path]);

  return null;
}
