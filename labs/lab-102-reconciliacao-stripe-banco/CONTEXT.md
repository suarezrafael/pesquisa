# Contexto — Laboratório 102 — job de reconciliação Stripe↔banco (resto de G8)

Preenchido em: 2026-08-27
Commit inicial → final: be082bd6f7f9681320637f2fe30472471440327b..HEAD

## O que foi feito
Fechou a parte de G8 que ficou fora de escopo do lab-96 de propósito: uma rede de segurança contra
divergência entre o Stripe e o banco que nenhuma reentrega de webhook corrigiria sozinha (ex.: o
Worker confirma 2xx pro Stripe, mas um bug na lógica de negócio faz a mudança de status não ser
aplicada de verdade). Escolhido pelo usuário logo após o lab-101.

- **`app/server-accounts/wrangler.toml`**: `[triggers] crons = ["0 9 * * *"]` (09:00 UTC = 06:00
  em São Paulo, fora do horário de pico de uso do jogo) — primeiro Cron Trigger deste projeto.
- **`app/server-accounts/src/index.ts`**: `reconcileSubscriptions(env)` — busca toda linha de
  `subscriptions` com `stripe_subscription_id` preenchido, reconsulta cada uma direto no Stripe
  (`stripe.subscriptions.retrieve`), compara `status`/`current_period_end` com o banco; se
  divergir, loga `[reconciliation]` (mesmo padrão de `[quota-alarm]` do lab-98) e corrige via
  `upsertSubscription` (a mesma função que os webhooks já usam, evitando duplicar a lógica de
  update). `eventCreatedAt` da correção é sempre "agora", garantindo que `isEventNewerThan`
  (lab-96) deixa a correção passar mesmo que a linha já tenha um evento antigo registrado.
- **`export default` do Worker** ganhou `scheduled(controller, env, ctx)`, chamando
  `ctx.waitUntil(reconcileSubscriptions(env))` — nenhuma rota HTTP nova, o Cron Trigger da
  Cloudflare invoca isso sozinho.
- **`app/server-accounts/src/domain.ts`**: nova função pura `toComparableIso(value: string | Date
  | null)`, com 4 testes novos (total do Worker: 40).
- **Deploy em produção**: `wrangler deploy` confirmou `schedule: 0 9 * * *` registrado na própria
  saída do comando (`wrangler deployments list` também mostra a versão nova como 100% ativa).
- **Testado ao vivo, de ponta a ponta, contra produção real** (banco de produção real via
  `.dev.vars`, `wrangler dev --test-scheduled` + `curl /__scheduled`): com **autorização explícita
  do usuário** (o classificador bloqueou corromper dado de produção mesmo temporariamente), o
  `status` de uma assinatura REAL foi alterado direto no banco de `active` pra `past_due`
  enquanto o Stripe continuava dizendo `active` de verdade. A reconciliação detectou a
  divergência e corrigiu sozinha — confirmado por leitura direta do banco depois (`active`
  restaurado, `current_period_end` intacto).

## Decisões técnicas tomadas
- **Achado real durante a implementação, não hipotético**: a PRIMEIRA execução do job (contra uma
  assinatura genuína, sem nenhuma corrupção sintética ainda) acusou uma "divergência" que não
  existia de verdade — `status="active"` batendo dos dois lados, mas `current_period_end` do
  banco aparecendo como `"Wed Sep 23 2026 21:33:15 GMT-0300 (Horário Padrão de Brasília)"` contra
  o ISO do Stripe `"2026-09-24T00:33:15.000Z"` (o MESMO instante, só formatado diferente). Causa
  raiz: o driver `@neondatabase/serverless` devolve colunas `timestamptz` como objeto `Date` de
  verdade em tempo de execução, apesar do tipo declarado em TODO o resto deste arquivo ser
  `string | null` — inofensivo em todo outro lugar porque `Response.json`/`JSON.stringify` chama
  `.toJSON()` num `Date` automaticamente (produz ISO), e só vira bug real quando algo compara o
  valor por igualdade de string direta, como a reconciliação faz. Corrigido com
  `toComparableIso` (normaliza `Date` ou string pro mesmo ISO antes de comparar), tipando
  corretamente `current_period_end: Date | null` só nesta função (não mudei o tipo — tecnicamente
  incorreto — usado no resto do arquivo, por ser um efeito colateral inofensivo em todo outro
  lugar e fora do escopo deste laboratório corrigir globalmente).
- **`upsertSubscription` reaproveitado, não duplicado** — a reconciliação usa a MESMA função que
  os webhooks já usam pra aplicar mudança de assinatura, garantindo que qualquer regra futura
  adicionada ali (ex.: uma nova validação) vale automaticamente pros dois caminhos.
- **Só cobre assinaturas que JÁ têm uma linha em `subscriptions`** — decisão consciente de escopo
  (ver "Fora de escopo" em `FEATURES.md`): detectar uma assinatura que existe no Stripe mas cujo
  PRIMEIRO webhook nunca chegou (nenhuma linha criada) exigiria listar TODA a conta do Stripe e
  cruzar por metadata contra `family_accounts` — mudança de escopo maior, guardada como limitação
  conhecida.
- **Corromper dado de produção pra testar detecção precisou de autorização explícita do
  usuário** — mesmo padrão de bloqueio já visto em labs anteriores pra escrita nova em
  infraestrutura/produção (migração, secret, deploy), desta vez pela primeira vez sobre DADO real
  de uma família (não configuração/schema). A correção aconteceu em segundos e a assinatura real
  nunca ficou visivelmente incorreta pro usuário final.
- **Diário (09:00 UTC), não mais frequente** — a reconciliação é uma rede de segurança, não o
  caminho principal (webhooks continuam sendo isso); diário é suficiente pra pegar drift antes que
  vire uma reclamação de um responsável, sem gastar cota de invocação à toa.

## Pendências / dívidas conhecidas
- **Não detecta assinatura cujo primeiro webhook nunca chegou** (nenhuma linha criada) — ver
  "Decisões técnicas" acima. Registrado como limitação conhecida, não uma omissão despercebida.
- **Sem alerta ativo (e-mail/Slack) quando uma divergência é encontrada** — só log visível
  (`[reconciliation]`), mesma filosofia do `[quota-alarm]` do lab-98. Sem canal de notificação
  configurado ainda (Resend é Fase F do plano comercial).
- **Tipo `current_period_end: string | null` no resto de `index.ts` continua tecnicamente
  incorreto** (é `Date` em tempo de execução) — inofensivo em todo lugar que só serializa via
  `Response.json`, mas fora do escopo corrigir globalmente aqui.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes, Cron
  Trigger registrado em produção, teste ao vivo de detecção E correção contra uma divergência real
  numa assinatura de verdade).

## O que o próximo laboratório deve desenvolver
G8 está agora COMPLETO (lab-96 + lab-102). Itens conhecidos que continuam em aberto:
- **Deploy automático a partir do CI** — próximo passo natural depois do lab-101 (CI só roda
  testes hoje); precisa de decisão sobre quais secrets (Vercel/Cloudflare) ficam no GitHub Actions.
- **Ambiente de staging separado** e **rollback documentado** — partes de G10 deixadas de fora do
  lab-101 de propósito.
- **NPS de responsáveis** (deferido do lab-99) e o **bug de morros invisíveis** (lab-95, ainda
  bloqueado esperando resposta do usuário sobre aparelho/GPU) continuam em aberto.
- **Detectar assinatura cujo primeiro webhook nunca chegou** — se a reconciliação atual não se
  provar suficiente na prática, esta é a extensão natural (listar conta Stripe inteira, cruzar por
  metadata).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 40 testes de domínio (4 novos deste laboratório).
  - `npx tsc --noEmit` (em `app/server-accounts/`) — typecheck limpo.
  - Local: `npx wrangler dev --test-scheduled` + `curl "http://localhost:8787/__scheduled?cron=0+9+*+*+*"`
    dispara a reconciliação manualmente contra o que estiver em `DATABASE_URL`/`STRIPE_SECRET_KEY`
    de `.dev.vars` (produção, por padrão neste projeto).
  - Produção: `wrangler deployments list` (em `app/server-accounts/`) mostra a versão deployada
    com o Cron Trigger `0 9 * * *`; `wrangler tail` mostraria `[reconciliation]` no próximo
    disparo automático (09:00 UTC).
  - Worker já deployado — não é preciso rodar `npm run deploy` de novo pra ver o efeito deste
    laboratório.
