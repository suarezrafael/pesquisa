# Plano: backend + contas (fase comercial) — 100% grátis até o primeiro real de receita

Escrito em: 2026-08-22. Responde ao pedido do usuário: "faz um plano do back end + contas
primeiro, isso precisa ser primeiro 100% free na infra, procures server que de pra hospedar free
... estruture o plano. cosmeticos desbloqueaveis por assinatura", como continuação da análise de
`prompt.md` §15 (estratégia de monetização) feita antes deste documento.

Este plano cobre só a fundação (contas + entitlements). A implementação de cada fase vira um
laboratório próprio (`labs/lab-NN-slug/`) quando for construída — este documento é a referência
que amarra todos eles.

## Achado crítico antes de qualquer coisa: Vercel Hobby proíbe uso comercial

Pesquisa feita ao vivo (não de memória) na documentação oficial da Vercel, em 2026-08-22:

> "As stated in the fair use guidelines, the Hobby plan restricts users to **non-commercial,
> personal use only**." — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)

O jogo está hospedado hoje no Vercel Hobby (`https://app-two-flax-92.vercel.app`). Isso é
perfeitamente válido enquanto o jogo é gratuito — mas **no dia em que a primeira assinatura for
cobrada de verdade, continuar no plano Hobby vira violação dos termos de uso**, não é uma zona
cinzenta. Isso vale pro projeto INTEIRO (não só pro endpoint que processa pagamento) — a Vercel
define pelo uso geral da conta, não por rota.

Duas opções, sem meio-termo:
1. **Migrar a hospedagem do front-end pra Cloudflare Pages** antes do lançamento comercial —
   grátis, sem essa restrição documentada (Cloudflare não anuncia o free tier como "só uso
   pessoal", diferente da Vercel), e já é o mesmo provedor do relé de multiplayer (`app/
   server-cf-relay/`) — consolida em uma conta só.
2. **Assinar o Vercel Pro (US$20/mês)** no dia do lançamento comercial — único custo fixo
   recorrente do plano inteiro, se optar por não migrar.

**Recomendação**: opção 1 (migrar pra Cloudflare Pages), porque bate com o objetivo explícito do
usuário ("100% free na infra") e reaproveita infraestrutura já validada neste projeto (o relé v2
já roda em Cloudflare Workers desde o lab-54). A migração em si é uma fase à parte deste plano
(Fase F), não bloqueia o trabalho de contas/backend, que pode continuar no Vercel Hobby durante
todo o desenvolvimento/teste (só precisa estar resolvida ANTES de cobrar a primeira assinatura de
verdade).

## Arquitetura proposta (tudo em camada gratuita)

| Camada | Serviço | Por quê |
|---|---|---|
| Front-end (jogo + portal `/familia`) | Cloudflare Pages (migrar do Vercel antes do lançamento comercial) | Grátis, sem restrição de uso comercial documentada, mesma conta do relé |
| Relé de multiplayer (inalterado) | Cloudflare Workers + Durable Objects (`app/server-cf-relay/`) | Já em produção desde o lab-54, sem mudança |
| API de contas/pagamento (nova) | Cloudflare Workers (`app/server-accounts/`, novo) | Mesma plataforma do relé — sem conta nova pra gerenciar; free tier: 100k requisições/dia, mais que suficiente pro volume de portal+webhook |
| Banco de dados | **Neon Postgres** (sugestão do usuário, confirmada como boa escolha) | Serverless, driver HTTP compatível com Workers (`@neondatabase/serverless` — desenhado pra edge, sem conexão TCP persistente) |
| Autenticação (só do responsável, nunca da criança) | **Neon Auth** (Managed Better Auth, incluído no Neon Free) | Até 60.000 usuários ativos/mês grátis, e-mail/senha + OAuth, dados ficam no schema `neon_auth` do mesmo Postgres — sem vendor extra só pra auth |
| Pagamento | Stripe Checkout | Já era o plano do `prompt.md` §15.3 — sem mensalidade, só taxa por transação |
| E-mail (relatório semanal — fase tardia, opcional) | Resend (free: 3.000 e-mails/mês) | Só entra na Fase F, não bloqueia o lançamento |

**Limites do Neon Free** (conferidos ao vivo, 2026-08-22): 0,5 GB de storage/projeto, 100 CU-horas/
mês (dá pra rodar um compute de 0,25 CU por ~400h), autoscale até 2 CU, 5 GB de egress/mês,
suspende o compute sozinho após 5 min de inatividade (não dá pra desligar essa suspensão no Free —
aceitável aqui, o tráfego é baixo: login de responsável + checkout + entitlement, nada em tempo
real). Isso é **muito** folgado pro volume esperado (dezenas/centenas de famílias, não milhares).

## Princípio de design: a criança continua anônima, só o responsável tem conta

Isso não é só uma escolha técnica — é o requisito de `docs/prompts/01-seguranca.md` (minimização
de dados) já aplicado neste projeto (apelido em vez de nome real, sem conta pra jogar). O desenho
abaixo preserva isso:

- **A criança nunca faz login.** O jogo continua exatamente como é hoje — perfil/progresso 100%
  local (`localStorage`), sem conta, sem e-mail, sem PII de criança em lugar nenhum.
- **Só o responsável tem conta** (Neon Auth, e-mail/senha), acessível SÓ pelo portal `/familia`,
  atrás do parental gate (pergunta de matemática simples, `prompt.md` §15.3.1) — nunca alcançável
  pelo fluxo normal de jogo da criança.
- **Vínculo por código de pareamento, não por login da criança**: o responsável gera um código no
  portal (ex. 6 dígitos, expira em 15 min); a criança digita esse código UMA VEZ no jogo (tela
  simples, sem teclado de e-mail/senha). O jogo troca o código por um **token de entitlement**
  assinado (JWT de vida curta, ex. 7 dias) e guarda só isso em `localStorage` — nenhum dado do
  responsável (e-mail, nome) chega no client da criança.
- O jogo revalida o token em background quando online (silencioso, sem bloquear a jogabilidade se
  a família estiver offline — mesma filosofia "funciona offline" já aplicada ao PWA) e cai pro
  cache local se a rede cair.

## Modelo de dados (Postgres/Neon)

```sql
-- gerenciado pelo Neon Auth, não criamos à mão:
-- schema neon_auth.* (usuários responsáveis, sessões)

create table family_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references neon_auth.users(id),
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references family_accounts(id),
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null check (status in ('trialing','active','past_due','canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table pairing_codes (
  code text primary key,           -- 6 dígitos, curto de propósito (digitado à mão pela criança)
  family_account_id uuid not null references family_accounts(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);
```

Nenhuma tabela guarda nome/e-mail/progresso da criança — isso continua só no `localStorage` dela,
como hoje.

## Endpoints (novo Worker `app/server-accounts/`)

| Rota | Quem chama | Função |
|---|---|---|
| `POST /auth/*` | Portal `/familia` | Delega pro handler do Neon Auth (login/cadastro do responsável) |
| `POST /checkout` | Portal, autenticado | Cria sessão Stripe Checkout pra `family_account_id`, devolve URL |
| `POST /webhooks/stripe` | Stripe (servidor a servidor) | Verifica assinatura, atualiza `subscriptions.status` |
| `POST /pairing/generate` | Portal, autenticado | Gera `pairing_codes` novo pra família |
| `POST /pairing/redeem` | Jogo (criança, uma vez) | Troca código por token de entitlement assinado |
| `GET /entitlement` | Jogo (background, com o token já emitido) | Revalida/renova o token; responde só `{ active: boolean, expiresAt }` |

## Regra inegociável (já em `prompt.md` §15.1, repetida aqui de propósito)

O entitlement **só** gateia cosméticos (skins/cores/chapéus exclusivos, cabelo exclusivo, moeda
bônus se vier a existir). **Nunca** gateia quest, progressão, cooperação ou qualquer conteúdo
pedagógico — a checagem de assinatura só pode aparecer no código da lojinha (`AvatarShop.tsx` e
os catálogos em `src/data/`), nunca em `quests.ts`/`progression.ts`.

## Fases de implementação (cada uma vira um laboratório na hora de construir)

1. **Fase A — Fundação de dados**: criar projeto Neon, schema acima, Neon Auth configurado só pro
   login do responsável. Sem UI nova ainda, sem pagamento. Critério de pronto: consigo criar um
   responsável de teste e ver a linha em `neon_auth.users` via SQL.
2. **Fase B — Portal `/familia` (somente leitura)**: parental gate + tela de login/cadastro do
   responsável + dashboard mostrando "sem assinatura ativa". Nenhuma mudança no jogo da criança
   ainda.
3. **Fase C — Pagamento de verdade**: Stripe Checkout (modo teste primeiro) + webhook + tabela
   `subscriptions` atualizando ao vivo. Critério de pronto: assinar/cancelar no Stripe test mode
   reflete no portal em segundos.
4. **Fase D — Pareamento com o jogo**: portal gera código, jogo tem uma tela pra digitar (uma vez
   só), token de entitlement local com revalidação em background.
5. **Fase E — Cosmético de verdade gateado**: 1-2 itens novos na lojinha marcados
   `subscriptionOnly`, escondidos/bloqueados sem entitlement ativo — a entrega concreta do pedido
   "cosméticos desbloqueáveis por assinatura".
6. **Fase F — Lançamento comercial**: migrar hospedagem do front-end pro Cloudflare Pages (ver
   achado crítico acima) OU assinar Vercel Pro, sair do modo teste do Stripe, e (opcional, pode
   vir depois) relatório semanal por e-mail via Resend.

Cada fase é pequena o bastante pra ser 1-2 laboratórios, seguindo o mesmo convênio já usado no
resto do projeto (`labs/README.md`).

## Custo real neste plano

| Item | Custo até o lançamento | Custo depois de comercial |
|---|---|---|
| Neon (DB + Auth) | R$ 0 | R$ 0 (dentro dos limites do Free — folgado pro volume esperado) |
| Cloudflare Workers/Pages | R$ 0 | R$ 0 |
| Vercel (se não migrar) | R$ 0 | ~US$20/mês (viola ToS do Hobby se continuar aqui pago) |
| Stripe | R$ 0 (sem mensalidade) | só taxa por transação (confirmar % atual no dashboard Stripe na hora de configurar — varia por método de pagamento/região) |
| Resend (Fase F) | R$ 0 | R$ 0 até 3.000 e-mails/mês |

Ou seja: **o plano inteiro é R$ 0/mês até o dia do lançamento, e continua R$ 0/mês depois se a
Fase F migrar pra Cloudflare Pages** — só custa dinheiro se a opção escolhida for ficar no Vercel
Pro em vez de migrar.

## Pendências que exigem decisão do usuário (não técnicas — de produto)

- Preço da assinatura (prompt.md §15.4 sugere R$19,90-29,90/mês) — confirmar antes da Fase C.
- Quais cosméticos específicos ficam exclusivos de assinante na Fase E (sugestão: 1-2 novos, não
  reclassificar nada que já é comprável com moeda hoje — mudar a regra de itens existentes seria
  visto como "downgrade" por quem já jogou).
- Se migra pra Cloudflare Pages (recomendado, mantém tudo grátis) ou aceita Vercel Pro na Fase F.
