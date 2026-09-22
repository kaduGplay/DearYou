import { SignJWT, jwtVerify } from "jose";

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurado");
  return new TextEncoder().encode(s ?? "dev-secret-change-me-please-32chars");
};

/** Token de recuperação: expira em 1h e deixa de valer assim que a senha muda (pw = fim do hash atual). */
export const signReset = (uid: string, passwordHash: string) =>
  new SignJWT({ uid, pw: passwordHash.slice(-12), t: "reset" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(key());

export async function readReset(token: string) {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.t !== "reset") return null;
    return { uid: String(payload.uid), pw: String(payload.pw) };
  } catch { return null; }
}
