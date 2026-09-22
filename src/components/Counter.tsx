"use client";
import { useEffect, useState } from "react";

/** Diferença calendário (anos, meses, dias) + h/m/s entre `from` e agora. */
export function diff(from: Date, now = new Date()) {
  let y = now.getFullYear() - from.getFullYear();
  let m = now.getMonth() - from.getMonth();
  let d = now.getDate() - from.getDate();
  let h = now.getHours() - from.getHours();
  let mi = now.getMinutes() - from.getMinutes();
  let s = now.getSeconds() - from.getSeconds();
  if (s < 0) { s += 60; mi--; }
  if (mi < 0) { mi += 60; h--; }
  if (h < 0) { h += 24; d--; }
  if (d < 0) { d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); m--; }
  if (m < 0) { m += 12; y--; }
  return { y: Math.max(y, 0), m, d, h, mi, s };
}

export default function Counter({ start, className = "", cellClass = "", labelClass = "" }: { start: string; className?: string; cellClass?: string; labelClass?: string }) {
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);
  useEffect(() => {
    const from = new Date(start);
    const tick = () => setT(diff(from));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start]);
  const cells = t
    ? [["anos", t.y], ["meses", t.m], ["dias", t.d], ["horas", t.h], ["min", t.mi], ["seg", t.s]] as const
    : [["anos", 0], ["meses", 0], ["dias", 0], ["horas", 0], ["min", 0], ["seg", 0]] as const;
  return (
    <div className={`grid grid-cols-3 gap-3 sm:grid-cols-6 ${className}`}>
      {cells.map(([label, v]) => (
        <div key={label} className={`rounded-2xl px-2 py-3 text-center ${cellClass}`}>
          <div className="font-serif text-3xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className={`text-[11px] uppercase tracking-wider opacity-70 ${labelClass}`}>{label}</div>
        </div>
      ))}
    </div>
  );
}
