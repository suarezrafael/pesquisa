# Laboratório 96 — webhook do Stripe: idempotência + esquema realista

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: f7f1b8ad7384d81e5d22d8549798c4cb69bacd26

## Objetivo do laboratório
Corrigir G8 (`docs/prompts/05-escala-e-viabilidade.md`, marcado `[receita]`), escolhido pelo
usuário entre G7/G8/revisitar tamanho das escolinhas depois do lab-95. Hoje `handleStripeWebhook`
(`app/server-accounts/src/index.ts`) não é seguro contra reentrega do Stripe (sem tabela de eventos
processados), não trata `invoice.payment_failed`, e `schema.sql` restringe `status` a só 4 valores
(`trialing`, `active`, `past_due`, `canceled`) quando o Stripe emite pelo menos mais 4
(`incomplete`, `incomplete_expired`, `unpaid`, `paused`) — comuns logo de cara com Pix/boleto no
Brasil, onde a assinatura nasce `incomplete`. Um evento nesse estado hoje quebra o `insert` (viola
a *check constraint*), o Worker devolve 500, o Stripe reenvia, e sem idempotência o reprocessamento
pode aplicar o mesmo evento mais de uma vez.

## Investigado antes de planejar
- **`schema.sql`** (`app/server-accounts/schema.sql`): tabela `subscriptions` sem índice único em
  `stripe_subscription_id`, `status` com `check` restritivo demais. Sem tabela de eventos
  processados.
- **`upsertSubscription`** (`index.ts` ~L344): faz `select` seguido de `update`/`insert` manual —
  não é atômico, tem corrida real sob entregas concorrentes do Stripe (dois webhooks quase
  simultâneos pra mesma assinatura podem os dois verem "não existe" e os dois tentarem `insert`).
- **`handleStripeWebhook`** (`index.ts` ~L378): trata só `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`. Não trata
  `invoice.payment_failed` nem verifica se o evento já foi processado antes.
- **`migrate.mjs`**: não é uma ferramenta de migração de verdade (G10, fora de escopo aqui) — só
  reaplica `schema.sql` inteiro (idempotente via `if not exists`). Mudanças em tabelas já existentes
  (novo `check`, novo índice, nova tabela) precisam ser `alter table`/`create ... if not exists`
  adicionados ao mesmo arquivo, não uma migração versionada nova.
- **Regra inegociável** (`docs/plano-comercial-backend.md`): entitlement só gateia cosméticos —
  este laboratório não muda O QUE é gateado, só a CONFIABILIDADE de como o status chega ao banco.

## Funcionalidades planejadas
- [x] **`schema.sql`**: `alter table subscriptions drop constraint` + `add constraint` pra incluir
  `incomplete`, `incomplete_expired`, `unpaid`, `paused` na lista de status aceitos. Aplicado no
  banco Neon de produção via `npm run migrate` e conferido direto (`pg_get_constraintdef`) — os 8
  valores estão lá.
- [x] **`schema.sql`**: índice único parcial em `stripe_subscription_id` (`where ... is not null`,
  já que a coluna pode ser nula antes do checkout completar) — defesa em profundidade contra
  duplicata, além da lógica de aplicação. Aplicado e conferido (`pg_indexes`).
- [x] **`schema.sql`**: nova tabela `stripe_webhook_events` (chave primária = `event.id` do Stripe)
  pra registrar eventos já processados — checa ANTES de processar (`handleStripeWebhook`), grava
  DEPOIS de processar com sucesso. Aplicado e conferido (tabela existe no banco).
- [x] **`domain.ts`**: `isEventNewerThan` (proteção contra evento fora de ordem — compara o
  `created` do evento recebido contra `last_event_created_at`, nova coluna em `subscriptions`) e
  `isValidSubscriptionStatus` (falha fechada — status desconhecido vira log + no-op, não 500).
- [x] **`index.ts`**: `invoice.payment_failed` tratado — busca o status verdadeiro direto do Stripe
  (mesmo padrão do `checkout.session.completed`) em vez de tentar inferir da fatura. Descoberto no
  caminho: a versão instalada do SDK (`stripe` 22.x) não tem mais `invoice.subscription` no nível
  raiz — é `invoice.parent.subscription_details.subscription` (conferido no `.d.ts` do pacote, não
  suposição) — `invoiceSubscriptionId()` isola essa extração.
- [x] Testes de domínio: 7 novos testes em `domain.test.ts` (`isValidSubscriptionStatus`,
  `isEventNewerThan`) — total do Worker foi de 14 pra 21, todos passando (`npm run test`).
  `npx tsc --noEmit` limpo.
- [x] **Migração aplicada + Worker deployado em produção** (confirmado pelo usuário: "sim, aplique
  e faça o deploy") — `npm run migrate` (mudanças conferidas direto no banco) e `npm run deploy`
  (`https://missao-aprender-accounts.rafaelvs.workers.dev`, `/health` respondendo `{"ok":true}`
  depois do deploy).
- [x] **Endpoint de webhook do Stripe (modo teste) inscrito em `invoice.payment_failed`** — não
  estava (só `checkout.session.completed`/`customer.subscription.updated`/`.deleted`), o que
  deixaria o handler novo morto/nunca chamado. A primeira tentativa de corrigir via API foi
  bloqueada pelo classificador de modo automático (mudança de configuração de serviço de terceiro);
  **usuário autorizou explicitamente** ("autorizar explicitamente, ele poderá tentar novamente") —
  adicionado via `stripe.webhookEndpoints.update`, conferido lendo o endpoint de volta.
- [x] **Testado ao vivo contra o Worker real em produção** (não só simulação local): evento
  `invoice.payment_failed` sintético, assinado de verdade com `Stripe.webhooks.
  generateTestHeaderString` (mesmo mecanismo de assinatura que o Stripe usa), enviado direto pro
  endpoint deployado. `stripe_subscription_id` inexistente de propósito, pra exercitar a lógica
  inteira (verificação de assinatura, extração de `invoice.parent.subscription_details.
  subscription`, checagem de idempotência) sem tocar em nenhuma assinatura real. Primeira entrega:
  `200 {"received":true}`. Reentrega do MESMO `event.id`: `200 {"received":true,"deduped":true}` —
  idempotência confirmada ponta a ponta contra o banco de produção de verdade. Linha de teste
  removida de `stripe_webhook_events` depois (`delete ... where event_id like 'evt_lab96_test_%'`).

## Fora de escopo (explicitamente adiado)
- **Job de reconciliação Stripe↔banco** (também mencionado em G8) — precisa de Cloudflare Cron
  Triggers (mudança de infraestrutura/`wrangler.toml`, não só código do Worker) e é um recurso
  maior e independente; fica pra um laboratório próprio se o usuário priorizar.
- **G7** (token de pareamento sem `jti`/revogação) e **G10** (CI/CD, migração versionada de
  verdade) — priorizados pelo usuário como não sendo o foco deste laboratório.
- **Revisitar "escolinhas menores"** e **investigação do bug de morros invisíveis** (lab-95, ainda
  sem resposta do usuário sobre aparelho/GPU) — continuam registrados em
  `labs/lab-95-.../CONTEXT.md`, não fazem parte deste laboratório.
