/** Efeitos visuais compartilhados (exemplos estáticos e páginas reais). */
const CSS = `
@keyframes dyFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes dyRise{0%{transform:translateY(105vh) scale(.8);opacity:0}10%{opacity:.55}90%{opacity:.55}100%{transform:translateY(-15vh) scale(1.15);opacity:0}}
@keyframes dyTwinkle{0%,100%{opacity:.1;transform:scale(.7)}50%{opacity:.75;transform:scale(1.4)}}
@keyframes dyBurst{0%{transform:translate(-50%,-50%) scale(.3);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.3) rotate(var(--rot));opacity:0}}
@keyframes dyGlow{0%,100%{filter:drop-shadow(0 0 22px rgba(244,114,182,.45))}50%{filter:drop-shadow(0 0 46px rgba(244,114,182,.85))}}
@keyframes dyPulse{0%,100%{transform:scale(1)}14%{transform:scale(1.14)}28%{transform:scale(1)}42%{transform:scale(1.09)}}
@keyframes dyShine{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes dyKen{from{transform:scale(1)}to{transform:scale(1.08)}}
@keyframes dyIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.dy-pulse{animation:dyPulse 2.4s ease-in-out infinite}
.dy-shine{background-image:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);background-size:200% 100%;animation:dyShine 3.2s linear infinite}
.dy-in{animation:dyIn .6s cubic-bezier(.2,.7,.2,1) both}
`;

export function injectFx() {
  if (typeof document === "undefined" || document.getElementById("dy-fx")) return;
  const s = document.createElement("style"); s.id = "dy-fx"; s.textContent = CSS; document.head.appendChild(s);
}

const HEART = (c: string) => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c}"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

/** Explosão de corações a partir de um ponto da tela. */
export function heartBurst(x: number, y: number, color = "rgb(244,114,182)", n = 26) {
  injectFx();
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:400;overflow:hidden";
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, r = 90 + Math.random() * 170, size = 12 + Math.random() * 20;
    const h = document.createElement("div");
    h.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 60}px;--rot:${(Math.random() - 0.5) * 120}deg;animation:dyBurst ${1.1 + Math.random() * 0.8}s cubic-bezier(.15,.7,.3,1) ${Math.random() * 0.12}s forwards`;
    h.innerHTML = HEART(i % 3 === 0 ? "#fff" : color);
    box.appendChild(h);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2400);
}

/** Anima barrinhas de equalizador (filhos diretos) até chamar a função devolvida. */
export function startEq(container: HTMLElement, phase = 0) {
  let raf = 0; const t0 = performance.now();
  const tick = (t: number) => {
    const s = (t - t0) / 1000;
    Array.from(container.children).forEach((c, i) => { (c as HTMLElement).style.height = `${35 + 65 * Math.abs(Math.sin(s * (2.1 + i * 0.55) + i * 1.7 + phase))}%`; });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
