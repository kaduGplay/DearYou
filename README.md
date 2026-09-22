# DearYou

Construtor de páginas de presente com Next.js 16, React 19, Prisma 6 e PostgreSQL (Neon). Fotos persistem no Vercel Blob; o disco das funções não é usado em produção.

## Vercel

O conteúdo desta pasta fica na raiz do repositório `kaduGplay/DearYou`. Importe o repositório com framework Next.js, Root Directory vazio e Node.js 22. O `vercel.json` define a região São Paulo e o comando `npm run vercel-build`: aplica as migrations versionadas e compila o site. O `postinstall` gera o Prisma Client automaticamente.

Recursos de produção: projeto `dearyou`, banco Neon `dearyou-db` e Blob público `dearyou-photos`. A integração injeta as credenciais no ambiente Production. A branch `main` está vinculada ao projeto. Previews precisam de banco, Blob e variáveis próprios; as credenciais de produção não são compartilhadas automaticamente com previews.

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL com pool, fornecida pelo Neon. |
| `DATABASE_URL_UNPOOLED` | Conexão direta para migrations, fornecida pelo Neon. |
| `BLOB_READ_WRITE_TOKEN` | Token do armazenamento de fotos, fornecido pela integração Blob. |
| `SESSION_SECRET` | Segredo aleatório de 32+ caracteres para sessões e recuperação de senha. |
| `APP_URL` | URL pública HTTPS do site, usada nos links de recuperação e callbacks do pagamento. Atualize ao adicionar domínio próprio. |
| `PAYMENT_PROVIDER` | `voidpay` em produção; o pagamento simulado é bloqueado em produção. |
| `VOIDPAY_PUBLIC_KEY`, `VOIDPAY_SECRET_KEY` | Credenciais do pagamento PIX. |
| `VOIDPAY_BASE_URL` | URL do gateway VoidPay. |
| `VOIDPAY_DEFAULT_DOCUMENT` | CPF usado pela integração existente para gerar cobranças. |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Busca de músicas. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio de e-mails; o remetente deve pertencer a domínio verificado no Resend. |

Sem Resend, o site continua funcionando, mas a recuperação de senha retorna indisponibilidade e os avisos de visita não são enviados. Tokens de recuperação não são registrados em logs de produção. O pagamento precisa ser validado com uma transação real para confirmar o ciclo completo.

O webhook VoidPay é `POST /api/webhooks/voidpay`. Configure `APP_URL` para o endereço público correto e permita acesso público a esse endpoint na proteção de produção da Vercel.

## Desenvolvimento

Use um banco PostgreSQL separado. O antigo SQLite não é mais utilizado; seu arquivo local não é enviado ao GitHub.

```bash
cp .env.example .env
# Preencha as variáveis, sobretudo as duas URLs PostgreSQL e SESSION_SECRET.
npm ci
npm run db:migrate
npm run dev
```

Sem token Blob, o desenvolvimento salva fotos em `uploads/` localmente. Em produção o token é obrigatório. Fotos têm limite de 4 MB por arquivo e são enviadas individualmente para respeitar o limite de requisição das funções da Vercel. As imagens no Blob são públicas mediante URL; não use para documentos privados.

```bash
npm run lint
npm run typecheck
npm run build
```

As tentativas de login, cadastro, recuperação, busca e mensagens usam contadores atômicos no PostgreSQL compartilhados entre instâncias. Migrations são aplicadas com `prisma migrate deploy`, sem `db push` nem reset de dados em produção. Alterações destrutivas futuras exigem revisão e backup.

## Rotas

`/` → `/criar` → `/dashboard/pricing` → `/checkout/[id]` → `/dashboard/success` → `/[slug]`.
Também: `/amizade`, `/pai`, `/exemplo*`, `/precos`, `/termos`, `/privacidade`, `/auth/login`, `/auth/forgot-password`, `/dashboard`, `/editor/[id]`.

Nunca adicione `.env`, tokens, banco local ou fotos de usuários ao Git. O `.env.example` contém somente modelos sem credenciais.

## Pixel da Meta

Pixel `27993934270289164`, instalado no layout com carregamento assíncrono. Eventos: `PageView`, `ViewContent`, `CompleteRegistration`, `Lead`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`; personalizados: `CustomizeStep`, `Login`, `PIXGenerated`, `PIXCopied`. Não são enviados nomes, e-mails, senhas, mensagens ou fotos como parâmetros dos eventos. A coleta automática de formulários está desativada. Recuperação de senha com token e preview embutido não disparam PageView.

`Purchase` recebe o valor do pedido no banco, convertido de centavos para BRL. Só pedidos pagos via VoidPay são elegíveis: PIX pendente/gerado, falhas e pagamentos simulados não contam como compra. A tela de sucesso valida autenticação, titularidade e pagamento no servidor. O painel também recupera compras confirmadas nas últimas 24 horas quando o cliente retorna. O ID `purchase:<orderId>` é estável; armazenamento local e memória evitam repetir o evento no mesmo navegador.

A instalação atual usa o Pixel no navegador. Bloqueadores, limpeza de armazenamento, navegadores diferentes e clientes que pagam sem retornar podem afetar a medição. A API de Conversões depende de um token da Meta específico deste Pixel e ainda não está configurada. Não confundir o token da Meta com o token da Vercel.

Validação automatizada sem enviar compras fictícias à Meta:

```bash
node --test tests/meta-pixel.test.mjs
```

No Gerenciador de Eventos, use Testar eventos para validar a recepção na conta da Meta.
