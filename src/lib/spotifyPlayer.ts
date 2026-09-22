/** Player do Spotify via iFrame API: permite iniciar a música direto no clique (como no site original). */
export type SpotifyCtl = {
  play(): void; pause(): void; resume(): void; togglePlay(): void; destroy(): void;
  addListener(ev: string, cb: (e: { data: { isPaused: boolean } }) => void): void;
};
type Api = { createController(el: HTMLElement, opts: { uri: string; width: string; height: number }, cb: (c: SpotifyCtl) => void): void };

let api: Promise<Api> | null = null;

export function loadSpotifyApi(): Promise<Api> {
  if (api) return api;
  api = new Promise((res) => {
    const w = window as unknown as { onSpotifyIframeApiReady?: (a: Api) => void };
    w.onSpotifyIframeApiReady = (a) => res(a);
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true;
    document.body.appendChild(s);
  });
  return api;
}

/** Cria o player dentro de `box` e começa a tocar. `onState` recebe true quando está tocando. */
export async function mountSpotify(box: HTMLElement, trackId: string, onState: (playing: boolean) => void): Promise<SpotifyCtl> {
  const a = await loadSpotifyApi();
  const host = document.createElement("div");
  box.appendChild(host);
  return new Promise((res) => {
    a.createController(host, { uri: `spotify:track:${trackId}`, width: "100%", height: 152 }, (c) => {
      c.addListener("ready", () => c.play());
      c.addListener("playback_update", (e) => onState(!e.data.isPaused));
      c.play();
      res(c);
    });
  });
}

export const ytCommand = (ifr: HTMLIFrameElement | null, cmd: "playVideo" | "pauseVideo") =>
  ifr?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*");
