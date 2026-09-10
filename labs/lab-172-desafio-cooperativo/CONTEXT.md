# Contexto — Laboratório 172 — desafio cooperativo fechado

Preenchido em: 2026-09-10
Commit inicial → final: d0df086e446bc88635973468c29b2c8927bacc75..(PR aberto, ver seção final)

## O que foi feito

`docs/market-metrics-engagement-backlog.md` §10, item 7. Antes de codar, perguntei ao usuário
(`AskUserQuestion`) quem pode formar dupla — confirmado: qualquer jogador multiplayer por perto
(reaproveita o portão parental do multiplayer, lab-152, em vez de restringir a amigos
confirmados, que exigiria trabalho novo de identidade).

- **Mecânica sem troca de informação**: cada participante responde sua PRÓPRIA missão (sorteada
  do pool de `data/quests.ts`, sem catálogo novo) de forma independente. Nenhum dos dois precisa
  passar um número/resposta calculada pro outro pelo chat fechado — o catálogo de chat existente
  (`chatMessages.ts`) é frases fixas, não dá pra transmitir um valor arbitrário; a cooperação é só
  "os dois lado a lado, ao mesmo tempo", não uma troca de dados.
- **Landmark novo** (`World3D.tsx`, `desafio-em-dupla`) — dois pedestais + bandeirola, posicionado
  com `terrainGroundRadial`/`settleMeshOnTerrain` reais (mesmo padrão anti-enterrado da carteira
  de estudos). Dica "Pressione E" só acende com outro jogador de verdade por perto
  (`nearestRemotePlayerWithin`, raio `COOP_PARTNER_NEARBY_DISTANCE = 2,5`) — sozinho, o jogador
  nunca vê o convite pra um desafio impossível de terminar.
- **Handshake pelo relé** (`server-cf-relay/src/index.ts` + `app/src/world3d/multiplayer.ts`):
  novo tipo de mensagem `coop-done` — quem responde certo manda `{partnerId}` (o `id` de conexão
  de quem considerava seu parceiro no momento); o relé só valida forma (string, 1-32 chars) e
  repassa com o `id` do remetente, mesma responsabilidade de `attack`/`chat` (nunca decide nada de
  jogo). Cada cliente decide sozinho se o par se formou: só completa quando RECEBEU um
  `coop-done` que aponta pra ele mesmo (`getSelfId()`) E ele TAMBÉM já respondeu certo, dentro de
  uma janela de 90s (`COOP_COMPLETION_WINDOW_MS`, `Date.now()` — não `performance.now()`, que não
  é comparável entre os dois aparelhos).
- **`getSelfId()`/`welcome`** (`multiplayer.ts`) — o relé já mandava a mensagem `welcome` com o
  `id` de conexão desde sempre, mas nenhum código do cliente lia essa mensagem; agora é
  consumida e exposta (necessário pra saber "esse `coop-done` aponta pra MIM?").
- **Recompensa** (`applyCoopChallengeCompleted`, `progression.ts`) — 10 moedas + emblema "Dupla
  Dinâmica" (`BADGE_COOP_FIRST`, catálogo em `data/achievements.ts`) na primeira vez, uma vez por
  dia real por perfil (mesmo anti-farm de `feedPet`). `CoopChallengeToast.tsx` novo (mesmo padrão
  visual de `DailyLoginToast.tsx`) mostra o resultado.
- **Bug real corrigido de passagem**: `applyQuestCompletion` fazia `badges:
  badgesEarnedAt(completedQuestIds.length)` — uma SUBSTITUIÇÃO completa, não união. Como
  `badgesEarnedAt` só conhece os 3 emblemas de missão, completar QUALQUER missão depois de ganhar
  "Dupla Dinâmica" apagaria esse emblema silenciosamente. Corrigido pra união
  (`Array.from(new Set([...progress.badges, ...questBadges]))`) — nenhum emblema de qualquer
  origem se perde mais completando uma missão.

## Decisões técnicas tomadas

- **Nunca restringe a amigos confirmados** (decisão do usuário) — qualquer jogador multiplayer
  por perto forma dupla; o portão parental do multiplayer (lab-152) já é o limite de confiança
  aceito pra esta categoria de interação.
- **Handshake client-side, servidor só repassa** — mesmo modelo de confiança já usado no resto do
  jogo (XP/moeda de missão normal também não são validados no servidor, só no cliente); um
  jogador mal-intencionado poderia teoricamente forjar `coop-done` pra si mesmo, mas essa
  recompensa (10 moedas, uma vez por dia) não é maior que qualquer outra fonte de moeda já
  client-side no jogo — não justifica um backend novo de coordenação de sala.
- **`Date.now()`, não `performance.now()`, pra comparar timestamps entre os dois clientes** —
  `performance.now()` conta a partir da carga da PRÓPRIA página, incomparável entre aparelhos
  diferentes; `Date.now()` (relógio de parede) é aproximadamente sincronizado o bastante pra uma
  janela de 90s.
- **`applyQuestCompletion` corrigido pra união de badges** — necessário descobrir/corrigir ANTES
  de adicionar o emblema novo, senão "Dupla Dinâmica" seria apagado na primeira missão normal
  completada depois. Ver testes novos cobrindo isso explicitamente.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

`docs/market-metrics-engagement-backlog.md` §10 ainda tem: item 6 ("rotina diária saudável com
pet" — já bastante coberto por `feedPet`/login diário/ciclo de vida do lab-169; vale confirmar
com o usuário se falta algo específico antes de abrir um lab só pra isso) e itens da fase de
aquisição paga (vitrine ética de assinatura, preview de relatório) — o documento recomenda só
avançar pra aquisição paga depois de evidência real de ativação/retenção, ainda não coletada
neste ambiente de desenvolvimento. Aguardar pedido novo do usuário.

## Estado do repositório ao final

- Branch: a definir no momento do commit.
- `npx tsc -b` (app): limpo. `npm run test` (app): 160/160 (8 novos — `applyCoopChallengeCompleted`
  x4, `applyQuestCompletion` preserva badges de outra origem x2, `sendCoopDone`/`getSelfId` sem
  conexão x2). `npm run build` (app): limpo, sem regressão de bundle. `npx tsc --noEmit`/`npm run
  test` (server-cf-relay): limpo, 13/13 (sem teste novo — validação de `coop-done` é I/O puro,
  mesma decisão já tomada pra `attack`/`chat`/`state`).
- **Verificado ao vivo, ponta a ponta, com relé e segundo jogador de VERDADE** (não só leitura de
  código): subiu uma instância LOCAL do relé real (`wrangler dev`, Cloudflare Workers + Durable
  Objects) + um segundo processo Vite (porta separada, `VITE_RELAY_URL` apontando pro relé local);
  no navegador, um WebSocket bruto adicional simulou um segundo jogador ("Amigo Falso") mandando
  `state` real pro MESMO relé. Confirmado passo a passo: (1) o jogador remoto apareceu de verdade
  na cena 3D do jogador real (rótulo de nome, posição batendo exatamente com o que foi mandado);
  (2) a dica "Pressione E" só acendeu com o remoto por perto, nunca sozinho; (3) `E` abriu o
  `QuestModal` com uma missão real sorteada; (4) responder certo disparou `coop-done` de verdade
  pelo relé (`{partnerId: "<id do amigo falso>"}`, capturado no lado do "amigo falso"); (5) o
  "amigo falso" respondendo de volta (`coop-done` apontando o jogador real) completou o desafio
  de verdade — toast "Desafio em dupla completo!" confirmado na tela, moeda 117→127, emblema
  "Dupla Dinâmica" apareceu na barra de emblemas do HUD; (6) tentado de novo no MESMO dia real —
  confirmado SEM segunda recompensa (moeda/data/emblemas inalterados no `localStorage`), o
  anti-farm diário funciona.
