import type { KindId } from "@/lib/plans";

/** Modelos de declaração (textos próprios). {nome} vira o nome da pessoa. */
const M: Record<KindId, string[]> = {
  amor: [
    "{nome}, eu nunca imaginei que alguém pudesse tornar meus dias tão leves. Com você, até o silêncio tem graça. Obrigado(a) por ser meu abrigo e minha aventura ao mesmo tempo. Eu te escolheria em todas as vidas.",
    "Oi, {nome}. Fiz este cantinho para lembrar você do quanto é amado(a). Cada foto aqui guarda um pedaço da nossa história, e eu quero escrever muitos capítulos ainda ao seu lado. Te amo, hoje e sempre.",
    "{nome}, você chegou sem avisar e reorganizou tudo por dentro de mim. Aprendi a rir mais, a esperar menos e a agradecer mais. Se o amor tem endereço, eu já sei onde fica: onde você está.",
    "Tem dias que eu só quero te dizer: obrigado(a) por existir, {nome}. Pelo abraço que conserta, pelo olhar que entende, pela paciência com as minhas manias. Nosso tempo juntos é o meu presente favorito.",
    "{nome}, se eu pudesse voltar ao começo, faria tudo de novo, cada conversa, cada risada, cada erro que nos aproximou. Você é a minha melhor decisão.",
  ],
  amizade: [
    "{nome}, amigo(a) de verdade é raro, e eu tive a sorte de te encontrar. Você esteve nos meus melhores dias e segurou minha mão nos piores. Obrigado(a) por nunca soltar.",
    "Oi, {nome}. Fiz esta página para lembrar você do quanto significa pra mim. Entre memes, choros e aventuras, você virou família. Conta comigo pra tudo, sempre.",
    "{nome}, a vida ficou mais divertida depois de você. Só a gente entende as nossas piadas internas, e isso vale mais do que qualquer coisa. Que a gente envelheça rindo juntos.",
    "Tem gente que passa, e tem gente que fica. Você ficou, {nome}. Obrigado(a) por cada conselho, cada cafezinho e cada silêncio confortável.",
  ],
  pai: [
    "Pai, eu demorei a perceber o quanto você fez por mim em silêncio. Cada esforço, cada abraço apertado, cada 'vai dar certo'. Tudo o que sou tem um pouco de você. Obrigado(a) por tudo.",
    "{nome}, você é meu primeiro herói e continua sendo. Obrigado(a) por me ensinar a ser forte sem deixar de ser gentil. Te amo mais do que consigo dizer.",
    "Pai, mesmo quando a gente não fala, eu sei que você está por perto. Fiz esta página para guardar um pouco da nossa história e dizer, sem pressa: eu tenho orgulho de ser seu(sua) filho(a).",
    "{nome}, os seus conselhos viraram a minha bússola. Onde quer que eu vá, levo a sua coragem comigo. Obrigado(a) por ser o meu porto seguro.",
  ],
};

export function generateMessage(kind: KindId, name: string, avoid?: string) {
  const list = M[kind];
  let pick = list[Math.floor(Math.random() * list.length)];
  if (avoid && list.length > 1) while (pick.replace("{nome}", name) === avoid) pick = list[Math.floor(Math.random() * list.length)];
  return pick.replaceAll("{nome}", name || "amor");
}
