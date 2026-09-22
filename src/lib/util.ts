import { nanoid } from "nanoid";
import { db } from "./db";

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const RESERVED = new Set(["api", "auth", "dashboard", "editor", "preview", "checkout", "termos", "privacidade", "amizade", "pai", "admin", "_next", "u"]);

export async function uniqueSlug(base: string, ignorePageId?: string) {
  let slug = slugify(base) || "nos";
  if (RESERVED.has(slug)) slug += "-1";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${nanoid(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
    const hit = await db.page.findUnique({ where: { slug: candidate } });
    if (!hit || hit.id === ignorePageId) return candidate;
  }
  return `${slug}-${nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
}

export function isValidSlug(s: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(s) && !RESERVED.has(s);
}

/** Converte link do Spotify/YouTube em URL de embed. */
export function musicEmbed(url: string): { kind: "spotify" | "youtube"; src: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("spotify.com")) {
      const m = u.pathname.match(/\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
      if (m) return { kind: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` };
    }
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}?rel=0` };
    }
  } catch {}
  return null;
}

export function pageIsLive(p: { status: string; expiresAt: Date | null }) {
  if (p.status !== "published") return false;
  return !p.expiresAt || p.expiresAt.getTime() > Date.now();
}
