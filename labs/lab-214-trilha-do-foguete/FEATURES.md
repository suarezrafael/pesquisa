# Laboratório 214 — Trilha (rastro) do foguete durante o voo

Status: em andamento
Início: 2026-09-20
Fim: -
Commit inicial: f06034eaf1ee17501f549a94a9f497b7c92080b6

## Objetivo do laboratório

Backlog "Lab 198 - Efeitos visuais de recompensa, movimento e interacao": pacote de efeitos leves
(landing puff, footstep dust/grass, brilho em interativo, pulso de recompensa, trail de foguete/
cometa, feedback de puzzle). Landing puff (lab-207), brilho em interativo (lab-211), pulso de
recompensa (lab-212) e poeira de passos (lab-213) já estão feitos; esta lab fecha a peça "trail de
foguete/cometa" — um rastro tipo cometa que persiste atrás da nave durante o voo inteiro entre
planetas, reforçando a sensação de velocidade.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — escolhido autonomamente (mesmo espírito de baixo risco já aceito pros
labs 207/211/212/213) depois do usuário confirmar continuar via `AskUserQuestion`.

## Investigação prévia

- **Já existe uma chama de escapamento (`rocketFlameSystem`, lab-59)**: partículas curtas
  (`minLifeTime`/`maxLifeTime` 0.12-0.22s) saindo dos bocais, ligadas/desligadas via `emitRate`
  em `boardRocket`/`landRocket`. Isso é DIFERENTE do que o item de backlog pede — a chama já existe
  desde sempre; o "trail de foguete/cometa" é um rastro que PERSISTE atrás da nave por um trecho
  bem mais longo do caminho percorrido, não só nos bocais.
- **`TrailMesh` (Babylon.js) é a ferramenta certa pra isso**: classe nativa que gera uma malha em
  fita seguindo um `TransformNode`/`Mesh` gerador, com afunilamento automático (efeito cometa) —
  confirmado no pacote instalado (`node_modules/@babylonjs/core/Meshes/trailMesh.pure.js`,
  Babylon.js v9.21.2). Importar `TrailMesh` do pacote principal (`@babylonjs/core`, não o
  `.pure`) já registra o parser de serialização como efeito colateral do próprio módulo
  (`RegisterTrailMesh()` chamado em `trailMesh.js`) — nenhuma chamada de registro manual
  necessária, só adicionar ao `import { ... } from '@babylonjs/core'` já existente.
- **Reaproveita `flameAnchor`** (nó já existente, parentado à nave, na posição dos bocais) como
  gerador do rastro — mesmo ponto de origem da chama, sem precisar de um novo `TransformNode`.
- **Achado de correção ANTES de qualquer review** (lição de sessões anteriores: pensar no reset de
  estado entre ativações, não só no "ligar"): `TrailMesh.reset()` recoloca todos os segmentos na
  posição ATUAL do gerador (lido via `getWorldMatrix()`) — sem chamar `reset()` logo antes de cada
  decolagem, o primeiro quadro do voo desenharia uma fita esticada ligando o ponto da decolagem
  ANTERIOR (outro planeta, possivelmente do outro lado do sistema solar) até a posição nova. Por
  isso: `flameAnchor.computeWorldMatrix(true)` (força recomputar a matriz de mundo já com a posição
  nova de `flyingRocket`, aplicada segundos antes no mesmo `boardRocket`) seguido de
  `rocketTrailMesh.reset()` e só depois `.start()` — nessa ordem exata, dentro de `boardRocket`,
  depois de `flyingRocket.position`/`rotationQuaternion` já estarem definidos.
- **`TrailMesh` regenera geometria por quadro (`onBeforeRenderObservable`) — custo de malha, não de
  partícula barata**: por isso só CRIADO (não só "disparado") quando `!isLowEndDevice`, mesmo
  padrão de decisão do brilho pulsante do baú (lab-211) — em aparelho fraco, a variável
  `rocketTrailMesh` fica `null` pra sempre e nenhum custo por quadro é pago.
- **Material `PBRMaterial` com `unlit = true`** (mesmo padrão da cúpula de estrelas,
  `starfieldMat`) — `albedoColor = Color3.Black()` explícito (evita o branco padrão do PBR tingir
  o rastro por baixo do emissivo) e `alphaMode = Engine.ALPHA_ADD` (`Engine` já importado neste
  arquivo, expõe a constante `ALPHA_ADD` como estático — sem import novo de `Constants`) pra um
  brilho aditivo consistente com a chama (`ParticleSystem.BLENDMODE_ADD`).
- **`stop()` + `isVisible = false` no pouso** (não só desabilitar `flyingRocket`): `TrailMesh` é um
  mesh de topo próprio na cena, não um filho de `flyingRocket` — desabilitar `flyingRocket` não
  esconde nem para o rastro sozinho.

## Decisão de escopo

Sem pergunta ao usuário sobre a forma exata do efeito (reaproveita geometria/API nativa do
Babylon.js, ponto de ancoragem já existente, mesmo espírito de baixo risco já aceito pras labs
anteriores desta mesma lab-pai). Fora de escopo: feedback de puzzle (última peça restante do Lab
198, merece sua própria decisão de escopo) e qualquer variação do rastro por planeta/tema.

## Funcionalidades planejadas

- [ ] Import de `TrailMesh` em `@babylonjs/core`.
- [ ] `rocketTrailMesh: TrailMesh | null`, criado só quando `!isLowEndDevice`, gerador =
  `flameAnchor`, material `PBRMaterial` unlit aditivo.
- [ ] `boardRocket()`: `computeWorldMatrix(true)` no gerador + `reset()` + `isVisible = true` +
  `start()`.
- [ ] `landRocket()`: `stop()` + `isVisible = false`.
- [ ] Verificar ao vivo: ambiente de automação desta sessão tende a travar em `document.hidden`
  (mesma limitação de labs anteriores) — se acontecer, documentar e confiar em `tsc`/testes/build +
  leitura de código cuidadosa. Efeito só aparece durante o voo de foguete, difícil de alcançar sem
  jogar de verdade mesmo com o mundo carregado.

## Fora de escopo (explicitamente adiado)

- Feedback de puzzle (última peça restante do Lab 198).
- Rastro com cor/textura variando por planeta de destino.
- Fade de opacidade ao longo do comprimento do rastro (a própria `TrailMesh` já afunila a LARGURA
  geometricamente; variar alpha por segmento exigiria vertex colors/shader customizado — fora do
  orçamento mínimo pedido pelo próprio item do backlog).
