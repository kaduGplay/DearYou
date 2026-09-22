import { put, del, head } from "@vercel/blob";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

function cloudStorage() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.NODE_ENV === "production") throw new Error("BLOB_READ_WRITE_TOKEN não configurado");
  return false;
}
const local = (file: string) => path.join(process.cwd(), "uploads", file);
export async function saveImage(file: string, bytes: Buffer, contentType: string) {
  if (cloudStorage()) {
    await put(file, bytes, { access: "public", addRandomSuffix: false, contentType });
  } else {
    await mkdir(path.dirname(local(file)), { recursive: true });
    await writeFile(local(file), bytes);
  }
}
export async function deleteImage(file: string) {
  if (cloudStorage()) await del(file);
  else await unlink(local(file)).catch(() => {});
}
export async function imageResponse(file: string, contentType: string) {
  if (cloudStorage()) {
    const blob = await head(file);
    return Response.redirect(blob.url, 307);
  }
  const bytes = await readFile(local(file));
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
