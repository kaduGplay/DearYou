import { searchTracks } from "@/lib/spotify";
import { err, json } from "@/lib/guard";
import { allow, clientIp } from "@/lib/ratelimit";

export async function GET(req: Request) {
  if (!await allow(`sp:${clientIp(req)}`, 90, 60_000)) return err("Muitas buscas. Aguarde um instante.", 429);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ tracks: [] });
  try {
    return json({ tracks: await searchTracks(q.slice(0, 80)) });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Erro na busca", 502);
  }
}
