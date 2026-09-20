# Laboratório 209 — Luas orbitando os planetas secundários

Status: em andamento
Início: 2026-09-20
Commit inicial: f674dba0fd84b0192589425fa248ec9117d86706

## Objetivo do laboratório

Backlog "Lab 197 - Orbitas com objetos em alto-relevo": anéis (Saturno/Urano) e crateras
(Mercúrio) já existem de labs anteriores; falta satélites/luas, cometas ou detritos orbitais, todos
listados como alternativas equivalentes no próprio item ("aneis, crateras, rochas, satelites,
cometas ou detritos orbitais"). Esta lab fecha a peça que falta com luas reais orbitando os 5
planetas secundários que de verdade têm lua (Mercúrio/Vênus ficam de fora — nenhum dos dois tem
nenhuma), cada uma com um fato educativo curto mostrado ao pousar.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 197 - Orbitas com objetos em alto-relevo"
— escolhido com o usuário via `AskUserQuestion` depois do lab-208, entre 3 opções (fatia pequena de
1 lua, escopo maior com várias luas + possível interação, ou pular por agora dado que o critério de
aceite do próprio item pede não derrubar FPS, algo não validável ao vivo nesta sessão). Usuário
escolheu escopo maior.

## Investigação prévia

- **Anéis e crateras já cobrem 2 das ~5 alternativas do item** (`saturnRing`/`uranusRing`,
  `craterFloorMat`/`craterRimMat` em Mercúrio) — confirmado por busca no arquivo antes de começar,
  pra não duplicar trabalho já feito em labs anteriores a esta sessão.
- **Planetas secundários são construídos SOB DEMANDA** (`buildPlanetIfNeeded`/`builtPlanetIds`) —
  só existem na cena depois da primeira visita. Cada lua é construída dentro do respectivo
  `build<Planeta>IfNeeded()`, junto dos outros elementos decorativos daquele planeta (anel,
  escolinhas, baú), não num laço consolidado à parte — mesma convenção já usada por
  `buildPlanetEscolinha`/`buildTreasureChest`.
- **Órbita animada reaproveita 100% o idioma já usado por `cloudGroups`**: `rotateAroundAxis`
  (função global já existente, fórmula de Rodrigues) gira um vetor-base em torno de um eixo a cada
  quadro (`time * velocidade`) — mesma técnica das nuvens do planeta principal, só trocando o eixo
  de rotação de `Vector3.Up()` fixo pro `landingUp` de cada planeta secundário (que pode ter
  qualquer orientação, ao contrário do planeta principal). O vetor-base é o `landingUp` inclinado
  60° em torno de um eixo perpendicular (mesmo fallback de eixo degenerado já usado em
  `teleportAvatarTo`/poeira de aterrissagem — evita colapsar quando `landingUp` é quase paralelo a
  `Vector3.Right()`) — a lua descreve um círculo de latitude, mantendo distância constante do
  centro do planeta (nunca cruza o anel de Saturno/Urano, já que a distância do centro nunca muda
  com a rotação em torno do próprio eixo).
- **Fato educativo reaproveita 100% o idioma já usado pelo cumprimento do professor** (backlog "Lab
  196"): mesma histerese `triggered`/`RESET_DISTANCE`, mesmo balão `furnitureReactionLabel`, mesma
  função `showChatBubbleText`. Disparado a partir do PRÓPRIO ponto de pouso (não um objeto novo no
  chão) — simplificação deliberada: o avatar não voa, não dá pra alcançar fisicamente uma lua
  orbitando no céu, então a "interatividade" pedida pelo critério de aceite ("ao menos alguns são
  interativos/coletaveis/educativos") vem do FATO mostrado ao chegar, não de tocar a lua em si.
- **Culling/LOD**: cada lua é uma única esfera de baixa contagem de segmentos (`segments: 8`, mesma
  ordem de grandeza das crateras de mobília em Mercúrio, `segments: 6`) — o frustum culling padrão
  do Babylon.js (já ativo em toda malha do jogo, nenhuma exceção neste arquivo usa LOD customizado
  nem pra objetos bem maiores) cobre o critério "garantir culling/LOD" sem precisar de nada novo;
  5 esferas extra no total (1 por planeta) é um custo de desenho desprezível.
- **5 luas reais escolhidas, uma por planeta, com cor aproximada da real**: Fobos (Marte, cinza-
  acastanhado), Europa (Júpiter, gelo esbranquiçado), Titã (Saturno, laranja enevoado — atmosfera
  densa é fato real), Titânia (Urano, cinza), Tritão (Netuno, rosa-pálido — órbita RETRÓGRADA de
  verdade, reforçada com `speed` negativo no código). Mercúrio/Vênus ficam de fora (nenhum dos dois
  tem lua nenhuma) — decisão deliberada de honestidade científica, consistente com "Fora de escopo:
  simulação astronômica perfeita" do próprio item (a simplificação é não simular a física orbital de
  verdade, não inventar luas que não existem).

## Decisão de escopo

Confirmada com o usuário via `AskUserQuestion`: escopo maior (luas em vários planetas + fato
educativo ao pousar como forma de interação), não a fatia de 1 lua só nem pular o item. A
"interação" escolhida (fato automático ao chegar) é mais simples que tornar a lua fisicamente
tocável (que exigiria voo ou algum mecanismo de alcance novo, fora de escopo).

## Funcionalidades planejadas

- [x] `buildPlanetMoon(...)`: função reutilizável (perto de `buildPlanetEscolinha`) que constrói a
  esfera da lua + calcula a órbita + registra o fato educativo — chamada uma vez por planeta dentro
  do respectivo `build<Planeta>IfNeeded()`.
- [x] 5 luas: Fobos (Marte), Europa (Júpiter), Titã (Saturno, órbita alargada pra não cruzar o
  anel), Titânia (Urano), Tritão (Netuno, órbita retrógrada).
- [x] Animação de órbita incondicional (mesmo lugar/padrão das outras animações cosméticas do
  laço principal — nuvens, idle dos professores — nunca atrás de guarda de chat/suspensão).
- [x] Fato educativo por proximidade do ponto de pouso, reaproveitando balão/histerese já
  existentes.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (12ª lab seguida — mesma limitação exata). Documentado abaixo; confiado em `tsc`/testes/build +
  leitura de código cuidadosa, incluindo conferência geométrica da distância órbita-vs-anel.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança —
nenhuma lógica de domínio nova, só objetos decorativos/gatilho de proximidade); `npm run build` sem
erros.

Pontos conferidos por leitura:

- **Distância lua vs. anel (Saturno/Urano)**: conferido por conta — anel de Saturno alcança
  `diameter/2 + thickness/2` = `1.35 + 0.275` = `1.625×SATURN_RADIUS` do centro; a lua orbita a
  `2.2×SATURN_RADIUS`, sempre por FORA. Anel de Urano alcança `1.125 + 0.05` = `1.175×URANUS_RADIUS`;
  a lua orbita a `2.0×URANUS_RADIUS`. Como a rotação em torno do próprio `landingUp` preserva a
  distância do vetor-base ao centro (propriedade da fórmula de Rodrigues — girar em torno de um
  eixo não muda a distância a esse eixo nem a origem), a lua NUNCA muda de distância ao centro
  durante a órbita, então essa folga vale em qualquer instante, não só no ponto de partida.
- **`landingUp` como eixo/offset local válido**: confirmado (mesmo raciocínio já documentado no
  lab-206 pra `planetRoot`) que os offsets usados aqui (`center.add(basePos)`,
  `center.add(landingUp.scale(radius + 0.05))`) são cálculos diretos em espaço MUNDO — não dependem
  de nenhum `TransformNode` pai rotacionado, então funcionam pra Marte (que nem tem um `*Root`
  dedicado do mesmo jeito que os outros, usa `SECOND_PLANET_CENTER` direto) do mesmo jeito que pros
  outros 4 planetas.
- **Fobos e Deimos**: Marte tem 2 luas reais; só Fobos foi incluída (1 lua por planeta já cumpre o
  critério de aceite, dobrar o custo de desenho só em Marte quebraria a simetria do padrão
  "1 lua por planeta" sem ganho educativo proporcional).

## Rodada de review — Copilot (PR #92)

**Rodada 1**: 1 achado real, só no resumo em texto (sem comentário inline), confirmado e corrigido:

1. **Médio — lua pula de posição no quadro seguinte à construção sob demanda**: confirmado contra
   o código — planetas secundários só são construídos na primeira visita
   (`buildPlanetIfNeeded`/`builtPlanetIds`), quando o relógio global `time` (contando desde o
   início da sessão) já está bem adiantado, não em zero. `buildPlanetMoon` posicionava a lua na
   fase 0 (`center.add(basePos)`, sem rotação) no momento da construção — assim que o laço de
   órbita por quadro rodasse o próximo quadro com o `time` de verdade (bem maior que 0), a lua
   "pularia" de repente pra fase certa, uma descontinuidade visível. Corrigido calculando a posição
   inicial com a MESMA fórmula do laço por quadro (`rotateAroundAxis(basePos, landingUp, time *
   speed)`), usando o `time` atual no instante da construção — sem descontinuidade entre este
   quadro e o próximo.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da correção.

**Rodada 2**: "Findings: None", nenhum comentário inline (confirmado por contagem — 0). Ciclo de
review encerrado aqui (2 rodadas). Pronta pra revisão de merge.

**Risco remanescente, honesto**: a órbita não foi vista ao vivo — a matemática da distância
constante ao centro (acima) é sólida, mas o TAMANHO aparente/velocidade/legibilidade visual da lua
no céu (pequena demais? rápida demais?) não foi confirmado. O ângulo de inclinação fixo (60°) pode
deixar a lua mais perto do horizonte do que do zênite dependendo de onde o jogador anda no planeta
(o pouso é só um ponto fixo; o resto da superfície esférica vê a lua em ângulos diferentes) — efeito
esperado e correto (mesmo como a Lua de verdade varia de altura no céu conforme a posição de quem
observa), não um bug, mas não confirmado visualmente como "legível" em nenhuma posição específica.
