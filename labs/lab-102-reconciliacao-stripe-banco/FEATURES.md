# Laboratório 102 — job de reconciliação Stripe↔banco (resto de G8)

Status: em andamento
Início: 2026-08-27
Fim: -
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
- [ ] **`app/server-accounts/wrangler.toml`**: `[triggers] crons = [...]` — cadência diária (a
  reconciliação corrige, não previne em tempo real; diária é suficiente pra pegar drift antes que
  vire uma reclamação de um responsável).
- [ ] **`app/server-accounts/src/index.ts`**: `reconcileSubscriptions(env)` — busca toda linha de
  `subscriptions` com `stripe_subscription_id` preenchido, reconsulta cada uma no Stripe, compara
  `status`/`current_period_end` com o que está no banco; se divergir, loga (`[reconciliation]`,
  igual ao padrão `[quota-alarm]` do lab-98) e corrige via `upsertSubscription`. Loga um resumo no
  final (quantas verificadas, quantas divergentes/corrigidas).
- [ ] **`export default` do Worker** ganha `scheduled(controller, env, ctx)`, chamando
  `ctx.waitUntil(reconcileSubscriptions(env))` — o Cron Trigger da Cloudflare chama isso
  automaticamente, sem rota HTTP nova.
- [ ] Testar localmente disparando o cron manualmente (`wrangler dev --test-scheduled` +
  `curl "http://localhost:8787/__scheduled?cron=..."`, mecanismo padrão do `wrangler` pra simular
  Cron Triggers sem esperar o agendamento real).
- [ ] Deploy em produção e confirmar que o Cron Trigger foi registrado (`wrangler deployments
  list`/dashboard da Cloudflare) — não dá pra esperar 24h pra ver ele disparar sozinho num teste ao
  vivo razoável, então a verificação real de comportamento acontece via `--test-scheduled` local
  contra o banco de produção (mesmo padrão de outros laboratórios: script/mecanismo local
  apontando pra credenciais reais).
- [ ] Testado ao vivo contra produção real: criar uma divergência sintética controlada (mudar
  `status` de uma assinatura de teste real diretamente no banco pra um valor diferente do que o
  Stripe realmente tem) e confirmar que rodar a reconciliação detecta e corrige de volta pro valor
  verdadeiro do Stripe.

## Fora de escopo (explicitamente adiado)
- **Detectar assinatura que existe no Stripe mas NUNCA teve nenhuma linha criada no banco**
  (primeiro webhook perdido por completo) — exigiria listar todas as assinaturas da conta Stripe e
  cruzar contra `family_accounts` (via metadata/`client_reference_id`), mudança de escopo maior.
  Registrado como limitação conhecida.
- **Alerta ativo (e-mail/Slack) quando uma divergência é encontrada** — mesma filosofia do lab-98
  (só log visível por enquanto, nenhum canal de notificação novo configurado).
- **Cron Trigger noutros Workers** (`server-cf-relay`) — não tem nada análogo a reconciliar (sem
  fonte de verdade externa como o Stripe).
