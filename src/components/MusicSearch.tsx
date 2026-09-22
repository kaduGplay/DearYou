/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import type { Track } from "@/lib/spotify";

/** Busca de músicas no Spotify; ao escolher, devolve o link da faixa. */
export default function MusicSearch({ onPick }: { onPick: (url: string, t: Track) => void }) {
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = q.trim().length >= 2;

  useEffect(() => {
    if (!active) return;
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setTracks(d.tracks); setError("");
      } catch (e) { if ((e as Error).name !== "AbortError") setError("Não foi possível buscar agora. Cole o link da música abaixo."); }
      setLoading(false);
    }, 350);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q, active]);

  const shown = active ? tracks : [];
  return (
    <div>
      <input className="input" placeholder="Buscar música no Spotify…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      {active && loading && <p className="mt-2 text-xs text-[#6b6b80]">Buscando…</p>}
      {active && error && <p className="mt-2 text-sm text-pink-600">{error}</p>}
      {shown.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-pink-100 p-1">
          {shown.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => { onPick(t.url, t); setQ(""); setTracks([]); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-pink-50">
                {t.image ? <img src={t.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-pink-100" />}
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{t.name}</span><span className="block truncate text-xs text-[#6b6b80]">{t.artists}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
