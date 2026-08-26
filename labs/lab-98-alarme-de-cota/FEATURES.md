# Laboratório 98 — alarme de cota do relay (G11, parte 1)

Status: concluído
Início: 2026-08-26
Fim: 2026-08-26
Commit inicial: e09dbb8d6be5ff6fb1b8067b2d4bd0ddcb02e3d3

## Objetivo do laboratório
Corrigir a parte de "alarme de cota" de G11 (`docs/prompts/05-escala-e-viabilidade.md` §7, item 4
da ordem de ataque), escolhido pelo usuário. G11 completo é "observabilidade zero" — mas boa parte
já foi resolvida no lab-84 (Cloudflare Web Analytics, `/client-error` + `errorReporting.ts`, logs de
erro no relay). O que falta de G11, por partes:
1. **Alarme de cota** (este laboratório) — nenhum mecanismo detecta hoje se o relay está se
   aproximando da cota gratuita de requests do Cloudflare, apesar de DUAS rodadas de recálculo de
   orçamento já terem acontecido neste projeto (lab-85 mediu errado por 20x, lab-86 corrigiu) sem
   nenhuma telemetria real acompanhando ao vivo — só medições manuais pontuais.
2. **Eventos de produto / métricas de retenção D1-D7/conversão** (`prompt.md` §12) — fica pra um
   laboratório futuro (ver "Fora de escopo"), é uma frente bem maior e diferente (analytics de
   produto, não operação/infra).

## Investigado antes de planejar
- **`app/server-cf-relay/src/index.ts`**: Durable Object `Relay`, SQLite-backed
  (`new_sqlite_classes` no `wrangler.toml` — único tipo disponível no plano Free), mas
  `state.storage` nunca foi usado de verdade até hoje (comentário no próprio `wrangler.toml`
  confirma). Isso significa que dá pra persistir um contador de uso de verdade, sobrevivendo a
  hibernação/reinício do Durable Object, sem precisar de nenhuma infraestrutura nova.
- **Matemática de cota já estabelecida** (`labs/lab-86-correcao-orcamento-cota/CONTEXT.md`,
  citação direta da página de preços oficial do Cloudflare, confirmada em duas consultas
  independentes): "mensagens WebSocket recebidas são cobradas numa razão de 20:1" contra a cota de
  **100.000 requests/dia** do plano Free de Durable Objects — cada 20 mensagens recebidas = 1
  request cobrado. Uma NOVA CONEXÃO (`fetch` fazendo o upgrade pra WebSocket) conta como 1 request
  cheio.
- **Pergunta em aberto do lab-86, não resolvida ali nem aqui**: a cota de 100k requests/dia é por
  CONTA ou por INSTÂNCIA de Durable Object? Pra este relay especificamente isso não muda nada na
  prática — é uma "sala global única" (`env.RELAY.idFromName('global')`), sempre a MESMA instância
  — mas vale registrar que essa ambiguidade segue sem confirmação.
- **Decisão já tomada no lab-84**: nenhum serviço de terceiro novo (Sentry, etc.) — visibilidade via
  `console.error`/logs estruturados, verificável com `wrangler tail` ou o painel de Logs do
  Cloudflare. Este laboratório segue a mesma filosofia: o alarme é um LOG bem visível
  (`[quota-alarm]`), não um novo canal de notificação (e-mail/SMS) — não há serviço de e-mail
  configurado ainda (Resend é Fase F, não implementada).
- **Por que autocontado em vez de consultar a API de Analytics da Cloudflare**: a alternativa
  (GraphQL Analytics API da Cloudflare) exigiria um token de API novo com escopo de conta e um
  Cron Trigger novo — mais superfície de credencial e infraestrutura nova pra um primeiro
  laboratório de alarme. Contar as próprias mensagens/conexões dentro do Durable Object que já
  processa 100% do tráfego é mais simples, não precisa de credencial nova, e usa exatamente a
  MESMA matemática (20:1) já documentada — só não captura tráfego de OUTRAS fontes que consumam a
  mesma cota de Durable Objects (não há nenhuma outra neste projeto hoje).

## Funcionalidades planejadas
- [x] **`Relay` (Durable Object)**: contador diário de "unidades de request" cobradas, persistido em
  `state.storage` (sobrevive a hibernação) — cada nova conexão soma 1
  (`CONNECTION_REQUEST_UNITS`), cada mensagem recebida soma 1/20 (`MESSAGE_REQUEST_UNITS`). Chave
  por data UTC (`quota:YYYY-MM-DD`), reseta naturalmente a cada dia sem job de limpeza.
- [x] Ao cruzar limiares configurados (50%, 80%, 100% de 100.000/dia — `QUOTA_ALARM_THRESHOLDS`),
  loga `console.error('[quota-alarm]', ...)` uma vez por limiar por dia — `crossedThreshold`
  (`domain.ts`) garante isso mesmo se o total pular direto de um limiar baixo pra um alto numa
  única leitura (não dispara os intermediários retroativamente).
- [x] Endpoint de leitura `GET /quota-status` (sem autenticação — só números agregados, sem dado
  de jogador), roteado pelo Worker principal direto pro Durable Object global mesmo sem ser upgrade
  de WebSocket. Não conta como uso (não infla o próprio contador que está sendo lido).
- [x] Testes de domínio: `crossedThreshold` (7 testes, cobrindo primeiro cruzamento, cruzamento já
  alarmado antes, pulo de múltiplos limiares numa leitura só, e limite máximo) + `utcDateKey` (2
  testes) + verificação das constantes de cota batendo com a matemática do lab-86 (4 testes) — 13
  testes no total, primeiro teste automatizado deste Worker (`package.json` ganhou `vitest`/`test`).
  `npx tsc --noEmit` limpo.
- [x] **Testado ao vivo contra produção real**: relay deployado
  (`https://missao-aprender-relay-v2.rafaelvs.workers.dev`), `/quota-status` conferido zerado antes
  do teste (`totalUnits:0`), depois rodado `node scripts/load-test.mjs --players 5 --duration-s 15
  --move-fraction 1` contra o relay real (5 conexões, 145 mensagens `state` enviadas e recebidas
  pelo relay). `/quota-status` depois do teste: `totalUnits:12` — bate com o esperado (5 conexões ×
  1 + 145 mensagens × 1/20 = 12,25, arredondado) dentro da margem esperada de mensagens em trânsito
  no fechamento da conexão. Confirma a contagem persistindo e refletindo tráfego real de ponta a
  ponta. Cruzamento de limiar (50%/80%/100%) verificado só via teste unitário — não fazia sentido
  gerar ~50.000 unidades de tráfego sintético real só pra ver o log, dado que a lógica pura já está
  coberta exaustivamente.

## Fora de escopo (explicitamente adiado)
- **Eventos de produto / retenção D1-D7 / conversão** (`prompt.md` §12) — frente própria, maior,
  de analytics de produto (não operação/infra). Fica pra um laboratório futuro dedicado.
- **Alarme de cota do Neon (CU-horas)** — G9 (lab-88) já resolveu o risco mais concreto conhecido
  (`/health` público impedindo scale-to-zero). Monitorar CU-horas de verdade exigiria a API de
  Management do Neon (credencial nova, escopo a definir) — fora de escopo aqui.
- **Notificação ativa (e-mail/SMS/webhook) quando o alarme dispara** — só log visível por enquanto,
  mesma filosofia do lab-84. Vira relevante quando houver um canal de e-mail configurado (Resend,
  Fase F) ou se o usuário quiser configurar algo antes disso.
- **Cloudflare GraphQL Analytics API / Cron Trigger** — alternativa mais "oficial" de medir cota
  real da conta, mas exige credencial nova e infraestrutura nova; a abordagem autocontada cobre o
  caso concreto conhecido (relay) sem esse custo. Pode virar um laboratório futuro se o produto
  crescer e precisar de visibilidade multi-serviço de verdade.
