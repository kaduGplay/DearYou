import { destroySession } from "@/lib/auth";
import { json } from "@/lib/guard";

export async function POST() {
  await destroySession();
  return json({ ok: true });
}
