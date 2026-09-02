# Contexto — Laboratório 96 — webhook do Stripe: idempotência + esquema realista

Preenchido em: 2026-08-25
Commit inicial → final: f7f1b8ad7384d81e5d22d8549798c4cb69bacd26..41f59e31bf26c67e06ef28698e75f15a317054a2

## O que foi feito
Corrigiu G8 (`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`), escolhido pelo usuário entre
G7/G8/revisitar tamanho das escolinhas logo após o lab-95.

- **`app/server-accounts/schema.sql`**: `subscriptions.status` aceitava só 4 dos 8 status reais do
  Stripe (faltavam `incomplete`, `incomplete_expired`, `unpaid`, `paused` — Pix/boleto no Brasil
  nasce `incomplete` com frequência, o que antes quebrava o `insert` e causava reenvio infinito do
  Stripe). Ampliado via `alter table ... drop/add constraint` (não editando a definição original,
  já que `migrate.mjs` só reaplica `if not exists`, que não altera uma tabela já existente). Também
  adicionados: índice único parcial em `stripe_subscription_id` (defesa contra duplicata sob
  entrega concorrente), coluna `last_event_created_at`, e nova tabela `stripe_webhook_events`
  (idempotência real).
- **`app/server-accounts/src/domain.ts`**: `isValidSubscriptionStatus` (falha fechada — status
  desconhecido do Stripe vira log + no-op, não um 500 que geraria reenvio infinito) e
  `isEventNewerThan` (recusa um evento mais antigo que o último já aplicado à mesma assinatura —
  o Stripe não garante ordem de entrega). 7 testes novos em `domain.test.ts` (total do Worker:
  14 → 21, todos passando).
- **`app/server-accounts/src/index.ts`**: `handleStripeWebhook` agora checa `stripe_webhook_events`
  ANTES de processar (devolve `{received:true, deduped:true}` sem reprocessar se o `event.id` já
  foi visto) e grava DEPOIS de processar com sucesso (se algo falhar no meio, o evento fica de fora
  da tabela, e uma reentrega do Stripe tenta de novo — comportamento certo). Novo handler pra
  `invoice.payment_failed` (buscando o status verdadeiro direto do Stripe, mesmo padrão já usado em
  `checkout.session.completed`, em vez de tentar inferir da própria fatura).
- **Migração aplicada no banco Neon de produção** (`npm run migrate`) e **conferida direto no
  banco** (constraint, índice, coluna e tabela novos — todos existem e batem com o esperado).
- **Worker deployado em produção** (`npm run deploy`,
  `https://missao-aprender-accounts.rafaelvs.workers.dev`, `/health` respondendo `{"ok":true}`).
- **Endpoint de webhook do Stripe (modo teste) inscrito em `invoice.payment_failed`** — não estava
  (só os 3 eventos originais), o que deixaria o handler novo morto. Corrigido via
  `stripe.webhookEndpoints.update` com autorização explícita do usuário (a primeira tentativa foi
  bloqueada pelo classificador de modo automático do Claude Code, por mexer em configuração de um
  serviço de terceiro).
- **Testado ao vivo contra o Worker real em produção**: evento `invoice.payment_failed` sintético,
  assinado de verdade (`Stripe.webhooks.generateTestHeaderString`), enviado ao endpoint deployado
  com um `stripe_subscription_id` inexistente de propósito (exercita toda a lógica sem tocar em
  nenhuma assinatura real). Primeira entrega: `200 {"received":true}`. Reentrega do MESMO
  `event.id`: `200 {"received":true,"deduped":true}` — idempotência confirmada ponta a ponta contra
  produção de verdade, não simulação. Linha de teste removida do banco depois.

## Decisões técnicas tomadas
- **`alter table` em vez de editar a definição original em `schema.sql`** — este projeto não tem
  migração versionada de verdade (G10, fora de escopo); `migrate.mjs` só reaplica o arquivo inteiro,
  idempotente via `if not exists`. Isso NÃO altera uma tabela já existente com uma constraint
  antiga — só um `alter table` de verdade a substitui num banco onde a tabela já existe.
- **`isValidSubscriptionStatus` em JS, não só a *check constraint* do banco** — deixa rejeitar um
  status desconhecido ANTES de tentar escrever, virando "ignora e loga" em vez de um erro de banco
  que geraria reenvio infinito do Stripe. Redundante com o `check` do banco por design (defesa em
  profundidade) — se o Stripe emitir um status novo que ainda não previmos, o comportamento é
  gracioso dos dois lados.
- **`invoice.payment_failed` busca o status FRESCO do Stripe (`stripe.subscriptions.retrieve`) em
  vez de inferir da fatura** — mesmo padrão já usado em `checkout.session.completed`, mais simples
  e mais correto que tentar mapear o estado da fatura pra um status de assinatura à mão.
- **Descoberta ao implementar, não suposição**: a versão instalada do SDK (`stripe` 22.5.0) não tem
  mais `invoice.subscription` no nível raiz do objeto — checado direto no `.d.ts` do pacote
  (`node_modules/stripe/cjs/resources/Invoices.d.ts`), o caminho certo é
  `invoice.parent.subscription_details.subscription`. Um código escrito "pela documentação antiga"
  ou por suposição teria compilado (campo opcional/`any` em algum ponto) mas nunca funcionado de
  verdade em produção — vale lembrar disso em qualquer trabalho futuro com a API do Stripe: conferir
  o `.d.ts` da versão realmente instalada, não a documentação genérica.
- **Teste ao vivo com evento sintético assinado, não só `npm run test`** — testes unitários cobrem a
  lógica pura (`isValidSubscriptionStatus`, `isEventNewerThan`), mas não provam que a extração do
  `event.id`/verificação de assinatura/idempotência funcionam de ponta a ponta contra o Worker e o
  banco REAIS. Usar `Stripe.webhooks.generateTestHeaderString` (a mesma função que o SDK usa
  internamente pra assinar) permitiu simular uma entrega de verdade sem precisar do Stripe CLI (não
  instalado neste ambiente) nem depender do dashboard do Stripe.
- **Ações em produção só depois de confirmação explícita do usuário** — migração de schema e deploy
  do Worker (`AskUserQuestion`) foram confirmados antes de rodar, por serem categorias de ação não
  praticadas antes nesta sessão (deploys do jogo em si, sim; alterar o schema do banco comercial ou
  a configuração do webhook do Stripe, não). A tentativa de mudar a config do webhook via API foi
  bloqueada pelo classificador de modo automático — resolvida pedindo autorização explícita ao
  usuário em vez de tentar contornar.

## Pendências / dívidas conhecidas
- **Job de reconciliação Stripe↔banco** (parte de G8, mencionado no documento original) ficou fora
  de escopo — precisa de Cloudflare Cron Triggers (mudança de infraestrutura/`wrangler.toml`), não
  só código do Worker. Sem isso, uma divergência entre o Stripe e o banco (ex.: um webhook que
  falhe silenciosamente de um jeito que nem a reentrega do Stripe corrija) não é detectada
  automaticamente — só G11 (observabilidade, também não implementada) revelaria isso hoje.
- **`stripe_webhook_events` não tem limpeza automática** — cresce pra sempre (um evento por linha).
  Não é um problema imediato (volume baixo, linhas pequenas), mas vale um `delete where created_at <
  now() - interval '90 days'` periódico se o volume crescer muito no futuro — não crítico agora.
- **G7** (token de pareamento sem `jti`/revogação) continua sem solução — o usuário escolheu G8
  primeiro; G7 é o próximo candidato óbvio do backlog de segurança/escala se o usuário priorizar.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes, deploy,
  teste ao vivo ponta a ponta).

## O que o próximo laboratório deve desenvolver
- **G7** (token de pareamento sem `jti`/revogação/vínculo de aparelho) — próximo item óbvio do
  backlog de segurança/escala se o usuário quiser continuar nessa frente.
- **Job de reconciliação Stripe↔banco** — se o usuário quiser fechar o resto de G8 (fora de escopo
  aqui, precisa de Cron Triggers).
- **Bug de morros/platôs invisíveis do lab-95** — continua sem resolver, aguardando resposta do
  usuário sobre aparelho/GPU e se dá pra andar através do "buraco" (ver
  `labs/lab-95-.../CONTEXT.md`).
- Continuar o backlog normal de `prompt.md`/`05-escala-e-viabilidade.md` conforme prioridade do
  usuário, fora desses itens específicos.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 21 testes de domínio, incluindo os 7 novos.
  - `npx tsc --noEmit` (dentro de `app/server-accounts/`) — typecheck limpo.
  - Produção: `curl https://missao-aprender-accounts.rafaelvs.workers.dev/health` deve responder
    `{"ok":true}`.
  - O schema já está aplicado no banco Neon de produção e o Worker já está deployado — não é
    preciso rodar `npm run migrate`/`npm run deploy` de novo pra ver o efeito deste laboratório.
