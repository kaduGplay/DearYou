export type PlanId = "dia" | "eterno";

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; tagline: string; priceCents: number; maxPhotos: number; durationHours: number | null; timeline: boolean; guestbook: boolean; features: string[] }
> = {
  dia: {
    id: "dia",
    name: "Plano 1 Dia",
    tagline: "Ideal para presentear",
    priceCents: 1990,
    maxPhotos: 10,
    durationHours: 24,
    timeline: false,
    guestbook: false,
    features: ["1 página personalizada", "Até 10 fotos", "Contador de tempo juntos", "Música do Spotify ou YouTube", "6 temas de cores", "Fica no ar por 24 horas"],
  },
  eterno: {
    id: "eterno",
    name: "Plano Eterno",
    tagline: "Para durar para sempre",
    priceCents: 3490,
    maxPhotos: 200,
    durationHours: null,
    timeline: true,
    guestbook: true,
    features: ["1 página personalizada", "Fotos ilimitadas", "Contador de tempo juntos", "Música do Spotify ou YouTube", "6 temas de cores", "Linha do tempo do casal", "Livro de visitas", "Nunca expira"],
  },
};

export const EDIT_WINDOW_HOURS = 24;

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const THEME_ORDER = ["rosa", "dourado", "ceu", "paixao", "oceano", "porDoSol", "floresta", "lavanda", "grafite", "aurora", "galaxia", "petalas"] as const;

const g3 = (a: string, b: string, c: string) => `linear-gradient(135deg, rgb(${a}) 0%, rgb(${b}) 50%, rgb(${c}) 100%)`;
const light = (a: string, b: string, c: string, d: string) => `linear-gradient(180deg, ${a} 0%, ${b} 30%, ${a} 60%, ${d} 100%)`;

/** accent/accentDark em "r,g,b". Temas claros usam texto escuro; escuros, texto branco. */
export const THEMES = {
  rosa: { name: "Branco e Rosa", dark: false, accent: "244,114,182", accentDark: "190,24,93", bg: light("#FFFBFC", "#fff5f9", "", "#fef1f6"), sw: "#f9a8d4" },
  dourado: { name: "Dourado", dark: false, accent: "245,158,11", accentDark: "180,83,9", bg: light("#FFFDF7", "#fffbeb", "", "#fef3c7"), sw: "#fcd34d" },
  ceu: { name: "Azul Céu", dark: false, accent: "59,130,246", accentDark: "29,78,216", bg: light("#F7FAFF", "#eff6ff", "", "#dbeafe"), sw: "#93c5fd" },
  paixao: { name: "Rosa", dark: true, accent: "244,63,94", accentDark: "244,63,94", bg: g3("76,5,25", "77,0,46", "59,7,100"), sw: "#f43f5e" },
  oceano: { name: "Oceano", dark: true, accent: "56,189,248", accentDark: "56,189,248", bg: g3("15,23,42", "30,58,138", "8,51,68"), sw: "#3b82f6" },
  porDoSol: { name: "Pôr do Sol", dark: true, accent: "249,115,22", accentDark: "249,115,22", bg: g3("67,20,7", "127,29,29", "77,0,46"), sw: "#f97316" },
  floresta: { name: "Floresta", dark: true, accent: "16,185,129", accentDark: "16,185,129", bg: g3("6,78,59", "20,83,45", "19,78,74"), sw: "#10b981" },
  lavanda: { name: "Lavanda", dark: true, accent: "168,85,247", accentDark: "168,85,247", bg: g3("59,7,100", "76,29,149", "112,26,117"), sw: "#a855f7" },
  grafite: { name: "Meia-noite", dark: true, accent: "148,163,184", accentDark: "148,163,184", bg: g3("17,24,39", "15,23,42", "24,24,27"), sw: "#94a3b8" },
  aurora: { name: "Aurora Boreal", dark: true, accent: "0,255,170", accentDark: "0,255,170", bg: g3("2,11,26", "10,22,40", "5,16,26"), sw: "#00ffaa" },
  galaxia: { name: "Galáxia", dark: true, accent: "138,100,255", accentDark: "138,100,255", bg: g3("5,0,26", "13,0,48", "3,0,20"), sw: "#8a64ff" },
  petalas: { name: "Pétalas de Rosa", dark: true, accent: "255,154,139", accentDark: "255,154,139", bg: g3("26,10,13", "31,15,16", "26,13,8"), sw: "#ff9a8b" },
} as const;
export type ThemeId = keyof typeof THEMES;

export const STYLES = {
  classica: { name: "Clássica", desc: "Contador, fotos e timeline", emoji: "✨", eterno: false },
  carta: { name: "Carta de Amor", desc: "Formato carta elegante", emoji: "💌", eterno: true },
  interativa: { name: "Carta Interativa", desc: "Envelope que se abre", emoji: "✉️", eterno: true },
  quiz: { name: "Quiz do Casal", desc: "Perguntas com prêmio", emoji: "🎁", eterno: true },
} as const;
export type StyleId = keyof typeof STYLES;

export const KINDS = {
  amor: { label: "De Amor", emoji: "💌", counterLabel: "juntos há", recipientLabel: "Nome da pessoa amada", dateLabel: "Início do relacionamento" },
  amizade: { label: "De Amizade", emoji: "💛", counterLabel: "de amizade há", recipientLabel: "Nome do(a) amigo(a)", dateLabel: "Início da amizade" },
  pai: { label: "De Pai", emoji: "💙", counterLabel: "sendo seu filho(a) há", recipientLabel: "Nome do seu pai", dateLabel: "Data de nascimento" },
} as const;
export type KindId = keyof typeof KINDS;
