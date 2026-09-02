# Contexto — Laboratório 98 — alarme de cota do relay (G11, parte 1)

Preenchido em: 2026-08-26
Commit inicial → final: e09dbb8d6be5ff6fb1b8067b2d4bd0ddcb02e3d3..6ee8647676e43d4f4d9164d0133e252b5255d7f6

## O que foi feito
Corrigiu a parte de "alarme de cota" de G11 (`docs/prompts/05-escala-e-viabilidade.md` §7, item 4
da ordem de ataque), escolhido pelo usuário logo após o lab-97. G11 completo é "observabilidade
zero"; boa parte já tinha sido resolvida no lab-84 (Cloudflare Web Analytics, `/client-error` +
`errorReporting.ts`, logs de erro do relay) — faltava especificamente um mecanismo de detectar
aproximação da cota gratuita, apesar de DUAS rodadas de recálculo manual de orçamento já terem
acontecido neste projeto (lab-85 mediu errado por 20x, lab-86 corrigiu) sem nenhuma telemetria real
acompanhando ao vivo.

- **`app/server-cf-relay/src/domain.ts`** (novo): constantes de cota (`DAILY_REQUEST_QUOTA =
  100_000`, `WEBSOCKET_MESSAGE_BILLING_RATIO = 20`, `CONNECTION_REQUEST_UNITS = 1`,
  `MESSAGE_REQUEST_UNITS = 1/20`) — mesma matemática já documentada no lab-86, citação direta da
  página oficial de preços do Cloudflare. `crossedThreshold(totalUnits, alreadyAlarmedThreshold)`
  decide se cruzou um limiar NOVO (50%/80%/100%, `QUOTA_ALARM_THRESHOLDS`), pegando o MAIOR limiar
  cruzado numa leitura só (não dispara os intermediários retroativamente se o total pular direto de
  40% pra 90%). `utcDateKey()` gera a chave de reset diário.
- **`app/server-cf-relay/src/index.ts`**: `Relay` (Durable Object) ganhou
  `recordUsageAndMaybeAlarm(units)` — soma `units` ao contador do dia atual em `state.storage`
  (SQLite-backed, primeira vez que este Worker usa storage de verdade — antes só usava a WebSocket
  Hibernation API pra sobreviver a hibernação, nunca persistia nada) e loga
  `console.error('[quota-alarm]', ...)` na primeira leitura que cruzar um limiar. Chamado em duas
  pontas: `fetch` (nova conexão aceita, +1 unidade) e `webSocketMessage` (toda mensagem RECEBIDA,
  +1/20 de unidade, ANTES de qualquer checagem de tamanho/taxa/tipo — o Cloudflare cobra pela
  mensagem recebida, não pela que o relay decide processar). Novo endpoint `GET /quota-status`
  (sem autenticação, só números agregados) roteado pelo `fetch` do Worker principal direto pro
  Durable Object global, mesmo sem ser upgrade de WebSocket — não conta como uso, pra não inflar o
  próprio contador que está sendo lido.
- **`app/server-cf-relay/package.json`**: `vitest` adicionado como dependência de desenvolvimento e
  `npm run test` — primeiro teste automatizado deste Worker (os outros dois, `app/` e
  `server-accounts/`, já tinham).
- **13 testes novos** (`domain.test.ts`): constantes batendo com a matemática do lab-86 (4),
  `crossedThreshold` cobrindo primeiro cruzamento/limiar já alarmado/pulo de múltiplos limiares
  numa leitura só/limite máximo (7), `utcDateKey` (2). `npx tsc --noEmit` limpo.
- **Deploy em produção** (`https://missao-aprender-relay-v2.rafaelvs.workers.dev`).
- **Testado ao vivo, de ponta a ponta, contra produção real**: `/quota-status` conferido zerado
  antes (`totalUnits:0`); rodado `node scripts/load-test.mjs --players 5 --duration-s 15
  --move-fraction 1` contra o relay real (script já existente do lab-85, reaproveitado sem
  modificação) — 5 conexões, 145 mensagens `state` enviadas. `/quota-status` depois:
  `totalUnits:12` — bate com o esperado (5×1 + 145×1/20 = 12,25, arredondado, dentro da margem
  esperada de mensagens em trânsito no fechamento da conexão). Confirma a contagem persistindo e
  acompanhando tráfego real. O cruzamento de limiar (50%/80%/100%) em si foi verificado só via
  teste unitário — gerar ~50.000 unidades de tráfego sintético real só pra ver o log não valeria o
  custo, dado que a lógica pura (`crossedThreshold`) já está coberta exaustivamente.

## Decisões técnicas tomadas
- **Contador autocontado dentro do próprio Durable Object, não a API de Analytics da Cloudflare**
  — a alternativa (GraphQL Analytics API) exigiria um token de API novo com escopo de conta e um
  Cron Trigger novo, mais superfície de credencial e infraestrutura nova. Como o relay já processa
  100% do tráfego relevante (é a ÚNICA fonte de uso de Durable Objects deste projeto), contar
  direto ali usa a MESMA matemática (20:1) já documentada sem precisar de credencial nova.
  Trade-off aceito: não captura tráfego de outras fontes que um dia possam consumir a mesma cota de
  Durable Objects (nenhuma existe hoje).
- **Mensagem conta ANTES de qualquer validação, conexão conta DEPOIS dos limites de IP/rate** —
  reflete a cobrança real de cada caso: uma mensagem é cobrada assim que chega, não importa o que o
  relay decide fazer com ela depois; uma conexão rejeitada por IP TAMBÉM consome 1 request de
  verdade na cobrança do Cloudflare, mas contar isso exigiria instrumentar múltiplos pontos de
  saída — simplificação aceita porque o volume de rejeição é pequeno frente ao de mensagens
  legítimas (documentado no código).
- **Só log visível (`console.error`), sem notificação ativa** — mesma filosofia do lab-84 (nenhum
  serviço de terceiro novo). Não há canal de e-mail configurado ainda (Resend é Fase F).
- **`GET /quota-status` sem autenticação** — só expõe números agregados do dia inteiro (total de
  unidades, % da cota, qual limiar já foi alarmado), nenhum dado de jogador/sessão individual.
  Decisão consciente de manter simples (sem token/segredo pra gerenciar) dado o baixo risco do que
  é exposto.
- **Vitest adicionado a um TERCEIRO package** (além de `app/` e `server-accounts/`) — mantém a
  mesma convenção zero-config (sem `vitest.config.ts`, só o `test` script) já usada nos outros
  dois, para consistência entre os três Workers/apps deste monorepo.

## Pendências / dívidas conhecidas
- **Chaves antigas de `quota:YYYY-MM-DD` nunca são limpas do `state.storage`** — cresce pra sempre
  (uma linha por dia). Volume desprezível (1 linha/dia, poucos bytes cada), mesma categoria de
  dívida menor já aceita para `stripe_webhook_events` (lab-96) e `entitlement_tokens` (lab-97).
- **Não captura tráfego de outras fontes de Durable Objects** — se este projeto um dia rodar outro
  Durable Object consumindo a MESMA cota de conta, o contador autocontado do relay não veria esse
  uso. Não é um problema hoje (o relay é a única fonte), mas documentado pra quando isso mudar.
- **Pergunta do lab-86 sobre cota por conta vs. por instância de Durable Object continua sem
  resposta** — não relevante pra este relay especificamente (sala global única, sempre a mesma
  instância), mas registrado de novo aqui pra não se perder.
- **Sem alarme de cota do Neon (CU-horas)** — G9 (lab-88) já resolveu o risco mais concreto
  conhecido (`/health` público); monitorar CU-horas de verdade exigiria a API de Management do
  Neon, fora de escopo deste laboratório (ver `FEATURES.md`, "Fora de escopo").

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes, deploy,
  teste ao vivo ponta a ponta contra produção real).

## O que o próximo laboratório deve desenvolver
- **Eventos de produto / retenção D1-D7 / conversão** (`prompt.md` §12) — a outra metade de G11,
  deliberadamente fora de escopo aqui por ser uma frente bem maior e diferente (analytics de
  produto, precisa de pipeline de eventos + cálculo de coorte, não só um contador simples).
- **Alarme de cota do Neon (CU-horas)** — se o volume de uso crescer o bastante pra justificar a
  API de Management do Neon.
- Itens já registrados em laboratórios anteriores continuam em aberto: job de reconciliação
  Stripe↔banco (G8, lab-96), UI de gerenciar aparelhos por família (G7, lab-97), bug de morros
  invisíveis (lab-95, aguardando resposta do usuário sobre aparelho/GPU), G10 (CI/CD).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-cf-relay && npm run test` — 13 testes de domínio.
  - `npx tsc --noEmit` (dentro de `app/server-cf-relay/`) — typecheck limpo.
  - Produção: `curl https://missao-aprender-relay-v2.rafaelvs.workers.dev/quota-status` devolve o
    contador do dia atual (`{"date":"...","totalUnits":...,"dailyQuota":100000,"percentUsed":...,
    "alarmedThreshold":...}`).
  - `wrangler tail` (dentro de `app/server-cf-relay/`) mostra `[quota-alarm]` se/quando a cota
    cruzar 50%/80%/100% num dia real.
  - Relay já deployado — não é preciso rodar `npm run deploy` de novo pra ver o efeito deste
    laboratório.
