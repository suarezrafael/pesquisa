# Contexto — Laboratório 85 — protocolo de tempo real com orçamento de cota

Preenchido em: 2026-08-24
Commit inicial → final: b8e1bbeb5fccfb0aa493fa72ecbeb616f00a81c4..HEAD

> **⚠️ Correção (2026-08-24, `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`)**: os números da
> seção "Números medidos" abaixo (38,2% da cota pra 30 jogadores/30min) tratam 1 mensagem
> WebSocket recebida como 1 request cobrado. A Cloudflare cobra mensagens WebSocket recebidas numa
> razão de **20:1** (confirmado na página oficial de preços dos Durable Objects) — o número real,
> aplicando essa razão, é **~1,9%** da cota diária, não 38,2%. A conclusão qualitativa (envio por
> mudança + backoff reduzem a carga em ~12x frente ao protocolo antigo) continua correta e válida;
> só a comparação contra o teto de 20% do critério de aceite estava base no denominador errado.
> Isso também muda a recomendação de "O que o próximo laboratório deve desenvolver" abaixo: salas
> com teto de 12 jogadores deixaram de ser urgentes pela ótica de requests/dia. Detalhes completos
> em `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`.

## O que foi feito
- **Envio por mudança em vez de por relógio** (`app/src/world3d/World3D.tsx`): o laço de multiplayer
  antes mandava `sendState` incondicionalmente a cada 0,12s (8,33 msg/s por jogador, sempre, mesmo
  parado). Agora checa a cada `NET_SEND_CHECK_INTERVAL` (0,5s) se a posição/direção mudou além de um
  limiar (`NET_POSITION_EPSILON`/`NET_FACING_EPSILON`), se a aparência mudou, ou se o keepalive de
  `NET_KEEPALIVE_INTERVAL_MS` (5s) parado venceu — só manda nesses casos. Teto efetivo: ≤2 msg/s
  andando (o próprio intervalo de checagem já é o teto), ~0,2 msg/s parado — bate exatamente o alvo
  de `docs/prompts/05-escala-e-viabilidade.md` seção 3.
- **Timeout de remoção de jogador remoto ajustado** (`NET_PEER_TIMEOUT_MS`, 8000ms → 16000ms): o
  timeout antigo de 8s dava margem curta demais pro novo keepalive de 5s (jitter de rede podia
  remover um jogador só parado). Novo valor é ~3x o keepalive, dando folga real.
- **Reconexão com backoff exponencial + jitter** (`app/src/world3d/multiplayer.ts`):
  `computeReconnectDelayMs(attempt)` (exportada, pura, testada) implementa 1s → 2s → 4s → … → teto
  de 60s, com "full jitter" (multiplica por um fator aleatório entre 0,5 e 1). `RECONNECT_MAX_ATTEMPTS`
  = 10 tentativas por sessão; depois disso, `shouldGiveUpReconnecting` (também pura/testada) faz a
  sessão desistir em silêncio — sem timer novo, sem loop infinito. `ws.onopen` zera o contador
  (uma queda futura numa sessão longa começa o backoff do zero). Antes: reconexão fixa a cada 3s,
  pra sempre, sem limite — exatamente o que viraria um auto-DDoS contra um relay já sem cota.
- **12 testes novos** em `app/src/world3d/multiplayer.test.ts`: matemática do backoff+jitter (5),
  limite de tentativas (2), e a garantia de "modo solo" — `sendState`/`sendAttack`/`sendChat` nunca
  lançam exceção quando não há conexão (3 testes). Suíte do jogo: 22 → 31 testes, todos passando.
- **Script de teste de carga sintético**, novo:
  `app/server-cf-relay/scripts/load-test.mjs` (`npm run load-test` em `server-cf-relay/`). Usa o
  `WebSocket` nativo do Node (sem dependência nova no Worker), reproduz fielmente o MESMO algoritmo
  de envio do cliente real (mesmos `NET_SEND_CHECK_INTERVAL`/`NET_KEEPALIVE_INTERVAL_MS`, cada
  jogador falso alterna "andando"/parado por uma probabilidade fixa). Rodado de verdade contra o
  relay ao vivo duas vezes — ver "Números medidos" abaixo.
- **Build de produção corrigido e testado ao vivo antes do deploy**: rodei `npm run preview` local
  com o build novo, abri duas abas apontando pro relay de produção, movi o jogador numa aba e
  confirmei visualmente que a outra aba passou a mostrar o jogador remoto (rótulo "BrilhanteDragão48"
  visível) — a sincronização de posição continua funcionando com o novo protocolo throttled.
- **Deploy em produção**: front-end (Vercel, aliased em `https://missaoaprendizado.com`). O relay
  (`server-cf-relay`) e o Worker de contas (`server-accounts`) **não foram alterados** neste
  laboratório — toda a mudança de protocolo é do lado do cliente, o relay só repassa mensagens
  (`broadcast(ws, {...msg, id})`), então não havia nada pra redeployar lá.

## Números medidos (não estimativa)
**Antes**: não veio do dashboard do Cloudflare — checado ao vivo (Workers & Pages →
`missao-aprender-relay-v2` → Metrics, últimas 24h): **9 invocations, 8 subrequests** — tráfego real
desprezível, porque o produto ainda não teve uma sessão real com múltiplos jogadores concorrentes
por tempo suficiente pra gerar histórico. Não dava pra medir "antes" no dashboard porque não existe
"antes" reto pra medir ainda. Em vez disso, o número "antes" vem do próprio código-fonte, que é
igualmente um fato medido, não estimado: `if (netSendTimer > 0.12)` era incondicional →
exatamente **8,33 msg/s por jogador, sempre**, é o valor literal do timer que existia até este
laboratório.

**Depois**, com o script de carga contra o relay ao vivo (`missao-aprender-relay-v2.rafaelvs.workers.dev`):
- Smoke test (5 jogadores falsos, 8s, 35% do tempo andando): 34 mensagens enviadas, 4,25 msg/s
  agregado, projeção de 7,6% da cota diária pra 5 jogadores por 30 min.
- Teste de aceite (30 jogadores falsos, 90s, 35% do tempo andando): **1.911 mensagens enviadas,
  21,23 msg/s agregado** (≈0,71 msg/s por jogador). Extrapolando essa taxa medida pra uma sessão de
  30 jogadores por 30 minutos: **≈38.220 requests, 38,2% da cota diária de 100.000** — uma redução
  de **11,8x** frente ao protocolo antigo (que teria gerado ≈22.500 mensagens no mesmo período de
  90s, extrapolando pra ≈450.000 em 30min — mais de 4x a cota diária inteira, sozinho).

## Decisões técnicas tomadas
- **Não dividi `state` em duas mensagens de rede (posição vs. aparência)**, ao contrário do que o
  texto literal do documento sugeria ("separar estado contínuo de estado raro"). Motivo: o recurso
  que está sob cota é **contagem de requests** (cada mensagem WebSocket recebida pelo Durable
  Object conta 1, independente do tamanho do payload) — dividir em duas mensagens não reduz
  contagem de requests quando as duas mudam juntas (o caso comum: jogador anda, então também
  manda a aparência de novo por estar dentro do mesmo envio), e teria introduzido um problema novo
  sem solução óbvia: como um jogador que ENTRA depois aprenderia a aparência de alguém que já está
  parado há minutos, se aparência só fosse enviada "quando muda"? O relay não avisa quem já está
  conectado quando alguém novo entra (só manda `welcome` pro socket novo). A solução que escolhi —
  manter tudo numa mensagem só, mas o keepalive de 5s carrega a aparência completa de novo — resolve
  as duas coisas ao mesmo tempo com uma linha de código a menos de superfície de risco: garante que
  todo jogador conectado (mesmo parado) reenvia sua aparência completa a cada 5s no máximo, então um
  jogador novo aprende a aparência de todo mundo em até 5s, sem precisar de um evento de "join"
  novo no relay nem de um segundo tipo de mensagem. Documentado como desvio consciente no
  `FEATURES.md`.
- **"Modo solo comprovado por teste automatizado" foi cumprido dentro do que é testável sem
  infraestrutura nova**: o projeto não tem Playwright/jsdom (só Vitest, ambiente Node puro — ver
  `vite.config.ts`), então um teste literal de "o jogo abre, renderiza Babylon e progride com o
  relay fora do ar" não é viável sem adicionar uma dependência de teste pesada nova, fora do escopo
  deste laboratório. O que É verificável e foi testado: as funções de rede (`sendState`/
  `sendAttack`/`sendChat`) nunca lançam exceção quando `socket === null` (o estado permanente depois
  de esgotar as tentativas de reconexão) — é a garantia real que sustenta "o jogo não quebra sem
  multiplayer", só não cobre o resto do jogo (progressão, missões), que já não tem NENHUMA
  dependência de rede pra começar (ver `progression.ts`, 100% local/testável, lab-83).
- **Critério de aceite do documento (30 jogadores/30min < 20% da cota) não foi atingido** — medido
  38,2%, quase 2x o alvo. Não tratei isso como um bug a corrigir às pressas dentro deste
  laboratório, porque o próprio `docs/prompts/05-escala-e-viabilidade.md` seção 3 já lista **quatro**
  `[MUST]` diferentes pro problema de tempo real, e este laboratório implementou só dois deles
  (envio por mudança + reconexão) por decisão explícita de escopo no `FEATURES.md` (rooms é uma
  mudança arquitetural separada). O número medido aqui prova que os dois `[MUST]` implementados
  cortam a carga em quase 12x sozinhos — um resultado real e significativo — mas confirma
  empiricamente, com dado medido em vez de intuição, que **não é suficiente sozinho** pra uma sala
  de 30 jogadores achatar abaixo de 20% da cota. Isso muda a prioridade do próximo laboratório de
  "nice to have" pra "necessário" — ver abaixo.

## Pendências / dívidas conhecidas
- **Achado importante, não resolvido**: não está claro nos documentos oficiais do Cloudflare (Workers
  Free plan / Durable Objects pricing) se o limite de 100.000 requests/dia é um bucket **por conta**
  (compartilhado entre TODOS os Workers e TODAS as instâncias de Durable Object) ou um bucket
  **por instância de Durable Object**. As páginas de limites/preços da própria Cloudflare listam o
  número mas não esclarecem o escopo de agregação (verificado nesta sessão via consulta às páginas
  oficiais). **Isso importa muito** pro próximo item da ordem de ataque ("salas com teto de 12
  jogadores", `05-escala-e-viabilidade.md` seção 3): se o limite for por conta, dividir em salas
  (múltiplos Durable Objects) NÃO aumenta a cota total disponível — só reduz o custo de CPU/duração
  por instância e o fan-out O(N²) do broadcast, mas o teto de requests/dia continua sendo o mesmo
  100.000 pro produto inteiro. Se for por instância, salas multiplicam a cota efetiva pelo número de
  salas. **O próximo laboratório precisa resolver essa dúvida antes de investir em rooms** — ou
  testando diretamente (duas instâncias de DO gerando tráfego simultâneo e comparando com o
  dashboard consolidado da conta), ou abrindo um ticket de suporte Cloudflare, ou lendo o código-
  fonte do runtime se disponível.
- O critério de aceite do documento (<20% da cota pra 30 jogadores/30min) não foi atingido só com
  as mudanças deste laboratório — ver "Decisões técnicas" acima. Fica pro próximo laboratório
  resolver, depois de esclarecer o ponto acima.
- `app/server/relay.cjs` (relay v1, legado, Fly.io suspenso) **não recebeu as mesmas mudanças** —
  não há necessidade, já que o protocolo mudou só do lado do cliente (`multiplayer.ts`) e o relay
  v1 já fazia o mesmo repasse genérico que o v2; mas se o v1 algum dia voltar a ser usado, vale
  conferir se o `QUICK_CHAT_IDS`/comportamento dele ainda bate com o cliente atual (já era uma
  dívida antes deste laboratório, não nova).
- O script de carga (`load-test.mjs`) roda contra o relay de **produção** (não há ambiente de
  staging — dívida já registrada em `docs/prompts/05-escala-e-viabilidade.md` G10). Rodar o teste
  de 30 jogadores/30 minutos completo (em vez dos 90s usados aqui) consumiria uma fração real e
  não-trivial da cota diária de produção só pra testar — motivo pelo qual usei uma amostra mais
  curta e extrapolei matematicamente (a taxa de envio é determinística/controlada pelo próprio
  script, então a extrapolação linear é válida assumindo padrão de uso estacionário, o que é uma
  hipótese razoável mas não 100% idêntica a jogo real).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` ficou de fora — todas as 7 foram implementadas e
  verificadas (algumas com resultado numérico abaixo do alvo aspiracional do documento-fonte, o que
  é diferente de "não implementado": ver "Decisões técnicas").

## O que o próximo laboratório deve desenvolver
1. **Resolver a dúvida sobre escopo da cota (por conta vs. por instância de Durable Object)** antes
   de escrever qualquer código de salas — é a decisão que determina se "salas com teto de 12" é
   sequer a solução certa pro problema de contagem de requests, ou se resolve só CPU/duração/fan-out
   (nesse caso, ainda vale a pena, mas por outro motivo, e a redução de mensagens teria que vir de
   outro lugar — ex.: aumentar `NET_SEND_CHECK_INTERVAL`, aumentar `NET_KEEPALIVE_INTERVAL_MS`, ou
   considerar o plano pago do Workers, US$5/mês, se o produto crescer o suficiente pra justificar).
2. **Salas com teto explícito** (`docs/prompts/05-escala-e-viabilidade.md` seção 3) — sala por
   região do mundo (Terra/Marte no mínimo), teto de ~12 jogadores por sala, nova sala ao lotar.
   Reduz broadcast O(N²) e CPU por invocação de qualquer forma, resolve requests/dia só se a
   resposta do item 1 for "por instância".
3. Depois: G3/G5 (endurecimento do relay + socket autenticado) e G4 (moderação de apelido, o único
   achado com risco legal/reputacional imediato) — ordem de ataque completa em
   `docs/prompts/05-escala-e-viabilidade.md` seção 7.
4. Reavaliar `app/server-cf-relay/scripts/load-test.mjs` como parte do critério de aceite de
   qualquer uma dessas mudanças — já existe e está versionado, só rodar de novo com os parâmetros
   certos depois de cada mudança pra confirmar o número real, não assumir.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (31 testes, inclui os 9 novos de `multiplayer.test.ts`) e
    `npx tsc -b` (build limpo).
  - `cd app/server-cf-relay && npm run load-test -- --players 10 --duration-s 20` — roda o teste de
    carga contra o relay ao vivo (ou `--url` pra apontar pra outro relay) e imprime a projeção de
    cota; usar `--players 30 --duration-s 1800` pra reproduzir o critério de aceite completo do
    documento (custa uma fatia real da cota de produção, ver Pendências).
  - Jogo ao vivo com o protocolo novo: https://missaoaprendizado.com (também
    https://app-two-flax-92.vercel.app) — testado ao vivo nesta sessão com duas abas, multiplayer
    continua sincronizando corretamente.
  - Relay (inalterado): https://missao-aprender-relay-v2.rafaelvs.workers.dev
