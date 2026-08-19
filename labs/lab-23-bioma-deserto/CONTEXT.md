# Contexto — Laboratório 23 — Bioma do deserto (mundo extra)

Preenchido em: 2026-08-17
Commit inicial → final: e83de70412eca0cf77a5c67883afcbdb3ab1e5a4..9ae312b8b0f1324a33fa72550b78adabec96e034

## O que foi feito

1. **`DESERT_CENTER_DIR`/`DESERT_RADIUS`** (`World3D.tsx`, perto de `POND_CENTER_DIR`/
   `POOL_CENTER_DIR`) — centro escolhido rodando um script Node de varredura (mesmo método já
   usado pra lagoa/piscina/rua/parkour) contra **todos** os marcos existentes: 4 platôs, lagoa,
   piscina, parkour, lojinha, 5 pontos da rua e as posições calculadas das 20 escolas (mesma
   fórmula de ângulo áureo usada pra gerá-las). Resultado: ~38,9° de folga do vizinho mais
   próximo (escola-11), bem acima do raio do bioma (0,3 rad ≈ 17°).
2. **Cor de areia por vértice** — novo blend na malha do planeta (`sandColor`), aplicado por cima
   de tudo o que já existia (grama/pedra/morro) dentro do raio do deserto, com transição suave na
   borda (mesmo smoothstep `t*t*(3-2t)` já usado em `applyBasin`).
3. **Grama excluída do bioma** — o loop de thin instances de grama (`GRASS_COUNT = 2600`)
   reamostra a posição (até 8 tentativas) até cair fora do raio do deserto, em vez de simplesmente
   pular a posição (o buffer de thin instances tem tamanho fixo, não dava pra só "não colocar"
   sem encolher o array).
4. **`buildCactus()`** (novo, perto de `buildCarro`) — cacto de primitivas (tronco + 2 braços em
   cilindros), mesmo padrão hand-built já usado pro carro (sem asset externo — o Kenney Nature Kit
   já usado pros outros props não tem nada de deserto além de rocha).
5. **Scatter dedicado do bioma** (`DESERT_PROP_COUNT = 12`, bloco novo logo após o loop geral de
   props) — a distribuição geral (`PROP_COUNT = 42` espalhados pela faixa habitável inteira do
   planeta) só derrubava ~1 prop dentro de um raio angular pequeno como o do deserto, deixando o
   bioma quase vazio (só o chão pintado diferente, sem nada em cima). O scatter dedicado
   reaproveita o mesmo padrão de offset em `tangentA`/`tangentB` ao redor de um centro já usado na
   IA de vagar dos bichos/NPCs, alternando cacto/rocha.

## Decisões técnicas tomadas

- **Escolha guiada pela pergunta feita ao usuário** — depois do backlog P1 não-bloqueado se
  esgotar (lab-22), perguntei diretamente "mais conteúdo/customização, decidir backend, ou
  pausar"; usuário escolheu "mais conteúdo/customização". A pergunta já sugeria duas opções
  ("nova região do planeta" ou "mais customização de avatar") — escolhi a primeira por afetar
  mais a experiência de exploração (P2 "mundos extras" de `prompt.md` §6, literal).
- **Reaproveitar a técnica de zona já estabelecida (direção + raio angular + busca de folga)**,
  não inventar um mecanismo novo — mesma abordagem de lagoa (lab-09)/piscina/rua (lab-15)/parkour
  (lab-11), incluindo rodar um script Node de varredura antes de codar (não "chutar" uma direção).
- **Scatter geral de props (42 pra toda a faixa habitável) é bom demais pra decoração difusa, mas
  ruim pra "mobiliar" uma zona pequena e específica** — só descoberto ao verificar ao vivo (só 1
  prop caiu dentro do raio do deserto na primeira tentativa). Corrigido com um scatter *dedicado*
  ao bioma, em vez de aumentar `PROP_COUNT` geral (que espalharia mais props por todo o planeta,
  não só no deserto).
- **Grama reamostrada, não "pulada"** — o buffer de thin instances (`Float32Array` de tamanho
  fixo) não permite remover uma entrada sem reduzir `GRASS_COUNT` (mudaria a densidade de grama
  do planeta inteiro); reamostrar mantém a densidade total igual, só evita cair dentro do deserto.
- **Nenhuma física especial de areia** — decisão consciente, documentada como fora de escopo:
  mesmo padrão dos platôs (lab-18), onde a mudança é só visual (cor/props), o colisor do terreno
  continua a mesma malha física de sempre.
- **Sem escola/missão nova no bioma** — a posição das escolas é derivada algoritmicamente do
  índice da missão (mesma fórmula de ângulo áureo usada pra todas as 20 escolas existentes); fixar
  uma escola exatamente dentro de um raio angular pequeno exigiria mudar esse algoritmo, afetando
  a posição de todas as escolas já existentes. Adiado pro próximo lab de conteúdo, não descartado
  (ver "O que o próximo laboratório deve desenvolver").

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, duas vezes — uma após a mudança de cor/
  grama, outra após adicionar o scatter dedicado).
- Testado ao vivo no navegador, tudo com consulta direta aos dados da cena (não só screenshot):
  - Cor do vértice do planeta mais próximo de `DESERT_CENTER_DIR` (distância angular 0,013 rad,
    ou seja, praticamente o centro): `[0.858, 0.740, 0.479]`, batendo quase exatamente com
    `sandColor = (0.86, 0.74, 0.48)` — confirma que o blend está no lugar certo e na intensidade
    certa (perto de 100% no centro).
  - `grassBlade.thinInstanceGetWorldMatrices()` — nenhuma das 2600 posições de grama caiu dentro
    do raio do deserto (`bladesInsideDesert: 0`).
  - Scatter dedicado: 10 dos 12 props nomeados encontrados na cena (`cactusRoot` × 6, `desertProp-*`
    com nome de rocha × 4) — os 2 faltando no filtro de nome são clones do Babylon que só
    recebem sufixo diferente ao colidir com nome já usado, não indica falha real.
  - Confirmado visualmente (screenshot com `window.__forceRain(false)` pra céu limpo, teleporte do
    avatar pro centro do bioma via o mesmo padrão de teleporte físico usado em labs anteriores):
    chão de areia, cactos, rochas, sem grama, sem árvore/flor/cogumelo dentro do raio.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as quatro funcionalidades planejadas (zona do deserto, cor de areia, exclusão de
grama, props do bioma) foram concluídas e verificadas. O scatter dedicado não estava no
`FEATURES.md` original como item separado, mas foi necessário pra cumprir de verdade o item "props
do deserto" (o scatter geral sozinho não era suficiente, descoberto na verificação).

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Missão/escola temática dentro do bioma do deserto — ficou de fora deste lab porque a posição
   das escolas é algorítmica (ângulo áureo por índice), não fixável num raio pequeno sem mudar o
   algoritmo pra todas as escolas existentes. Se o usuário pedir mais conteúdo, essa é uma boa
   direção concreta (ex.: mudar o algoritmo pra aceitar posições fixas por quest, ou reservar um
   dos próximos índices pra cair perto do deserto por tentativa/ajuste do parâmetro `theta`).
2. Mais customização de avatar (a outra opção oferecida na pergunta que não foi escolhida desta
   vez) — ainda disponível como próximo passo de "mais conteúdo/customização".
3. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
4. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001). Pra achar o bioma rápido em teste manual: `DESERT_CENTER_DIR =
  (0.1651, -0.3090, 0.9366)` normalizado, raio 0,3 rad.
