# Laboratório 202 — Progressão, álbum e recompensas do centro de jogos

Status: concluído
Início: 2026-09-19
Fim: 2026-09-19
Commit inicial: 404d4260984b87ba51eee7498c7687861d403858

## Objetivo do laboratório

Dar à criança um motivo de retorno ao centro de jogos sem pressão predatoria: progresso por
categoria (Contar/Soletrar/Memória/Lógica), troféus visuais nos portais, uma missão semanal
saudável de "jogue 1 mini-jogo educativo", e um resumo pro responsável mostrando habilidade
praticada.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 217 - Progressao, album e recompensas do
centro de jogos" — próximo item depois do lab-201 (Lab 216, mini-jogo de memória e padrões).

## Investigação prévia

- **Infraestrutura reaproveitável já existe**: sistema de badges (`badgesEarnedAt`, `progression.ts`)
  e — principalmente — o objetivo educativo/ambiental do evento semanal (lab-182,
  `weeklyEventObjectiveRewardedAtIso`/`isWeeklyEventObjectiveDone`/
  `hasWeeklyEventClockRolledBack`/`wouldGrantWeeklyEventObjectiveReward`/
  `applyWeeklyEventObjectiveProgress`) — mesmo padrão anti-recuo-de-relógio, copiado quase
  literalmente pra uma missão semanal SEPARADA ("jogue 1 mini-jogo educativo", campo próprio
  `gameCenterWeeklyQuestRewardedAtIso` — os dois objetivos podem conceder na MESMA semana,
  independentes).
- **Resumo pro responsável já existe** (`ChildProgressPanel`, `FamilyPortal.tsx`, lab-167): mostra
  `skillBreakdown` (missões por tipo). Estendido com uma seção nova de categorias do centro de
  jogos, em vez de criar um painel do zero.
- **4 categorias = os 4 portais já existentes** (`GameCenterPortalId`/`GAME_CENTER_PORTAL_IDS`,
  lab-197) — `GameCenterCategory` (`types.ts`) é o MESMO conjunto de 4 ids, não um conjunto
  paralelo que poderia divergir.
- **`logica` conta a MESMA habilidade em 2 caminhos**: o desafio da ponte pode ser resolvido pelo
  portal "Lógica" do centro de jogos OU pelo local físico original (lab-180) — os dois usam
  `kind: 'bridge'` por baixo (decisão já tomada no lab-197: "não inventar um kind novo só pra
  medir de onde veio"). Decisão desta lab: os dois contam pra categoria `logica` — o backlog trata
  como categoria de HABILIDADE, não "visitou o portal", e um responsável não se importa por qual
  caminho a criança praticou lógica.
- **Achado ANTES de escrever código**: `progressRef.current` (`World3D.tsx`) não é atualizado
  sincronamente por `setProgress` (React agenda a atualização, não aplica na hora) — um refresh dos
  troféus visuais chamado LOGO APÓS disparar a atualização de progresso leria a contagem ANTIGA, não
  a nova. Resolvido devolvendo a contagem NOVA (`newCompletions`) já calculada de forma síncrona
  (a partir do `progress` estável do closure de `useProgress`, mesmo padrão já usado por
  `weeklyEventObjectiveProgress`), em vez de depender de reler `progressRef.current` na mesma
  sincronia — ver "Verificação de código" abaixo pra mais detalhe. Isto significa que a arena
  ATUALIZA o troféu na mesma visita (memória/contar/soletrar); só o desafio de Lógica (detectado
  fora de `World3D.tsx`, em `App.tsx`) fica pra próxima entrada no saguão (limitação aceita,
  documentada no código).

## Decisão de escopo (confirmada com o usuário)

3 opções levantadas: (a) tudo, mas sem troféu 3D visual (só texto/hint); (b) tudo incluindo troféus
3D nos portais; (c) dividir em 2 labs (só dados/missão semanal nesta, troféus+resumo numa próxima).
Usuário escolheu (b) — escopo completo, incluindo os troféus como objetos 3D de verdade nos 4
portais do saguão.

## Funcionalidades planejadas

- [x] Progresso por categoria persistido (`Progress.gameCenterCompletionsByCategory`, `types.ts`) —
  incrementado 1x por CONCLUSÃO de verdade de qualquer arena/desafio das 4 categorias.
- [x] Troféus conquistáveis só jogando (bronze/prata/ouro, limiares 1/5/15 —
  `GAME_CENTER_TROPHY_THRESHOLDS`, `progression.ts`), sem loot box/gacha/boost pago. Objetos 3D de
  verdade acima de cada placa do saguão (`World3D.tsx`), cor/visibilidade sincronizadas com o
  progresso real.
- [x] Dica "Pressione E" de cada portal ganha um prefixo de progresso (`gameCenterTrophyProgressPrefix`)
  — cobre "criança vê o que já completou e o próximo objetivo" sem um painel novo.
- [x] Missão semanal "jogue 1 mini-jogo educativo" (`gameCenterWeeklyQuestRewardedAtIso`,
  `applyGameCenterWeeklyQuestProgress`) — mesmo padrão anti-recuo-de-relógio do objetivo ambiental
  já existente, campo/recompensa SEPARADOS (15 moedas, `GAME_CENTER_WEEKLY_QUEST_REWARD_COINS`).
- [x] Resumo pro responsável (`ChildProgressPanel`, `FamilyPortal.tsx`): nova seção mostrando troféu
  + contagem vitalícia de cada uma das 4 categorias.
- [x] Recompensas sempre conquistáveis jogando, assinatura não bloqueia nada disto (nenhum código
  novo aqui checa `entitlement`/assinatura).
- [x] Eventos novos: `minigame_trophy_earned` (`category`+`tier`, dispara só na conclusão que CRUZA
  um limiar novo), `game_center_weekly_quest_completed`, `game_center_progress_viewed` — allowlist
  server-side desde o primeiro commit (`isValidGameCenterCategory` reaproveita
  `isValidGameCenterPortalId`; `isValidGameCenterTrophyTier`, conjunto novo).
  `weekly_meaningful_play_learning_sessions` (métrica citada pelo backlog) é
  `weeklyFunnel.weeklyMeaningfulPlayLearningSessions`, alcance semanal derivado de
  `game_center_weekly_quest_completed` — não é um evento próprio.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (5ª lab seguida — mesma limitação exata, confirmado com uma aba nova). Documentado abaixo;
  confiado em `tsc`/testes/build + leitura de código cuidadosa, que encontrou e corrigiu 1 bug real
  (a defasagem de `progressRef.current` descrita acima) ANTES de qualquer teste externo.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` do app: 254/254 (+11 de
`progression.test.ts`); `npm run build` sem erros; `server-accounts`: `npx tsc --noEmit` limpo,
`npm run test -- --run` 164/164 (+3 novos).

**Bug real encontrado e corrigido nesta própria revisão** (antes de qualquer teste externo):
`handleGameCenterMinigameReward` (`World3D.tsx`) chamava `onGameCenterMinigameCompletedRef.current(category)`
(que dispara `setProgress` em `App.tsx`, via `useProgress().gameCenterMinigameCompleted`) e, LOGO
EM SEGUIDA, na MESMA sincronia, tentava atualizar o troféu visual lendo `progressRef.current` —
mas `setProgress` do React NÃO é síncrono (agenda a atualização, não aplica na hora), então
`progressRef.current` só reflete a conclusão recém-creditada no PRÓXIMO render, bem depois da
leitura já ter acontecido. O troféu visual simplesmente não atualizaria na mesma visita (só na
próxima entrada no saguão), contrariando o próprio propósito de rotear memória/contar/soletrar por
um caminho de feedback "instantâneo" em vez de confiar só no refresh de `enterGameCenterInterior`.
Corrigido devolvendo `newCompletions` (a contagem NOVA) já calculada de forma síncrona por
`useProgress().gameCenterMinigameCompleted` — a partir do `progress` ESTÁVEL do closure do hook
(nunca de dentro do atualizador funcional de `setProgress`, mesmo padrão já usado por
`weeklyEventObjectiveProgress`, lab-182) — e usando esse valor direto pra atualizar SÓ o troféu
daquele portal (`updateGameCenterTrophyVisual`, extraído de `refreshGameCenterTrophyVisuals` pra
poder ser chamado com uma contagem já conhecida, sem precisar ler `progressRef` nenhuma).

Outros pontos conferidos por leitura:

- **Migração de perfis antigos**: `loadProgress()` (`storage.ts`) já faz
  `{ ...emptyProgress, ...JSON.parse(raw) }` — um perfil salvo ANTES desta lab simplesmente não tem
  as chaves novas no JSON, então o spread cai pro default (`{contar:0,...}`/`null`) sem precisar de
  migração explícita.
- **`newTrophy` só dispara na conclusão que CRUZA um limiar**: testado explicitamente
  (`applyGameCenterMinigameCompleted`, `progression.test.ts`) — 2 vitórias seguidas em bronze não
  disparam `newTrophy` duas vezes.
- **Ordem de operações nos 4 sucessos de arena**: `trackMinigameCompleted`/`onCollectCoin` (moeda-
  base da vitória) sempre rodam ANTES de `handleGameCenterMinigameReward` — a moeda da vitória e a
  moeda da missão semanal (se concedida na mesma vitória) são duas chamadas de `onCollectCoin`-
  equivalentes SEPARADAS, nunca coincidem numa única linha confusa.

**Risco remanescente, honesto**: a posição exata do troféu 3D acima de cada placa (mesma altura
pra todos os 4 portais, formato de taça simples) não foi confirmada ao vivo — não avaliei ao vivo
se fica visualmente equilibrado ou se choca com o teto da sala. Reduzido (não eliminado) por manter
a malha pequena (0.32 de altura) e por cima do já existente `plaqueBoard` (que já tem margem
vertical comprovada até o teto).

## Fora de escopo (explicitamente adiado)

- Multiplayer, ranking global agressivo, recompensa paga (excluídos pelo próprio item do backlog).
- Streak punitivo (não implementado — a missão semanal não penaliza semana perdida, mesmo espírito
  do objetivo ambiental já existente).
- Progressão persistida por PERFIL sincronizada entre aparelhos (o jogo é frontend-only pra
  gameplay, mesma limitação já aceita em toda a base de `Progress`).
- Cosmético premium/vitrine adulta (já existe, separado — não tocado aqui).
