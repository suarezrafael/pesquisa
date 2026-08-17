# Contexto — Laboratório 15 — Ruas e carros

Preenchido em: 2026-08-17
Commit inicial → final: 2967042..ea4c19c

## O que foi feito

1. **Rua** (`World3D.tsx`) — faixa de asfalto (`street`, `MeshBuilder.CreateRibbon`) acompanhando a
   curvatura do planeta, mesma técnica do rio (lab-05/07): pontos ao longo de um arco phi/theta,
   escalados por `PLANET_RADIUS + terrainHeight(dir) + offset`, com margens esquerda/direita
   deslocadas lateralmente por um vetor tangente. Linha central tracejada (`streetDash-N`, um
   segmento de cada dois) em amarelo, levemente acima do asfalto pra não brigar com ele
   (z-fighting). Local (theta 280°-320°, mesma faixa de phi das escolas) escolhido por busca de
   distância angular contra todos os outros marcos do mapa (platôs, lagoa, piscina, escolas,
   percurso de parkour, o próprio rio) — ~13.5° de folga do vizinho mais próximo, mesmo método
   usado pra achar o lugar da piscina/parkour em labs anteriores.
2. **Carros** (`buildCarro`, 5 instâncias) — carrinho de brinquedo só de primitivas (corpo, cabine
   com "vidro" translúcido, 4 rodas), cores variadas. Andam pra frente e pra trás ao longo da rua
   (`streetCenter`, ping-pong: inverte direção ao chegar em qualquer ponta), cada um com posição
   inicial e velocidade próprias pra não andarem em fileira sincronizada. Orientação segue a
   direção real de movimento (mesmo padrão `Matrix.FromXYZAxesToRef` já usado em bichos/NPCs).

## Bug real encontrado e corrigido durante o teste (afeta também o rio, feature pré-existente
## desde o lab-05/07 — não fazia parte do escopo planejado deste lab, mas foi corrigido na mesma
## sessão por estar diretamente ligado ao código copiado pra rua)

Testando a rua nova, o carro/a rua apareciam encolhidos perto da origem do planeta em vez de na
superfície. Causa: em Babylon.js, `Vector3.normalize()` **muta o vetor no lugar** (ao contrário de
`.scale()`/`.add()`/`.subtract()`, que retornam um vetor novo). Em 4 pontos do código — o laço que
calcula as margens do rio (copiado quase literalmente pro laço da rua), o laço da linha tracejada
da rua, e o laço de posição dos carros — o padrão era `const up = p.normalize()` onde `p` é a
mesma referência guardada num array (`riverCenter[i]`/`streetCenter[i]`) reaproveitada logo depois
em `p.add(...)`/`p.subtract(...)`. Isso encolhia esses pontos pra comprimento 1 (perto da origem do
planeta) como efeito colateral silencioso — **o rio estava quebrado (renderizando minúsculo, perto
da origem) desde que esse trecho foi escrito**, nunca notado porque aparentemente nunca foi
conferido de perto visualmente depois da primeira vez que "funcionou" (a olho, de longe, um blob
pequeno perto do centro do planeta pode não ter chamado atenção entre tantos outros elementos da
cena). Corrigido com `.clone()` antes de `.normalize()` nos 4 lugares.

## Decisões técnicas tomadas

- **Carros sem colisão física** (decorativos) — mesmo padrão já usado pros pedestres/gente da
  piscina/pássaros; adicionar colisão de veículo (atropelamento, bloquear o jogador) é um escopo
  bem maior (detecção de impacto, o que acontece quando colide) que não foi pedido explicitamente.
- **Uma rua só, não uma malha viária** — "ruas+carros" no pedido original (lab-09) foi tratado como
  singular; múltiplas ruas/cruzamentos ficam pra uma iteração futura se o usuário pedir.
- **`.clone()` sempre que um vetor guardado num array precisa virar uma direção normalizada
  temporária** — a lição geral daqui pra frente: qualquer `const up = algumaCoisaGuardada.
  normalize()` é suspeito se `algumaCoisaGuardada` for reaproveitada depois no mesmo escopo.

## Pendências / dívidas conhecidas

- Nenhuma nova relacionada à rua/carros em si.
- Vale uma varredura futura (não feita nesta sessão, fora do escopo imediato) por outros usos de
  `.normalize()` no projeto fora de `World3D.tsx` (ex.: se algum dia esse padrão for reaproveitado
  em outro arquivo) — dentro de `World3D.tsx` já foi conferido: os demais usos de `.normalize()`
  operam em vetores recém-criados (retorno de `.subtract()`/`.add()`/`Vector3.Cross()`/`Vector3.
  Lerp()`, nunca aliasados a um array reaproveitado), então são seguros.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 3 planejadas em `FEATURES.md` foram concluídas e verificadas, mais o bugfix do rio
(fora do escopo formal, mas corrigido na mesma sessão por estar diretamente ligado ao código
copiado pra rua nova).

## O que o próximo laboratório deve desenvolver

Com ruas+carros concluído, restam os outros 2 itens grandes identificados no lab-14:
1. Loja navegável (interior).
2. Itens de backend/conta (auth, parental gate, pagamento — ver
   `labs/lab-12-chat-seguro/CONTEXT.md`).

Confirmar com o usuário qual prioridade antes do próximo laboratório (mesmo padrão usado pra
escolher ruas+carros nesta sessão).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge nesta sessão, mas esta sessão não pode mesclar em main; comando de merge/PR
  na conversa e em `labs/lab-14-trovao-raio/CONTEXT.md`).
- Como rodar/verificar: `cd app && npm install && npm run dev`. No console do navegador (build de
  DEV): `window.__streetCenter` lista os pontos da rua, `window.__carros` lista os carrinhos (cada
  um com `.root.position`).
