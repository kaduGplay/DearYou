import { imageResponse } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  if (!/^[a-zA-Z0-9]+\.(jpg|png|webp|gif)$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    return await imageResponse(file, TYPES[file.split(".")[1]]);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
