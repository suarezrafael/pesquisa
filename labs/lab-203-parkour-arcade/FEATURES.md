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

- [x] Argolas pra atravessar: uma entre cada par de plataformas consecutivas (`PARKOUR_STEPS - 1` =
  6 argolas), malha toroidal orientada na direção do pulo, coletadas por proximidade (mesmo raciocínio
  de detecção já usado pra moeda/checkpoint, sem física de "atravessar" um plano exato). Contador
  "💍 x/6 · ⏱ Xs" no HUD só enquanto dentro do parkour.
- [x] Checkpoints: cada plataforma alcançada vira o novo checkpoint (índice mais alto já visitado,
  nunca regride). Detecção de queda por altura ao longo de `PARKOUR_ANCHOR_UP` relativa à
  plataforma do checkpoint atual; ao cair, teleporte direto pra cima da plataforma do checkpoint
  (nova função `teleportAvatarToPosition`, mesma segurança física de `teleportAvatarTo` sem a
  matemática de superfície esférica) — sem perda de moeda/argola já coletada.
- [x] Cronômetro informativo (não punitivo): conta o tempo dentro da arena, mostrado no HUD, sem
  afetar recompensa/dificuldade — só feedback (contador ao vivo em segundos).
- [x] Impulso temporário (velocidade + pulo mais alto): um item coletável no meio do percurso, ativo
  só por 10s E só enquanto `activeMinigameId === 'parkour1'` (sai do mini-jogo = desliga na hora,
  nunca vaza pro mundo aberto — a condição do multiplicador já checa `activeMinigameId` toda vez,
  não só no momento da coleta).
- [x] Troféu de conclusão: `BADGE_PARKOUR_MASTER` (novo, `progression.ts`, mesmo padrão de
  `BADGE_COOP_FIRST`) concedido na primeira vez que o jogador alcança o topo com as 6 argolas
  coletadas; catálogo (`data/achievements.ts`) ganha uma entrada nova — aparece no álbum de
  conquistas de graça, sem UI nova.
- [x] Eventos novos: `parkour_course_completed` (meta: argolas coletadas, total, tempo, troféu
  concedido — cobre "conclusões de parkour" e "troféus conquistados" do backlog) e
  `parkour_checkpoint_respawn` (meta: índice do checkpoint — cobre "tentativas por sessão"/"retry
  sem abandono"). `minigame_started`/`minigame_completed('parkour1')` continuam como já eram (fora
  de escopo mudar a semântica existente). Allowlist/validação/`weeklyFunnel` desde o primeiro
  commit (`server-accounts`), mesma disciplina do lab-202.
- [x] Testes unitários da lógica pura nova em `progression.ts` (`applyParkourCourseCompleted`, 3
  testes) e em `server-accounts/src/domain.ts` (`isPlausibleCount` exportada, 3 testes + 1 de
  allowlist).
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (6ª lab seguida — mesma limitação exata, confirmado com uma aba nova nesta mesma sessão).
  Documentado abaixo; confiado em `tsc`/testes/build + verificação matemática manual da física de
  queda (ver "Verificação de código").

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` do app: 257/257 (+3 de
`applyParkourCourseCompleted`); `npm run build` sem erros. `server-accounts`: `npx tsc --noEmit`
limpo, `npm run test -- --run` 168/168 (+4 novos).

**Verificação matemática manual da detecção de queda** (não dá pra confirmar ao vivo, ver limitação
acima, então feita com os números reais do percurso): no instante em que o jogador entra no
`parkour1` (`teleportAvatarTo(Vector3.Zero(), PARKOUR_ANCHOR_UP, currentGroundBaseFn)`), a posição
do avatar fica em `parkourAnchorPos + PARKOUR_ANCHOR_UP*(AVATAR_RADIUS+0.05)` = `+0.6` ao longo de
`PARKOUR_ANCHOR_UP`. A plataforma 0 (checkpoint inicial) fica em `parkourAnchorPos + ... +
PARKOUR_ANCHOR_UP*0.5` = `+0.5` na mesma projeção (o deslocamento `forward`/`lateral` da plataforma
não contribui pro produto escalar com `PARKOUR_ANCHOR_UP`, já que `forward`/`right` são perpendiculares
a ele por construção, `Vector3.Cross`). `heightVsCheckpoint` no instante da entrada fica em `0.6 -
0.5 = +0.1` — positivo, não dispara a queda por engano bem no momento de entrar no mini-jogo (a
margem de queda é `-1.3`). Em cima de qualquer plataforma `i` (checkpoint = `i`), a mesma conta dá
`+0.75` (altura do avatar em pé sobre o topo da plataforma, que tem 0.3 de altura). A margem de
`-1.3` fica bem abaixo do pico de qualquer pulo bem-sucedido (altura máxima do pulo ≈1.54 acima do
ponto de partida, sempre positiva até quase o fim da parábola) — só dispara numa queda de verdade,
não numa parábola normal de travessia.

**Risco remanescente, honesto**: a posição exata das argolas (ponto médio entre plataformas + 0.55
de altura) e do item de impulso (plataforma 3, +0.5 de altura) não foi confirmada ao vivo — não
avaliei se a argola realmente intercepta a trajetória do pulo no ponto certo pra "atravessar dá
sensação de acerto" (só calculada por geometria, não vista em jogo). Reduzido (não eliminado) por
reusar exatamente a mesma técnica de orientação já usada e testada ao vivo pro feixe de laser
(`fireLaserBeam`, lab-38/39) e por a distância de gatilho (`PARKOUR_TRIGGER_DISTANCE = 1.0`) ser
generosa o bastante pra tolerar alguma imprecisão de posicionamento.

## Fora de escopo (explicitamente adiado)

- `parkour2`/`parkour3` (escolha explícita do usuário nesta lab).
- Boost pago, pay-to-win, gacha, recompensa aleatória paga, ranking global agressivo (excluídos pelo
  próprio item do backlog).
- Sala/álbum dedicado de troféus de mini-jogo com UI própria (Lab 211 — esta lab só garante que o
  troféu novo apareça no álbum de conquistas JÁ existente, não constrói uma tela nova).
- Mudar a semântica de `minigame_completed('parkour1')` pra exigir conclusão real (hoje conta ao
  tocar o pedestal de retorno) — melhoria identificada, mas não confirmada com o usuário; os 2
  eventos novos já cobrem as métricas específicas do backlog sem precisar mexer no evento existente.
