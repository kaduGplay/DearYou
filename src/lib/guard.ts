import { NextResponse } from "next/server";
import { db } from "./db";
import { getUser } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function ownPage(pageId: string) {
  const user = await getUser();
  if (!user) return { error: err("Não autenticado", 401) } as const;
  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page || page.userId !== user.id) return { error: err("Página não encontrada", 404) } as const;
  return { user, page } as const;
}

/** Antes de pagar: livre. Depois: 24h de edição completa; depois só a timeline. */
export function canEditAll(p: { status: string; editableUntil: Date | null }) {
  if (p.status === "draft") return true;
  return !!p.editableUntil && p.editableUntil.getTime() > Date.now();
}
