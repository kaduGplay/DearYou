"use client";
import { useEffect, useState } from "react";
import PublicPageView from "@/components/public/PublicPageView";
import type { PageData } from "@/components/public/types";

const EMPTY: PageData = { slug: "preview", kind: "amor", style: "classica", title: "Título da página", recipient: "", startDate: new Date().toISOString(), message: "", theme: "rosa", musicUrl: "", plan: "eterno", quizPrize: "", quizNeeded: 1, quiz: [], photos: [], timeline: [], guestbook: [] };

/** Prévia ao vivo do funil: recebe os dados do assistente (pai) por postMessage. */
export default function Embed() {
  const [data, setData] = useState<PageData>(EMPTY);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "dy-preview") setData(e.data.data); };
    window.addEventListener("message", on);
    window.parent.postMessage({ type: "dy-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  return <PublicPageView data={data} mode="embed" />;
}
