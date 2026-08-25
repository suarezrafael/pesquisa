# Laboratório 96 — webhook do Stripe: idempotência + esquema realista

Status: em andamento
Início: 2026-08-25
Fim: -
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
- [ ] **`schema.sql`**: `alter table subscriptions drop constraint` + `add constraint` pra incluir
  `incomplete`, `incomplete_expired`, `unpaid`, `paused` na lista de status aceitos.
- [ ] **`schema.sql`**: índice único parcial em `stripe_subscription_id` (`where ... is not null`,
  já que a coluna pode ser nula antes do checkout completar) — defesa em profundidade contra
  duplicata, além da lógica de aplicação.
- [ ] **`schema.sql`**: nova tabela `stripe_webhook_events` (chave primária = `event.id` do Stripe)
  pra registrar eventos já processados — checar ANTES de processar, gravar DEPOIS (ou na mesma
  transação), devolvendo 200 sem reprocessar se o `event.id` já existe.
- [ ] **`index.ts`**: proteção contra evento fora de ordem — comparar o `created` (timestamp Unix)
  do evento recebido contra o último processado pra aquela assinatura; ignorar (mas ainda marcar
  como recebido/200) se for mais antigo que o já aplicado.
- [ ] **`index.ts`**: tratar `invoice.payment_failed` — hoje nenhum handler existe pra esse tipo de
  evento.
- [ ] Testes de domínio (`domain.test.ts` ou novo arquivo) pra qualquer lógica pura extraída (ex.:
  "este evento é mais antigo que o último processado?", "este status é válido?") — seguindo o
  padrão já estabelecido neste Worker (`npm run test` em `server-accounts/`).
- [ ] Testado ao vivo contra o Stripe real em modo teste (CLI `stripe trigger` ou dashboard) —
  simular reentrega do mesmo evento e confirmar que não duplica/reprocessa.

## Fora de escopo (explicitamente adiado)
- **Job de reconciliação Stripe↔banco** (também mencionado em G8) — precisa de Cloudflare Cron
  Triggers (mudança de infraestrutura/`wrangler.toml`, não só código do Worker) e é um recurso
  maior e independente; fica pra um laboratório próprio se o usuário priorizar.
- **G7** (token de pareamento sem `jti`/revogação) e **G10** (CI/CD, migração versionada de
  verdade) — priorizados pelo usuário como não sendo o foco deste laboratório.
- **Revisitar "escolinhas menores"** e **investigação do bug de morros invisíveis** (lab-95, ainda
  sem resposta do usuário sobre aparelho/GPU) — continuam registrados em
  `labs/lab-95-.../CONTEXT.md`, não fazem parte deste laboratório.
