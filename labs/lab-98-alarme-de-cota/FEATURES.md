# Laboratório 98 — alarme de cota do relay (G11, parte 1)

Status: em andamento
Início: 2026-08-26
Fim: -
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
- [ ] **`Relay` (Durable Object)**: contador diário de "unidades de request" cobradas, persistido em
  `state.storage` (sobrevive a hibernação) — cada nova conexão soma 1, cada mensagem recebida soma
  1/20 (ou soma 1 a cada 20 mensagens, equivalente). Chave por data UTC, pra resetar naturalmente
  a cada dia sem precisar de um job de limpeza.
- [ ] Ao cruzar limiares configurados (ex.: 50%, 80%, 100% de 100.000/dia), loga
  `console.error('[quota-alarm]', ...)` uma vez por limiar por dia (não a cada mensagem depois de
  cruzar — evita virar spam de log).
- [ ] Endpoint de leitura (ex.: `GET /quota-status`, sem autenticação — só números agregados, sem
  dado de jogador nenhum) pra consultar o contador do dia atual sem precisar rodar `wrangler tail`
  o dia inteiro esperando um log aparecer.
- [ ] Testes de domínio pra qualquer lógica pura extraída (ex.: "quantas unidades esta mensagem/
  conexão soma", "cruzou algum limiar novo desde a última leitura").
- [ ] Testado ao vivo contra produção real: gerar tráfego sintético (conexões + mensagens) contra o
  relay real, confirmar que `/quota-status` reflete o total esperado e que o log `[quota-alarm]`
  aparece ao cruzar um limiar baixo de teste.

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
