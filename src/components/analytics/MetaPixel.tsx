"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, flushMetaEvents, trackMeta } from "@/lib/meta-pixel";

export default function MetaPixel() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const excluded = pathname === "/auth/reset-password" || pathname === "/preview-embed";
  useEffect(() => {
    window.addEventListener("dearyou:meta-ready", flushMetaEvents);
    flushMetaEvents();
    return () => window.removeEventListener("dearyou:meta-ready", flushMetaEvents);
  }, []);
  useEffect(() => {
    if (excluded || !pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackMeta("PageView");
    if (["/", "/amor", "/amizade", "/pai", "/precos", "/exemplo", "/exemplo-amizade", "/exemplo-pai"].includes(pathname)) {
      trackMeta("ViewContent", { content_name: pathname === "/" ? "DearYou" : pathname.slice(1), content_category: "paginas-personalizadas" });
    }
  }, [pathname, excluded]);
  if (excluded) return null;
  return <Script id="dearyou-meta-pixel" strategy="afterInteractive" onReady={flushMetaEvents}>{`
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('set','autoConfig',false,'${META_PIXEL_ID}');
    fbq('init','${META_PIXEL_ID}');
    window.dispatchEvent(new Event('dearyou:meta-ready'));
  `}</Script>;
}
