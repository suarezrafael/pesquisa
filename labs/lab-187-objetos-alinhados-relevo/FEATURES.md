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

- [ ] Verificação ao vivo (Chrome real): voltar de foguete/andando e fotografar casa, loja,
  piscina (borda), e pelo menos 4 pontos distribuídos da volta da rua (não só theta≈0°) — confirmar
  se algum objeto está visivelmente enterrado/flutuando HOJE, não só historicamente.
- [ ] Auditar landmarks ainda não verificados contra relevo real: parkour, baús de tesouro,
  segredos visuais, estação UFO, entrada de caverna, morro de Marte, cacto do deserto.
- [ ] Consolidar o padrão repetido `dir.scale(terrainGroundRadial(dir, terrainHeight(dir)))` (casa/
  loja/escolinha/props) num helper único nomeado — reduz duplicação, facilita auditoria futura
  (referência: `docs/prompts/04-manutencao-clean-code.md`, duplicação/nomeação).
- [ ] Se a verificação ao vivo confirmar um caso real de objeto mal posicionado (rua, piscina, ou
  outro landmark), corrigir com o mesmo padrão de raycast real já usado por casa/loja/escolinha/
  props, documentando o achado concreto (não uma correção especulativa).
- [ ] Remover o diagnóstico de debug morto `buriedHouseReport` (`houseBase`, ~linha 8121) se a
  investigação confirmar que não é mais necessário (comentário do próprio código já indica isso).
- [ ] Confirmar que física/trigger de interação continuam alinhados ao visual em qualquer objeto
  que for reposicionado (critério de aceite do backlog).

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
