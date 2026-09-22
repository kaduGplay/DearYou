export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** Descobre o tipo real da imagem pelos primeiros bytes (não confia no tipo enviado pelo navegador). */
export function sniffImage(buf: Buffer): "jpg" | "png" | "gif" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return "gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
