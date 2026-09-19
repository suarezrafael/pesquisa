# Laboratório 203 — Parkour arcade com argolas, checkpoints e troféu

Status: em andamento
Início: 2026-09-19
Commit inicial: 33708c29d2870c1a62de2b31629c3e124098bc5e

## Objetivo do laboratório

Transformar o `parkour1` (percurso de plataformas em ziguezague já existente desde o lab-11) de
"travessia" em "jogo repetível de verdade": argolas pra atravessar, checkpoints que evitam punição
por queda, cronômetro informativo, um impulso temporário válido só dentro da arena, e um troféu de
conclusão que aparece no catálogo de conquistas.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 210 - Parkour arcade com argolas,
tesouros e power-ups justos" — próximo item depois do lab-202 (Lab 217, progressão do centro de
jogos).

## Investigação prévia

- **`parkour1` já existe e já é alcançável pelo hub** (lab-196/209): pedestal de entrada
  (`hubParkourPedestalPos`) dispara contagem regressiva de 3s (`minigamePrompt`, React) antes de
  `teleportToMinigameRef.current('parkour1')` (`World3D.tsx`); pedestal de retorno
  (`parkourReturnPos`) teleporta de volta ao hub na hora e grava `minigame_completed('parkour1')` só
  se `activeMinigameId === 'parkour1'` no momento (achado de review de lab anterior: evita gravar
  conclusão do mini-jogo errado).
- **`parkour2`/`parkour3` existem no mundo mas NÃO são alcançáveis por nenhum pedestal/hub/teleporte**
  (confirmado por grep — zero referências fora da própria construção geométrica). Decisão de escopo
  abaixo: ficam de fora desta lab.
- **Percurso**: 7 plataformas (`PARKOUR_STEPS`), referencial tangente local fixo (não acompanha a
  curvatura do planeta, mesma técnica de lagoa/piscina), ziguezague com `PARKOUR_LATERAL_AMPLITUDE`
  e subida de `PARKOUR_HEIGHT_STEP` (0.85) por degrau. Física do pulo já dá folga generosa (altura
  máxima ≈1.54, degrau sobe só 0.85) — comentário original já documenta a conta.
- **Teleporte físico seguro já tem um padrão único**: `teleportAvatarTo(center, landingUp, groundFn)`
  (usado por pouso de planeta/foguete/retorno ao hub) calcula a posição via
  `center + landingUp*(groundFn(landingUp)+AVATAR_RADIUS+0.05)` — pensado pra "pouso na superfície
  esférica do planeta", não serve direto pra reposicionar o avatar numa plataforma específica do
  parkour (que fica FORA da superfície real, numa altura arbitrária do referencial tangente local).
  Precisa de uma função irmã mais simples, que só copia uma posição absoluta já calculada (mesma
  segurança física: `disablePreStep`/`scene.render()`/zerar velocidade), pro respawn de checkpoint.
- **Sem sistema de "morte por queda" no parkour hoje**: cair simplesmente deixa a gravidade normal
  agir até o avatar pousar no chão/relevo real abaixo do percurso — sem dano, sem perda de moeda,
  só o incômodo de subir de novo a pé desde o começo. O pedido do backlog ("queda reseta em
  checkpoint sem punir") já está parcialmente satisfeito (não pune) — falta só o "no checkpoint" (em
  vez de "desde o início").
- **Sistema de emblemas já existe** (`BADGE_FIRST_QUEST`/`BADGE_HALFWAY`/`BADGE_ALL_DONE`/
  `BADGE_COOP_FIRST`, `progression.ts`) e já aparece no álbum de conquistas
  (`ACHEIVEMENT_CATALOG`/`AchievementsPanel.tsx`, lab-93) sem nenhum código de UI dedicado — só
  precisa de mais uma constante + uma linha no catálogo. Satisfaz de graça o critério de aceite
  "troféu aparece no álbum/conquistas quando aplicável" (o mesmo critério do Lab 211, mas essa lab
  não abre escopo pro Lab 211 inteiro — só reaproveita a infraestrutura que ele também usaria).
- **`activeMinigameId` (closure, não React state) já é o único jeito de saber "estou dentro do
  parkour agora"** — vira null assim que o jogador sai pelo pedestal de retorno. Qualquer boost
  condicionado a `activeMinigameId === 'parkour1'` nunca pode "vazar" pro mundo aberto: sair do
  mini-jogo já desliga a condição no mesmo instante, sem precisar de checagem de fronteira geográfica
  separada.
- **Padrão de evento novo já estabelecido** (lab-202): allowlist server-side
  (`PRODUCT_EVENT_TYPES`), validador dedicado + rejeição 400 quando carrega `meta`, branch de
  `safeMeta`, exposição em `weeklyFunnel` quando o backlog cita a métrica.

## Decisão de escopo (confirmada com o usuário)

2 opções levantadas: (a) só melhorar o `parkour1` existente (argolas/checkpoints/cronômetro/
boost/troféu); (b) mesmo que (a) e também construir pedestais novos no hub pra tornar `parkour2`/
`parkour3` (hoje inalcançáveis) em mini-jogos de verdade. Usuário escolheu (a) — só o `parkour1`.

## Funcionalidades planejadas

- [ ] Argolas pra atravessar: uma entre cada par de plataformas consecutivas (`PARKOUR_STEPS - 1` =
  6 argolas), malha toroidal orientada na direção do pulo, coletadas por proximidade (mesmo raciocínio
  de detecção já usado pra moeda/checkpoint, sem física de "atravessar" um plano exato). Contador
  "💍 x/6" no HUD só enquanto dentro do parkour.
- [ ] Checkpoints: cada plataforma alcançada vira o novo checkpoint (índice mais alto já visitado,
  nunca regride). Detecção de queda por altura ao longo de `PARKOUR_ANCHOR_UP` relativa à
  plataforma do checkpoint atual; ao cair, teleporte direto pra cima da plataforma do checkpoint
  (nova função `teleportAvatarToPosition`, mesma segurança física de `teleportAvatarTo` sem a
  matemática de superfície esférica) — sem perda de moeda/argola já coletada.
- [ ] Cronômetro informativo (não punitivo): conta o tempo dentro da arena, mostrado no HUD, sem
  afetar recompensa/dificuldade — só feedback ("seu tempo foi X").
- [ ] Impulso temporário (velocidade + pulo mais alto): um item coletável no meio do percurso, ativo
  só por uma janela de tempo curta E só enquanto `activeMinigameId === 'parkour1'` (sai do mini-jogo
  = desliga na hora, nunca vaza pro mundo aberto).
- [ ] Troféu de conclusão: `BADGE_PARKOUR_MASTER` (novo, `progression.ts`, mesmo padrão de
  `BADGE_COOP_FIRST`) concedido na primeira vez que o jogador alcança o topo com as 6 argolas
  coletadas; catálogo (`data/achievements.ts`) ganha uma entrada nova — aparece no álbum de
  conquistas de graça, sem UI nova.
- [ ] Eventos novos: `parkour_course_completed` (meta: argolas coletadas, total, tempo, troféu
  concedido — cobre "conclusões de parkour" e "troféus conquistados" do backlog) e
  `parkour_checkpoint_respawn` (meta: índice do checkpoint — cobre "tentativas por sessão"/"retry
  sem abandono"). `minigame_started`/`minigame_completed('parkour1')` continuam como já eram (fora
  de escopo mudar a semântica existente).
- [ ] Testes unitários da lógica pura nova em `progression.ts` (`applyParkourCourseCompleted`).
- [ ] Verificar ao vivo (ver limitação conhecida abaixo) e, na falta dela, revisão de código
  cuidadosa.

## Fora de escopo (explicitamente adiado)

- `parkour2`/`parkour3` (escolha explícita do usuário nesta lab).
- Boost pago, pay-to-win, gacha, recompensa aleatória paga, ranking global agressivo (excluídos pelo
  próprio item do backlog).
- Sala/álbum dedicado de troféus de mini-jogo com UI própria (Lab 211 — esta lab só garante que o
  troféu novo apareça no álbum de conquistas JÁ existente, não constrói uma tela nova).
- Mudar a semântica de `minigame_completed('parkour1')` pra exigir conclusão real (hoje conta ao
  tocar o pedestal de retorno) — melhoria identificada, mas não confirmada com o usuário; os 2
  eventos novos já cobrem as métricas específicas do backlog sem precisar mexer no evento existente.
