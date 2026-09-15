# Laboratório 187 — Objetos do mundo alinhados ao relevo

Status: em andamento
Início: 2026-09-15
Fim: -
Commit inicial: 43cc4520ed3e244d19b79aad0853b4a12090f20c

## Objetivo do laboratório

Auditar os objetos estáticos principais do planeta principal (casa, loja, escolas, rua, piscina,
props/landmarks) contra o relevo real (não só a fórmula analítica de altura) e corrigir qualquer
caso concreto de objeto enterrado/flutuando encontrado — sem redesenhar assets nem trocar o sistema
de terreno.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 202 - Objetos do mundo alinhados ao
relevo" (renumerado pra lab-187 na sequência real do repo, mesma convenção de labs anteriores) —
primeiro item da recomendação priorizada do documento depois do lab-186, prioridade P0. Ver seção
completa do backlog (grep por "Lab 202") pro texto original do problema/critérios de aceite.

## Investigação prévia (leitura do código, antes de codar)

O backlog descreve "vários objetos... parcialmente enterrados ou atravessando o planeta, como
piscina, casas, trechos de estrada e outros elementos" e pede um "helper padronizado de
posicionamento/orientação pela normal radial e altura real do terreno". Lendo `World3D.tsx` antes
de assumir que isso ainda está tudo quebrado:

- **Casa (`houseBase`, ~linha 8080-8093), loja (`shopBase`, ~linha 9066-9068) e escolinhas
  (`buildPlanetEscolinha`, mas só no planeta PRINCIPAL — as versões em Mercúrio/Vênus/Júpiter/
  Saturno/Urano/Netuno usam um raio fixo por planeta, sem variação de relevo, porque esses 6
  planetas-destino são esferas uniformes sem `terrainHeight` própria, nada a alinhar ali) JÁ usam
  posicionamento real: `dir.scale(terrainGroundRadial(dir, terrainHeight(dir)))` — a mesma
  combinação de duas funções (`terrainHeight` = fórmula analítica; `terrainGroundRadial` = raycast
  físico real contra a malha renderizada, ~linha 4328) repetida em CADA um dos 4 call sites (casa,
  loja, escolinha, scatter de props ~linha 4885), sem um helper nomeado único — exatamente a
  duplicação que o backlog pede pra padronizar, mesmo já não havendo bug funcional na maioria dos
  casos.
- **Casa e escolinha têm, além disso, uma busca por terreno mais plano** (`findFlatterUpReal`,
  já existente desde os labs 95/134, motivada por relatos reais de usuário — "TODAS AS CASA ESTÃO
  DENTRO DA TERRA" e "acho que a causa é a casa estar enterrada na terra") — evita cair perto da
  borda de um platô (`PLATEAU_CENTERS`) onde a variância de relevo é grande demais pra fundação
  absorver. A casa ainda carrega um diagnóstico de debug morto (`buriedHouseReport`, ~linha 8121,
  comentário própio já diz "REMOVER depois de confirmar a causa raiz real") — dívida de limpeza,
  não bug funcional.
- **Rua (`streetCenter`, ~linha 5786-5827)** usa só `terrainHeight` (fórmula analítica, SEM
  raycast) mais uma margem fixa de `+0.2`, calibrada empiricamente (lab-28) pro pior caso medido
  NAQUELE momento (~0,11 de erro da malha de 48 segmentos perto de theta≈0°/phi=25°). É o único
  dos 4 "prédios"/landmarks que não usa `terrainGroundRadial` — se o relevo mudou desde o lab-28
  (montanhas do lab-177, plateaus, ajustes de altura), essa margem fixa pode não cobrir mais o
  pior caso em TODA a volta de 360° do laço.
- **Piscina**: a bacia rebaixada (`applyBasin`) é rebaixo DELIBERADO de terreno, não um bug de
  ancoragem de objeto — mas a borda/margem de terra ao redor (lab-28, "a piscina não parece um
  buraco") nunca foi reverificada visualmente depois das mudanças de relevo de labs posteriores
  (177/184).
- **Props (árvores/rochas/flores, ~linha 4880-4919)** já usam `terrainGroundRadial` com
  assentamento multi-vértice pra objetos compactos — parece coberto, mas há MUITOS outros
  landmarks não auditados ainda: parkour, baús de tesouro, segredos visuais, estação UFO, entrada
  de caverna, morro de Marte, cacto do deserto.

**Conclusão da leitura prévia**: parte significativa do que o backlog descreve já foi corrigida em
labs anteriores (95, 134, 59, 28) — não dá pra assumir que tudo ainda está quebrado, mas também não
dá pra assumir que está tudo certo só pela leitura do código (a rua em particular usa uma margem
calibrada num momento anterior do relevo, nunca reverificada). Verificação AO VIVO (Chrome real,
screenshots) da volta completa da rua, piscina, casa e loja é o próximo passo concreto antes de
decidir o que precisa de correção de verdade — mesmo padrão "investigar antes de codar" do lab-186.

## Funcionalidades planejadas

- [x] Verificação ao vivo (Chrome real): script de raycast físico real (mesmo `HavokPlugin.raycast`
  usado pelo próprio jogo) contra os 96 pontos do laço inteiro da rua — gap sempre positivo (mín.
  0.089, máx. 0.213), zero pontos enterrados; diagnóstico já embutido no HUD de debug (`CASA:1.10`,
  `ENTERRADAS:q01(0.90)...q30(0.72)`) confirmou casa e as 30 escolas do planeta principal também
  sempre com folga positiva. Nenhum objeto crítico está enterrado/flutuando hoje — o relato do
  backlog, historicamente real (labs 28/59/95/134), não reproduz no relevo atual.
- [x] Auditar landmarks ainda não verificados contra relevo real: **parkour** — os 4 percursos
  (`PARKOUR_ANCHOR_UP`/`PARKOUR2_ANCHOR_UP`/`PARKOUR3_ANCHOR_UP`/`PARKOUR4_ANCHOR_UP`,
  `World3D.tsx:5341,5395,5457,5518`) usam só `PLANET_RADIUS + terrainHeight(...)` na âncora — SEM
  raycast — mas cada plataforma sobe em passos fixos a partir dela (mínimo +0.5 já na primeira),
  bem acima de qualquer erro típico de fórmula-vs-malha medido nesta investigação (rua: até 0,11);
  auditado e deixado como está de propósito (sem risco real), **não convertido** pro helper (só os
  itens abaixo foram). **Convertidos pro helper**: torre/desafio em dupla/carteira/ponte/posto de
  combustível/placa/gato empoleirado/foguete/espada/arma a laser (todos já usavam
  `terrainGroundRadial`+`terrainHeight` no ponto de partida, agora via `groundSurfacePosition`).
  Baús de tesouro/segredos
  visuais/estação UFO/entrada de caverna/morro de Marte ficaram fora (são de planetas-destino
  secundários, "fora de escopo" abaixo). Lagoa não pôde ser verificada ao vivo nesta sessão (não
  chegou a ser renderizada com o dispositivo detectado como fraco no ambiente de automação — mesma
  classe de limitação de ferramental já conhecida de outros labs) — código usa o mesmo padrão
  fórmula+margem da rua (`terrainHeight(pondUp) + 0.3`), que a verificação da rua já validou como
  seguro.
- [x] Consolidado o padrão repetido `dir.scale(terrainGroundRadial(dir, terrainHeight(dir)) [+
  offset])` — achado real: eram **19 call sites** (contagem verificada com
  `grep -n "groundSurfacePosition(" World3D.tsx`, descontando a própria definição), não os 4
  estimados na investigação prévia: casa, loja, escolinha (×30, um único call site dentro do laço),
  props ×2 (scatter geral + deserto), rochas de montanha, torre, **torre de quiz**
  (`quizTowerBase`/`QT_ANCHOR_UP`, achado de contagem do review — tinha ficado fora desta lista por
  engano, embora já convertida no código desde a extração original), piscina, foguete ×2 (corpo +
  colisor), espada, arma a laser, carteira, desafio em dupla, ponte, posto de combustível, placa,
  gato empoleirado. Extraído
  `groundSurfacePosition(dir, extraOffset?)` logo depois de `terrainGroundRadial` (mesmo escopo de
  closure, já que depende de `havokPlugin`). Comportamento idêntico verificado ao vivo antes/depois
  (mesmo `CASA:1.10`, mesmo gap mín./máx. da rua). Casos de LEITURA de valor bruto (diagnósticos
  `buriedHouseReport`/`buriedSchoolReport`, `terrainVarianceNearbyReal`, cálculo por quadro do pet)
  ficaram de propósito FORA do helper — precisam do radial escalar puro, não de um `Vector3`.
- [x] Nenhum objeto mal posicionado encontrado pra corrigir de verdade (ver achado acima) — a
  correção real acabou sendo a padronização do helper, não reposicionamento.
- [x] `buriedHouseReport` **mantido**, não removido — investigação achou que seu comentário "REMOVER
  depois de confirmar causa raiz real" está desatualizado: o diagnóstico é renderizado no HUD de
  debug até hoje, deliberadamente (lab-67, contador sempre visível mesmo em produção), lado a lado
  com `buriedSchoolReport` — não um dado morto esquecido. Comentário corrigido pra refletir isso.
- [x] Física/trigger de interação inalterados (a correção é só a extração de uma função com o MESMO
  cálculo — nenhum objeto mudou de posição).

## Review automático do Copilot (PR #67)

- **Rodada 1** (2026-09-15; a review em si precisou de 2 tentativas — a 1ª retornou "Copilot
  encountered an error and was unable to review this pull request", sem achados; a 2ª, pedida de
  novo, é a que segue): "Approval recommended" com 2 achados "suppressed" (não bloqueantes, mas
  avaliados na mesma por serem reais). (1) O comentário atualizado de `buriedHouseReport`
  (dizendo que o diagnóstico é mantido de propósito, não um dado morto) deixou o comentário GÊMEO
  de `buriedSchoolReport` (~linha 7675, ainda rotulado "diagnóstico TEMPORÁRIO... REMOVER depois de
  confirmar a causa raiz real") contradizendo a mesma explicação — os dois são renderizados juntos
  na MESMA linha do HUD de debug, então uma nota de manutenção só corrigida de um lado é
  inconsistente. Corrigido reescrevendo o comentário de `buriedSchoolReport` no mesmo tom
  (permanente, motivo lab-67, referência cruzada ao irmão). (2) A frase do `FEATURES.md` sobre
  landmarks auditados agrupava "parkour" na mesma oração que "já usavam `terrainGroundRadial`+
  `terrainHeight`... agora via `groundSurfacePosition`" — mas os 4 percursos de parkour usam só
  `PLANET_RADIUS + terrainHeight(...)` na âncora (SEM raycast) e não foram convertidos pro helper
  (com razão: cada plataforma já sobe bem acima da âncora em passos fixos, sem risco real) —
  a frase dava a entender, por engano, que parkour tinha sido convertido também. Corrigido
  separando claramente "parkour: auditado, não convertido, sem risco" de "os demais: convertidos".
  **Achado adicional, não do review**: o comentário original do `groundSurfacePosition` (extraído
  antes deste ciclo de review) ainda dizia "6 lugares", desatualizado depois da consolidação final
  de 15 call sites — corrigido junto (achado próprio, não do Copilot, encontrado ao revisar o
  entorno do achado #1). `npx tsc -b`, `npm run test` (208/208) e `npm run build` limpos após as
  mudanças.
- **Rodada 2** (2026-09-15): 1 achado real. A contagem "15 call sites" (escrita na rodada 1, ela
  mesma uma correção do "6 lugares" original) ainda estava errada — contagem real, verificada com
  `grep -n "groundSurfacePosition(" World3D.tsx` descontando a definição: **19 call sites**. A lista
  enumerada também esquecia a torre de quiz (`quizTowerBase`/`QT_ANCHOR_UP`) — já convertida no
  código desde a extração original, só nunca listada. Corrigido o comentário em `World3D.tsx`
  (19 lugares, lista completa) e o `FEATURES.md` (mesma correção + nota explicando a contagem
  verificada por `grep`, pra não repetir o mesmo erro de contar "de cabeça" uma terceira vez).
  `npx tsc -b`, `npm run test` (208/208) e `npm run build` limpos após a mudança.
- **Rodada 3** (2026-09-15; precisou de 2 tentativas — a 1ª retornou erro de ferramenta do
  Copilot, sem achados; a 2ª é a que segue): "Approval recommended" com 1 achado real. A descrição
  da PR no GitHub (texto separado do `FEATURES.md`, nunca atualizado nas rodadas 1-2) ainda dizia
  "15 call sites" com a lista antiga — desatualizada em relação ao código e ao `FEATURES.md`, já
  corrigidos. Corrigida a descrição da PR pra "19 call sites" com a lista completa (incluindo torre
  de quiz) e uma nota explícita mencionando as duas contagens erradas anteriores (6 e 15), pra
  deixar claro que o número final foi verificado por `grep`, não estimado. Nenhuma mudança de
  código nesta rodada — só a descrição da PR (GitHub) e este registro.
- **Rodada 4** (2026-09-15): "Approval recommended", 1 achado "suppressed" (0 comentários novos
  gerados) — avaliado e **descartado como falso positivo** depois de checar o código de verdade.
  O comentário afirmava que a descrição da Lagoa no `FEATURES.md` (linha 89, `pondUp`/
  `terrainHeight(pondUp) + 0.3`) estava errada porque "`poolCenterPos` usa
  `groundSurfacePosition(poolUp, 0.25)`" — mas **lagoa (`pond`/`pondUp`) e piscina
  (`pool`/`poolUp`) são dois recursos DIFERENTES no código**, cada um com seu próprio cálculo de
  posição. Confirmado direto no código (`grep -n "pondCenterPos\s*=" World3D.tsx`):
  `pondCenterPos = pondUp.scale(PLANET_RADIUS + terrainHeight(pondUp) + 0.3)` continua exatamente
  como descrito — a lagoa não foi convertida pro helper (nunca foi, de propósito, e o `FEATURES.md`
  não afirma o contrário). A piscina (`poolCenterPos`), sim, usa `groundSurfacePosition(poolUp,
  0.25)` — mas isso é outro objeto, num outro trecho do `FEATURES.md`. Nenhuma mudança feita; o
  texto já estava correto pro objeto que de fato descreve.
- **Rodada 5** (2026-09-15) — **convergência**: "Approval recommended", 0 comentários novos
  gerados, nenhum achado (nem suppressed). Rodada de confirmação depois da rodada 4 (que só teve um
  falso positivo, sem mudança de código) — encerra o ciclo de review deste PR.

## Fora de escopo (explicitamente adiado)

- Redesenhar qualquer asset visual (só posicionamento/orientação).
- Trocar o sistema de terreno (`terrainHeight`/malha do planeta) — só consumir o que já existe de
  forma mais consistente.
- Adicionar novos biomas ou landmarks novos.
- Planetas-destino secundários (Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno) — são esferas
  uniformes sem `terrainHeight` própria, nada a alinhar ali (ver investigação prévia acima); só o
  planeta principal está em escopo.
- Verificação em viewport mobile/touch — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão.
