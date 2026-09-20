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

- [x] Import de `TrailMesh` em `@babylonjs/core`.
- [x] `rocketTrailMesh: TrailMesh | null`, criado só quando `!isLowEndDevice`, gerador =
  `flameAnchor`, material `PBRMaterial` unlit aditivo.
- [x] `boardRocket()`: `computeWorldMatrix(true)` no gerador + `reset()` + `isVisible = true` +
  `start()`.
- [x] `landRocket()`: `stop()` + `isVisible = false`.
- [~] Verificar ao vivo: não tentado nesta lab — efeito só aparece durante o voo de foguete
  (precisa embarcar e decolar de verdade), e as últimas tentativas de verificação ao vivo nesta
  sessão (labs 211-213) já mostraram que mesmo quando o `document.hidden` é contornado, o ambiente
  de automação frequentemente fica com `0 FPS`/`0 draw calls` (loop de renderização parado) e/ou
  reporta GPU fraca (`fraco=true`, que desligaria o rastro de propósito). Confiado em `tsc --force`/
  testes/build + leitura de código cuidadosa (mesmo padrão aceito nas labs anteriores).

## Verificação de código

Checagens automatizadas: `npx tsc -b --force` limpo; `npm run test -- --run`: 257/257 (sem
mudança — efeito puramente cosmético, nenhuma lógica de domínio nova); `npm run build` sem erros.

Pontos conferidos por leitura:

- **`flameAnchor` acessível no escopo de `boardRocket`/`landRocket`**: mesma relação de escopo já
  usada por `rocketFlameSystem` (declarado com `let ... = null` no topo de `setup()`, atribuído
  perto de `flameAnchor` e referenciado dentro de `boardRocket`, que só executa bem depois — em
  resposta a um clique do jogador). `flameAnchor` é uma `const` na MESMA função `setup()`, também
  já em escopo por definição antes de `boardRocket` ser efetivamente chamado.
- **`Engine.ALPHA_ADD` sem import novo**: confirmado em
  `node_modules/@babylonjs/core/Engines/engine.pure.d.ts` — exposto como estático na classe
  `Engine`, já importada neste arquivo.
- **`RegisterTrailMesh()` automático**: confirmado lendo `node_modules/@babylonjs/core/Meshes/
  trailMesh.js` — importar de `@babylonjs/core` (não do `.pure`) já chama `RegisterTrailMesh()`
  como efeito colateral do próprio módulo.

## Rodada de review — Copilot (PR #98)

**Rodada 1**: "🟢 Approval recommended", 1 achado listado (repetido em 3 locais do mesmo arquivo:
linhas 4120/4176/6983) — investigado e **não procede**:

1. **"Reabilitar `TrailMesh` antes de resetar e iniciar o voo"**: o achado presume que o mesh foi
   desabilitado via `setEnabled(false)` e nunca reabilitado antes do próximo `reset()`/`start()`.
   Conferido contra o código real: a criação usa `rocketTrailMesh.isVisible = false` (não
   `setEnabled`), e `boardRocket()` já define `rocketTrailMesh.isVisible = true` explicitamente
   logo antes de `reset()`/`start()` (ver bloco `if (rocketTrailMesh) { flameAnchor.
   computeWorldMatrix(true); rocketTrailMesh.reset(); rocketTrailMesh.isVisible = true;
   rocketTrailMesh.start() }`). Nenhuma chamada a `setEnabled` existe neste código — o achado
   parece uma leitura equivocada do comentário adjacente (que cita `isLowEndDevice`/lab-211 como
   analogia de "não criar" em vez de "criar e nunca disparar", não descrição do próprio
   `TrailMesh`). Nenhuma mudança de código necessária.

`npx tsc -b --force`, `npm run test -- --run` (257/257) e `npm run build` continuam limpos (nenhuma
mudança nesta rodada). Ciclo de review encerrado (1 rodada, achado único investigado e descartado).

## Fora de escopo (explicitamente adiado)

- Feedback de puzzle (última peça restante do Lab 198).
- Rastro com cor/textura variando por planeta de destino.
- Fade de opacidade ao longo do comprimento do rastro (a própria `TrailMesh` já afunila a LARGURA
  geometricamente; variar alpha por segmento exigiria vertex colors/shader customizado — fora do
  orçamento mínimo pedido pelo próprio item do backlog).
