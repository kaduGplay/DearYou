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

O Pixel continua ativo no navegador. O envio pelo servidor está implementado e é ativado por `META_CAPI_ACCESS_TOKEN`; sem esse token, os eventos ficam na fila e não são apresentados como entregues à Meta. Não confundir o token da Meta com o token da Vercel.

Validação automatizada sem enviar compras fictícias à Meta:

```bash
node --test tests/meta-pixel.test.mjs
```

No Gerenciador de Eventos, use Testar eventos para validar a recepção na conta da Meta.

## Webhook e confirmação de pagamentos

Cada PIX é criado com `callbackUrl=${APP_URL}/api/webhooks/voidpay`. Em produção: `https://dearyou-presenteperfeito.vercel.app/api/webhooks/voidpay`. O endereço é enviado por cobrança; não depende de cadastrar manualmente cada PIX no painel da VoidPay.

O webhook localiza o pedido pelo ID da transação ou identificador da cobrança. Tokens recebidos são conferidos; notificações sem token só podem solicitar uma consulta autenticada à VoidPay. O status declarado no corpo não basta para publicar: o servidor valida ID, valor e status pela API do gateway. Se a consulta falha ou o aviso chega antes da confirmação estar disponível, responde 503 para solicitar reenvio.

Pagamento e publicação são atualizados em uma transação no banco. Avisos repetidos não renovam a validade da página, e falhas atrasadas não rebaixam pedidos pagos. `pixGeneratedAt`, `paidAt`, `webhookReceivedAt` e `providerCheckedAt` registram os momentos relevantes. Reembolso e chargeback precisam de tratamento próprio; não são interpretados como nova compra.

## API de Conversões e recuperação

A tabela `MetaConversion` guarda os eventos `PIXGenerated` e `Purchase`. Seus IDs correspondem aos eventos do navegador (`pix-generated:<pedido>` e `purchase:<pedido>`) para deduplicação na Meta. Valores vêm do banco em BRL. A atribuição é capturada no checkout do cliente, nunca pelo IP da VoidPay. E-mail e identificador do usuário são enviados em SHA-256.

Configure `META_CAPI_ACCESS_TOKEN` na Vercel para ativar o envio. `META_TEST_EVENT_CODE` é opcional para testes na Meta e deve ser removido após a validação. Eventos só recebem `sent` após confirmação da API; erros permanecem na fila com novas tentativas, preservando os horários originais. Eventos com mais de sete dias não são reenviados.

`GET /api/cron/payments` exige `CRON_SECRET`, configurado na Vercel. A rotina diária (`0 8 * * *`, UTC, conforme disponibilidade do agendador) consulta até 12 pedidos pendentes recentes e tenta reenviar até 25 eventos. É uma recuperação adicional aos callbacks imediatos e às consultas do checkout/painel. O plano Hobby não permite execução mais frequente; alto volume exige ampliar o processamento de recuperação.

```bash
node --test tests/*.test.mjs
```
