# Laboratório 102 — job de reconciliação Stripe↔banco (resto de G8)

Status: concluído
Início: 2026-08-27
Fim: 2026-08-27
Commit inicial: be082bd6f7f9681320637f2fe30472471440327b

## Objetivo do laboratório
Fecha a parte de G8 (`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`) que ficou fora de
escopo do lab-96 de propósito: mesmo com idempotência e proteção contra evento fora de ordem
(lab-96), uma divergência entre o Stripe e o nosso banco causada por um webhook que falhe
silenciosamente de um jeito que nem a reentrega do Stripe corrija (ex.: nosso Worker aceita e
confirma 2xx mas um bug na lógica de negócio faz a mudança não ser aplicada de verdade) não é
detectada automaticamente hoje — só apareceria se um responsável reclamasse. Escolhido pelo usuário
logo após o lab-101, entre reconciliação Stripe/deploy automático/NPS/bug de morros invisíveis.

## Investigado antes de planejar
- **`upsertSubscription`** (`index.ts`) já centraliza a lógica de aplicar um estado de assinatura —
  reaproveitada pelo job de reconciliação em vez de duplicar a lógica de update.
- **`subscriptions.stripe_subscription_id`** é a chave de correlação com o Stripe — toda linha com
  esse campo preenchido pode ser reconsultada via `stripe.subscriptions.retrieve(id)` pra saber o
  estado VERDADEIRO atual.
- **`isEventNewerThan`/`last_event_created_at`** (lab-96): usar o timestamp atual (`new
  Date().toISOString()`) como "evento" da reconciliação sempre vence qualquer evento passado
  registrado, então a correção sempre se aplica quando há divergência real.
- **Cloudflare Cron Triggers** (`[triggers]` em `wrangler.toml` + handler `scheduled` no
  `export default` do Worker) é o mecanismo nativo pra isso — nenhum outro Worker deste projeto usa
  Cron Triggers ainda (primeira vez). `ExportedHandlerScheduledHandler` (via
  `@cloudflare/workers-types`, já devDependency) dá a assinatura certa:
  `(controller: ScheduledController, env: Env, ctx: ExecutionContext) => void | Promise<void>`.
- **Limite do que este job PODE detectar**: só reconsidera assinaturas que JÁ têm uma linha em
  `subscriptions` (ou seja, alguma versão de `checkout.session.completed` já chegou alguma vez). Se
  o PRIMEIRO webhook de uma assinatura nova fosse perdido de um jeito que nem a reentrega do Stripe
  corrigisse (nenhuma linha é criada), este job não veria essa assinatura — cross-referenciar TODAS
  as assinaturas do Stripe contra `family_accounts` exigiria listar a conta inteira do Stripe e
  cruzar por metadata, mudança maior e mais cara de API, fora de escopo aqui (ver "Fora de escopo").
- **Volume atual é pequeno** (produto em fase de validação, poucas assinaturas reais) — iterar uma
  por uma com `stripe.subscriptions.retrieve` (sem paginação/batch) é suficiente; não precisa da
  Stripe Search/List API otimizada para volume alto.

## Funcionalidades planejadas
- [x] **`app/server-accounts/wrangler.toml`**: `[triggers] crons = ["0 9 * * *"]` — cadência
  diária (a reconciliação corrige, não previne em tempo real; diária é suficiente pra pegar drift
  antes que vire uma reclamação de um responsável).
- [x] **`app/server-accounts/src/index.ts`**: `reconcileSubscriptions(env)` — busca toda linha de
  `subscriptions` com `stripe_subscription_id` preenchido, reconsulta cada uma no Stripe, compara
  `status`/`current_period_end` com o que está no banco; se divergir, loga (`[reconciliation]`,
  igual ao padrão `[quota-alarm]` do lab-98) e corrige via `upsertSubscription`. Loga um resumo no
  final (quantas verificadas, quantas divergentes/corrigidas).
- [x] **`export default` do Worker** ganhou `scheduled(controller, env, ctx)`, chamando
  `ctx.waitUntil(reconcileSubscriptions(env))` — o Cron Trigger da Cloudflare chama isso
  automaticamente, sem rota HTTP nova.
- [x] Testado localmente disparando o cron manualmente (`wrangler dev --test-scheduled` +
  `curl "http://localhost:8788/__scheduled?cron=..."`). **Achado real no processo**: a primeira
  execução acusou uma divergência falsa numa assinatura genuína (`current_period_end` do banco
  formatado como `Date.toString()` vs. ISO do Stripe) — bug de verdade na comparação, não no
  dado; corrigido com `toComparableIso` (`domain.ts`, com testes) antes de prosseguir. Ver
  "Decisões técnicas".
- [x] Deploy em produção — `wrangler deploy` confirmou `schedule: 0 9 * * *` registrado na saída
  do próprio comando.
- [x] Testado ao vivo contra produção real, com **autorização explícita do usuário** (o
  classificador bloqueou a primeira tentativa por corromper dado de produção, mesmo que
  temporário/reversível): status de uma assinatura REAL foi alterado direto no banco de
  `active` pra `past_due` (Stripe continuava dizendo `active` de verdade); a reconciliação
  detectou a divergência (`[reconciliation] divergência em sub_...: banco tinha status="past_due"
  ... Stripe diz status="active"`) e corrigiu sozinha — confirmado por leitura direta do banco
  depois (`active` restaurado, `current_period_end` intacto, assinatura real da família nunca
  ficou de fato incorreta pro usuário final, já que o teste rodou local contra o banco real e a
  correção aconteceu em segundos).

## Fora de escopo (explicitamente adiado)
- **Detectar assinatura que existe no Stripe mas NUNCA teve nenhuma linha criada no banco**
  (primeiro webhook perdido por completo) — exigiria listar todas as assinaturas da conta Stripe e
  cruzar contra `family_accounts` (via metadata/`client_reference_id`), mudança de escopo maior.
  Registrado como limitação conhecida.
- **Alerta ativo (e-mail/Slack) quando uma divergência é encontrada** — mesma filosofia do lab-98
  (só log visível por enquanto, nenhum canal de notificação novo configurado).
- **Cron Trigger noutros Workers** (`server-cf-relay`) — não tem nada análogo a reconciliar (sem
  fonte de verdade externa como o Stripe).
