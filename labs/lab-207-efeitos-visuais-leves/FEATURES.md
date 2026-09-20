# Laboratório 207 — Efeitos visuais leves: poeira de aterrissagem

Status: em andamento
Início: 2026-09-20
Commit inicial: 887eaa768f93eb7f4f8fea3d58f8c5e3270a9d3d

## Objetivo do laboratório

Primeira fatia pequena do backlog "Lab 198 - Efeitos visuais de recompensa, movimento e
interação" (pacote leve de efeitos: landing puff, footstep dust, brilho em interativo, pulso de
recompensa, trail de foguete/cometa, feedback de puzzle): uma nuvem de poeira ao aterrissar depois
de qualquer queda/pulo, dando mais peso físico ao movimento sem exigir shader pesado nem partículas
sem orçamento — exatamente o que o próprio item do backlog descreve como escopo aceitável.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — escolhido entre os itens não bloqueados por medição de FPS ao vivo (Lab
193 drawcalls) depois do lab-206 (Lab 196).

## Investigação prévia

- **Padrão de partícula já estabelecido e maduro**: `rocketFlameSystem` (chama do foguete, lab-59)
  já usa exatamente a técnica necessária — `DynamicTexture` com gradiente radial desenhado num
  canvas, `ParticleSystem` com `emitRate` controlado (ligado/desligado conforme o evento). A poeira
  de aterrissagem reaproveita 100% dessa técnica, só trocando cor (terrosa em vez de
  amarelo/laranja) e trocando "ligado contínuo" por um ÚNICO disparo (`manualEmitCount` +
  `.start()`, padrão de burst já suportado nativamente pelo Babylon.js, sem precisar de nada novo).
- **Mundo é uma ESFERA — "poeira sobe e cai" precisa respeitar `localUp` de onde o jogador está**,
  não um "pra baixo" fixo do mundo (ao contrário de chuva/chama de foguete, que já são efeitos
  GLOBAIS/relativos a um objeto que sempre aponta pra cima de verdade). `direction1`/`direction2`/
  `gravity` do sistema são recalculados a cada disparo com base no `localUp` do PONTO onde o
  jogador aterrissou (mesmo idioma já usado em todo o arquivo pra orientar objetos na superfície:
  `Vector3.Cross(localUp, Vector3.Right())` pra achar um par de eixos perpendiculares).
- **Detecção de aterrissagem**: o loop de física principal já calcula `grounded` (raycast físico
  real) todo quadro, usado hoje só pra liberar o pulo. Um novo `let wasGroundedLastFrame` detecta a
  transição falso→verdadeiro (acabou de tocar o chão) — dispara em QUALQUER aterrissagem (pulo
  normal, queda de parkour, etc.), sem distinguir a altura da queda (simplificação deliberada, ver
  "Fora de escopo").
- **`emitter` do `ParticleSystem` aceita um `Vector3` simples** (não precisa ser sempre uma malha
  perseguida) — um snapshot da posição do pé no momento do toque no chão é suficiente; a nuvem fica
  parada onde o jogador aterrissou, não o segue enquanto ele anda embora (comportamento correto de
  poeira de verdade).

## Decisão de escopo

Sem pergunta ao usuário nesta lab (escopo já reduzido a UMA fatia pequena, de baixo risco, reaproveitando
100% de uma técnica já madura e testada em produção). As outras 5 peças do Lab 198 (footstep dust,
brilho em interativo, pulso de recompensa, trail de foguete/cometa, feedback de puzzle) ficam pra
labs futuros — cada uma merece sua própria decisão de escopo/verificação.

## Funcionalidades planejadas

- [x] `ParticleSystem` de poeira (textura gerada por canvas, mesma técnica de `rocketFlameSystem`),
  construído uma vez perto da criação do avatar, sempre disponível (não depende de estar num
  planeta específico).
- [x] Disparo em burst (`manualEmitCount`) a cada transição "no ar → no chão" detectada no loop de
  física principal, com direção/gravidade calculadas a partir do `localUp` do ponto de contato.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (10ª lab seguida — mesma limitação exata, confirmado com uma aba nova). Documentado abaixo;
  confiado em `tsc`/testes/build + leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança —
nenhuma lógica de domínio nova, só efeito visual/gatilho de física); `npm run build` sem erros.

Pontos conferidos por leitura:

- **`manualEmitCount` + `.start()`** é o padrão nativo do Babylon.js pra burst único — confirmado
  contra o código-fonte real (`thinParticleSystem.pure.js`): enquanto `manualEmitCount > -1`, TODAS
  as partículas pedidas nascem numa única atualização (não pausadas por `emitRate`, que nem chega a
  ser lido nesse modo), e o valor fica travado em `0` depois de consumido (não volta sozinho pro
  modo `emitRate`) — por isso o disparo escreve `manualEmitCount` de novo a cada aterrissagem, em
  vez de confiar em qualquer reversão automática.
- **Fallback do eixo degenerado** (`localUp` paralelo a `Vector3.Right()`) mirrora exatamente
  `teleportAvatarTo` (já existente, testado ao vivo em labs anteriores) — decisão deliberada de
  incluir esse fallback aqui (ao contrário de âncoras fixas como o parkour, que não precisam, por
  serem escolhidas manualmente longe de qualquer polo problemático): o jogador pode aterrissar em
  QUALQUER ponto da esfera, incluindo, em tese, um alinhado com `Vector3.Right()`.
- **`emitter = pos.subtract(localUp.scale(AVATAR_RADIUS)).clone()`**: snapshot de posição (não uma
  malha perseguida) — a nuvem fica parada onde o jogador aterrissou, comportamento correto de
  poeira de verdade (não segue o jogador andando embora).

**Risco remanescente, honesto**: a aparência/proporção exata da nuvem (tamanho, velocidade,
duração) não foi confirmada ao vivo — valores escolhidos por analogia com `rocketFlameSystem`
(já testado ao vivo), ajustados pra uma sensação mais "poeira caindo" que "chama subindo", mas sem
confirmação visual real.

## Rodada de review — Copilot (PR #90)

1 achado, parcialmente confirmado (mecanismo alegado incorreto, mas correção adotada mesmo assim):

1. **Médio — "emissão contínua continua ligada depois do burst manual" (mecanismo alegado
   INCORRETO, correção adotada por outro motivo)**: o review alegou que, com `emitRate = 200`, o
   sistema continuaria emitindo por taxa depois do burst de 18. Investigado contra o código-fonte
   real do `@babylonjs/core` instalado (`thinParticleSystem.pure.js`, função de atualização por
   quadro): enquanto `manualEmitCount > -1` (verdadeiro logo depois de setado, e continua verdadeiro
   mesmo depois de consumido e zerado — `0 > -1`), o sistema NUNCA volta sozinho pro modo
   `emitRate`; `emitRate` simplesmente não é lido nem uma vez enquanto isso — a alegação específica
   do review não procede tecnicamente. Mesmo assim, `emitRate` foi trocado de `200` pra `0` (o
   valor real que eu já pretendia como "estado de repouso", mesma convenção de `rocketFlameSystem`):
   o `200` original nunca fazia nada de verdade neste sistema (só usa `manualEmitCount`, nunca
   `emitRate`), e o comentário original que dizia "`emitRate = 200` pra pausar/acelerar o burst"
   estava factualmente errado — corrigido junto.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` continuam limpos depois da
correção.

**Rodada 3**: "Findings: None" pra achado formal, achado da rodada 2 confirmado "Resolved since
last review". O resumo em texto solto levantou uma preocupação nova, sem comentário inline:
teleportes/respawns (pouso de planeta, morte em Marte, checkpoint do parkour, entrar/sair de casa —
muitos pontos de chamada espalhados pelo arquivo) reposicionam o avatar instantaneamente; se ele
estivesse no ar bem no instante do teleporte, o quadro seguinte veria a transição falso→verdadeiro
e disparava poeira "do nada" no destino. Avaliado como um achado real (cenário plausível), mas em
vez de tocar cada ponto de teleporte individualmente (caro, e arriscado esquecer um), corrigido
detectando a PRÓPRIA causa raiz: um deslocamento de posição maior que qualquer movimento físico
normal produz num quadro só (limiar de 5 unidades — bem acima do que `RUN_SPEED` + impulso do
parkour conseguem mesmo com um soluço de FPS, bem abaixo de qualquer distância real de teleporte)
só pode ser teleporte/respawn — suprime o disparo nesse quadro específico, cobrindo qualquer ponto
de teleporte existente OU futuro sem precisar tocar nenhum deles.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da correção.

**Rodada 4**: 1 achado real, confirmado e corrigido — a correção da rodada 3 (limiar de
deslocamento de 5 unidades) foi INSUFICIENTE:

4. **Médio — respawn de checkpoint do parkour passava batido pelo limiar de 5 unidades**: o
   review calculou que `teleportAvatarToPosition` no respawn de checkpoint desloca o avatar de até
   ~1,3 unidade ABAIXO do checkpoint (`PARKOUR_FALL_MARGIN`) pra ~0,9 unidade ACIMA dele
   (`AVATAR_RADIUS + 0.35`) — um deslocamento total de só ~2,2 unidades, bem abaixo do limiar de 5
   que a rodada 3 escolheu. Confirmado como um problema estrutural do próprio limiar: 5 unidades
   precisava ser alto o bastante pra nunca confundir uma queda rápida de verdade sob lag (uma
   queda a velocidade alta PODE mesmo mover 2+ unidades num quadro só sob um soluço de FPS) — não
   dava pra baixar o limiar sem arriscar o problema oposto (suprimir poeira de quedas reais).
   Corrigido abandonando o limiar de distância inteiramente: cada um dos 7 pontos que reposicionam
   o avatar diretamente neste arquivo (achados por buscar o padrão compartilhado
   `avatarBody.body.disablePreStep = false`, já usado em todos eles: `teleportAvatarTo`,
   `teleportAvatarToPosition`, saída do carro, os 2 teleportes de depuração
   `__debugTeleport`/`__debugTeleportExact`, entrada na casa, entrada no centro de jogos) agora
   marca `wasGroundedLastFrame = true` explicitamente — mesmo padrão de mutação de closure
   compartilhada já usado por `facing` dentro de `teleportAvatarTo`. Cobertura completa dos 7
   pontos confirmada por busca no arquivo inteiro.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da
correção.

**Rodada 5**: 1 achado real, confirmado e corrigido — a correção da rodada 4 (marcar
`wasGroundedLastFrame = true` DEPOIS de `scene.render()`, no fim de cada função de teleporte) tinha
uma falha de ordem sutil:

5. **Médio — `wasGroundedLastFrame` marcado tarde demais, depois de `scene.render()`**:
   `scene.render()` dispara `onBeforeRenderObservable` de forma SÍNCRONA/reentrante — a própria
   checagem de poeira de aterrissagem roda de novo, ainda dentro da mesma chamada de teleporte,
   ANTES da linha `wasGroundedLastFrame = true` (que só vinha depois do `scene.render()`) ter
   chance de rodar. Isso é relevante de verdade porque `teleportAvatarToPosition` (respawn de
   checkpoint do parkour) é chamada de DENTRO do próprio laço de física principal — não de um
   handler de evento externo —, então essa reentrância acontece na prática, não só em teoria.
   Corrigido movendo `wasGroundedLastFrame = true` pra ANTES de `scene.render()` nos 7 pontos
   (mesma lista da rodada 4).

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da
correção.

**Rodada 6**: 1 achado real, confirmado por conta matemática precisa e corrigido — a correção da
rodada 5 (marcar `wasGroundedLastFrame = true` ANTES de `scene.render()`) ainda tinha uma brecha:

6. **Médio — a própria chamada reentrante podia SOBRESCREVER a marcação de antes**: o respawn de
   checkpoint do parkour posiciona o avatar em `checkpointPos + PARKOUR_ANCHOR_UP*(AVATAR_RADIUS +
   0.35)` — como a plataforma tem 0,3 de altura (topo a +0,15 do centro), os PÉS do avatar ficam
   ~0,2 unidade ACIMA da superfície de verdade (folga de segurança deliberada). Contra o limiar de
   `grounded` (`AVATAR_RADIUS + 0.13`), essa folga de 0,2 é grande demais — a checagem REENTRANTE
   (disparada pelo próprio `scene.render()` de dentro da função de teleporte) calcula
   `grounded=false` nesse instante e GRAVA `wasGroundedLastFrame = false` de volta, sobrescrevendo
   a marcação `true` de antes, ANTES da função de teleporte sequer terminar. No quadro seguinte de
   verdade, o avatar já assentou (`grounded=true`), mas `wasGroundedLastFrame` ficou `false`
   (sobrescrito) — dispara a poeira mesmo assim. Corrigido reafirmando `wasGroundedLastFrame = true`
   de novo, IMEDIATAMENTE DEPOIS de `scene.render()`, nos mesmos 7 pontos — a marcação de ANTES
   ainda é necessária (protege a própria checagem reentrante, pros destinos que pousam bem no
   chão), a de DEPOIS garante que o quadro seguinte real sempre veja o valor certo, não importa o
   que a chamada reentrante tenha decidido no meio do caminho.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da
correção.

**Rodada 7**: "Findings: None", achado da rodada 6 ("Reapply respawn dust suppression after
re-entrant render") confirmado "Resolved since last review". A contagem bruta de comentários
inline subiu de 4 pra 5 nesta rodada — verificado id por id (`gh api .../pulls/90/comments`) antes
de assumir que era achado novo: o 5º comentário (`4056841117`, linha 3967) é exatamente o texto que
gerou a correção da rodada 6 (reafirmar `wasGroundedLastFrame = true` depois de `scene.render()`),
só que eu não tinha registrado o id dele nesta tabela até agora — não é um achado adicional, é o
mesmo já corrigido, agora confirmado resolvido pelo próprio resumo da rodada 7. Nenhum comentário
genuinamente novo. Pronta pra revisão de merge.

## Fora de escopo (explicitamente adiado)

- Footstep dust (poeira a cada passo andando) — mais frequente/sensível a performance, merece sua
  própria decisão de orçamento de partículas.
- Brilho em objeto interativo, pulso de recompensa, trail de foguete/cometa, feedback de puzzle —
  as outras 5 peças do Lab 198.
- Distinguir queda alta de queda pequena (intensidade/tamanho da nuvem proporcional à altura da
  queda) — simplificação deliberada: todo aterrissagem dispara a MESMA nuvem.
- Lab 193 (drawcalls), Lab 194 (chat contextual radial), Lab 197 (órbitas), Lab 200 (missões
  físicas por planeta) — candidatos que ficaram de fora desta escolha.
