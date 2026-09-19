# Laboratório 199 — Mini-jogo de contar e quantidade

Status: em andamento
Início: 2026-09-19
Fim: -
Commit inicial: b93f21f9d42128a8f000cfe4c618c097cb807711

## Objetivo do laboratório

Entregar o primeiro mini-jogo "de verdade" de matemática inicial (contar quantidade) sobre o
template de arena criado no lab-198, e — decisão confirmada com o usuário via `AskUserQuestion`
antes de começar — generalizar de fato a máquina de estado da arena (hoje só com NOMES genéricos,
mas implementação colada à memória) antes de repetir o padrão pela 3ª vez no lab-215 (soletrar).

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 214 - Mini-jogo de contar e quantidade" —
próximo item depois do lab-198 (Lab 213, template de arena).

## Investigação prévia

- **Estado real do "template" do lab-198**: `arenaPhase`/`arenaSecondsLeft` (closure de `World3D.tsx`,
  ~linha 3513) são os únicos nomes genéricos — todo o resto (`arenaMemoryState`,
  `gameCenterMemoryStatusLabel`, `beginMemoryArenaCountdown`, `tickPlayingTimer`,
  `handleMemoryCardInteract`, `MEMORY_TIME_LIMIT_S`) é específico da memória. Só existe UMA arena
  ativa por vez no centro de jogos (não há índice por tipo de jogo). O critério de aceite do
  lab-213 ("adicionar outro mini-jogo exige poucos pontos de código") nunca foi testado de verdade
  até agora.
- **Achado Alto do review do Copilot no lab-198** (`gcMemoryCardPos` usava a posição da carta em
  nível do chão, mas `avatarMesh.position` fica sempre elevado — gap vertical sozinho excedia o
  raio de gatilho): risco real de se repetir em qualquer novo alvo interativo se cada mini-jogo
  reimplementar o cálculo de posição de gatilho do zero. Vira parte da generalização: um helper
  único que sempre usa a posição JÁ ELEVADA da malha.
- **Backlog do Lab 214 é explícito**: "sem tempo punitivo" nos critérios de aceite — logo, ao
  contrário da memória (cronômetro de 45s com falha), a arena de contar não deve ter cronômetro
  nenhum (`timeLimitS: null` na config genérica).
- **Recompensa real**: lab-198 adiou recompensa persistida (moeda/XP) pra memória explicitamente
  pro lab-216 (lab dedicado à polida de memória). O Lab 214 do backlog já É o lab dedicado ao
  mini-jogo de contar (não uma prova de conceito genérica) e seu próprio critério de aceite pede
  "ganha XP/moedas/badge grátis" — então esta fatia conecta a uma recompensa real, via
  `onCollectCoin` (prop já existente em `World3DProps`, mesmo padrão usado em `MARS_COIN_POT_REWARD`
  — várias chamadas em sequência, sem prop nova).
- **Padrão de módulo de domínio puro**: `state/memoryGame.ts` (lab-198) é o modelo a seguir —
  `state/countingGame.ts` fica igualmente puro/testável sem Babylon.

## Decisão de escopo (confirmada com o usuário)

Duas opções levantadas: (a) generalizar agora a máquina de estado da arena (extrair um pequeno
controlador reutilizável a partir do código da memória, migrar a memória pra usá-lo, e construir
Contar em cima dele); ou (b) duplicar por agora uma segunda máquina de estado só pra Contar,
adiando a generalização de verdade pro lab-215/216. Usuário escolheu (a) — maior mexida nesta
fatia, mas evita repetir o padrão memória-colado uma 3ª vez e prova de verdade o critério de
aceite do lab-213.

## Funcionalidades planejadas

- [ ] Generalizar o controlador de arena em `World3D.tsx`: `type ArenaId = 'memoria' | 'contagem'`,
  `activeArenaId`, uma config por arena (label/emoji, `timeLimitS: number | null`, callbacks de
  início/saída), `beginArenaCountdown(id, isRetry)`/`tickArenaTimer()`/`exitActiveArena()`
  genéricos operando sobre `arenaPhase`/`arenaSecondsLeft` (já compartilhados). Migrar a memória
  pra usar esse controlador SEM mudar comportamento visível (regressão coberta pelos testes/
  verificação ao vivo já existentes do lab-198).
- [ ] Helper genérico de posição de gatilho (`arenaTargetTriggerPos`) que sempre usa a posição já
  elevada da malha (não uma posição em nível do chão calculada à parte) — evita reproduzir a
  classe de bug Alto achada pelo Copilot no lab-198. Migrar `gcMemoryCardPos` pra usar o mesmo
  helper.
- [ ] Módulo de domínio puro `state/countingGame.ts` (+ testes): gera uma rodada (quantidade-alvo
  aleatória 2-6 + 3 opções únicas embaralhadas incluindo a certa, `random` injetável mesmo padrão
  de `createMemoryGame`), confere resposta, 3 rodadas corretas seguidas = jogo completo; errar
  não perde progresso (mesma rodada continua, só feedback, pode tentar de novo).
- [ ] Portal "Contar" desbloqueado no centro de jogos: interagir revela um agrupamento de N
  objetos decorativos (estrelas, não-interativos, só pra contar visualmente) + 3 placas de
  resposta interativas (mesma interação de proximidade + tecla `E` das cartas de memória). Sem
  cronômetro/estado de falha por tempo.
- [ ] Recompensa real ao completar: chama `onCollectCoin()` algumas vezes (mesmo padrão de
  `MARS_COIN_POT_REWARD`, sem prop nova).
- [ ] Eventos comuns do template (`minigame_started/completed/retried/exited`, `minigameId:
  'contagem'`) — adicionar `'contagem'` ao allowlist server-side (`isValidMinigameId`) desde o
  primeiro commit.
- [ ] Verificar ao vivo: entrar, completar as 3 rodadas, ganhar moedas, sair no meio sem completar,
  tentar de novo. Se o ambiente de automação desta sessão não permitir (mesma limitação do lab-198
  — aba trava em `document.hidden`), documentar e confiar em `tsc`/testes/build + leitura de
  código, igual foi feito na 2ª rodada de review do lab-198.

## Fora de escopo (explicitamente adiado)

- Comparar "mais/menos/igual" e sequências numéricas simples (v1 cobre só "contar e escolher o
  total certo"; expandir fica pra uma iteração futura do próprio Lab 214 se o produto pedir).
- Dificuldade progressiva por nível/perfil.
- Retroagir recompensa real pra memória — decisão já tomada no lab-198, fica pro lab-216.
- Mini-jogo de soletrar (lab-215/Lab 215) e progressão/álbum do centro de jogos (lab-217).
- Multiplayer, ranking global, personalização paga da arena (excluídos pelo próprio item do
  backlog desde o lab-213).
