export type Track = { id: string; name: string; artists: string; image: string | null; url: string };

let cached: { token: string; exp: number } | null = null;

async function token() {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify não configurado");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Falha ao autenticar no Spotify");
  const d = await res.json();
  cached = { token: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return cached.token;
}

export async function searchTracks(q: string): Promise<Track[]> {
  const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=8&market=BR&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error("Falha na busca do Spotify");
  const d = await res.json();
  return (d.tracks?.items ?? []).map((t: { id: string; name: string; artists: { name: string }[]; album: { images: { url: string }[] }; external_urls: { spotify: string } }) => ({
    id: t.id, name: t.name, artists: t.artists.map((a) => a.name).join(", "), image: t.album.images.at(-1)?.url ?? null, url: t.external_urls.spotify,
  }));
}
