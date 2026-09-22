/** Envia e-mail pelo Resend; nunca registra links de recuperação em produção. */
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export async function sendEmail(to: string, subject: string, body: string) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") return false;
    console.log(`[email dev] para: ${to}\n${subject}\n${body}`);
    return true;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text: body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("[email] Falha no envio", response.status);
    return response.ok;
  } catch {
    console.error("[email] Serviço indisponível");
    return false;
  }
}
