# Contexto — Laboratório 34 — Torre do Tesouro + moedas escondidas

Preenchido em: 2026-08-17

## O que foi feito

1. **Torre do Tesouro** (`src/world3d/World3D.tsx`, bloco `TOWER_*` logo depois da lojinha) —
   prédio novo e independente (não ligado a nenhuma missão/escola): `TOWER_ANCHOR_UP` achado por
   busca de distância angular (script Node fora do app) contra todos os marcos do mapa — ~42,5°
   de folga do vizinho mais próximo. Posicionado com `schoolGroundRadial` (o mesmo raycast físico
   filtrado do lab-33/31, já em escopo de módulo).
2. **Interior navegável de verdade**:
   - Chão do térreo (`towerFloor1`) e paredes (fundo sólido, laterais sólidas, frente partida em
     dois com vão de porta — mesmo padrão de `shopFrontWall${side}` da lojinha).
   - Rampa (`towerRamp`) — um bloco inclinado, física igual qualquer outra plataforma estática
     (`PhysicsAggregate`, `BOX`, `mass: 0`). Sobe do térreo até a borda do mezanino.
   - Mezanino (`towerFloor2`) — laje cobrindo só a parte de trás do prédio; a parte da frente
     fica aberta (dá pra ver o térreo lá embaixo, e é onde a rampa chega).
   - Parapeito, paredes do andar de cima, telhado (mesmo estilo pirâmide de 4 lados já usado em
     escola/lojinha).
   - TUDO com `PhysicsAggregate` estático exceto o telhado (só visual, ninguém anda em cima).
3. **Moedas**: 2 no térreo (lado oposto à rampa), 3 no mezanino, 1 numa plataforma-desafio
   flutuando acima do vão da rampa (pulo pequeno pra alcançar — reaproveita o array `coins`
   global, mesmo mecanismo de coleta/detecção de proximidade já existente).
4. **8 moedas escondidas no pico de cada montanha** — `PLATEAU_CENTERS.forEach`, posição
   `plateau.dir.scale(PLANET_RADIUS + plateau.height + 0.35)`. `plateau.height` é o valor exato
   (não uma aproximação) porque o centro do platô é o único ponto onde o smoothstep de
   `terrainHeight` chega a `t=1` — ali `Math.max(baseNoise, plateau.height)` sempre escolhe
   `plateau.height` (baseNoise nunca passa de ~0,27, bem menor que qualquer altura de platô).

## Bug real encontrado e corrigido nesta sessão

A primeira versão da rampa foi calculada com um percurso (`TOWER_RAMP_RUN = 3,6`) sem checar se
cabia dentro da profundidade do próprio prédio (`TOWER_DEPTH = 3,2`) — resultado: a rampa
atravessava as duas paredes (fundo E frente/porta), com as pontas saindo pra fora do prédio nos
dois lados. Descoberto por um raycast físico direcionado ao centro visual da rampa: o raio
acertava `towerFloor2` (o mezanino) em vez de `towerRamp` — a rampa estava fisicamente por baixo
do mezanino, não conectada à borda dele como deveria.

**Correção**: em vez de expressões derivadas que escondiam a inconsistência (ex.: `TOWER_DEPTH *
0.55` espalhado em vários lugares), toda a geometria foi recalculada a partir de constantes
nomeadas e explícitas (`TOWER_MEZZ_DEPTH`, `TOWER_MEZZ_FRONT_Z`, `TOWER_RAMP_LOW_Z`,
`TOWER_RAMP_HIGH_Z`) verificadas umas contra as outras antes de aplicar — a profundidade do
prédio subiu pra 4,4 pra dar espaço real pro percurso da rampa (2,5) mais a profundidade do
mezanino (1,6) caberem dentro das paredes sem se sobrepor nem vazar.

## Decisões técnicas tomadas

- **Prédio único (protótipo), não as 21 escolas de uma vez** — decisão explícita do usuário
  (pergunta feita antes de começar). Motivo dele/dela: validar que o padrão funciona bem antes de
  investir em replicar pra 21 prédios — reduz o risco de descobrir um problema de design (como o
  bug da rampa acima) só depois de já ter aplicado em todo lugar.
- **Prédio independente do sistema de escolas/missões** — evita qualquer risco de quebrar
  `SCHOOL_DIRS`/`nearAnySchool`/a lógica de progressão de missões (que várias correções desta
  sessão já dependem, ver lab-28/29/33); reaproveita só o helper de raycast (`schoolGroundRadial`,
  já genérico o bastante nesse ponto do `setup()`) e o padrão de parede-com-porta da lojinha.
- **Moedas escondidas no pico exato do platô, não em qualquer lugar da montanha** — usa
  `plateau.height` diretamente (exato, não aproximado) em vez de precisar de outro raycast —
  mais simples, e o centro do platô é o ponto MENOS provável de sofrer o erro de discretização
  malha-vs-fórmula já documentado (é o ponto mais "achatado"/sem gradiente da montanha, diferente
  de uma borda íngreme onde esse erro é maior).

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, 3 rodadas: torre inicial, correção da
  rampa, moedas escondidas — todas exit code 0).
- **Descoberta do bug da rampa**: raycast físico do centro visual da rampa pra baixo acertou
  `towerFloor2`, não `towerRamp` — prova direta de que a rampa original não conectava com o
  mezanino.
- **Confirmação do fix**: raycast físico varrendo 10 pontos ao longo de todo o percurso da rampa
  (do início logo depois da porta até a borda do mezanino) — todos os 10 pontos acertam
  `towerRamp` (o último ponto, exatamente na borda, acerta `towerParapet`, o esperado). Altura de
  cada ponto crescendo de forma estritamente monotônica (13,236 → 14,541 unidades ao longo da
  rampa, 14,937 no parapeito) — confirma uma rampa contínua e conectada, sem degraus ou saltos.
- Posição do prédio comparada com o relevo real 6 unidades ao lado (fora do próprio prédio, pra
  não acertar a estrutura da torre em vez do planeta): diferença de 0,03 unidade — dentro da
  variação natural do terreno numa distância dessas, não indica erro de posicionamento.
- Todas as 21 malhas de colisão da torre confirmadas com `physicsBody` presente (exceto o
  telhado, sem colisão de propósito). 8/8 moedas de pico e 6/6 moedas da torre confirmadas
  presentes na cena depois do build final.
- **Não testado**: caminhada real (segurar W/seta pra cima) subindo a rampa de fato — a
  verificação foi 100% por raycast/geometria, não por simular o controle do jogador. A física de
  uma rampa estática com uma cápsula tocando nela é comportamento padrão de qualquer motor (o
  mesmo princípio de qualquer plataforma inclinada), mas vale confirmar jogando.

## Pendências / dívidas conhecidas

- Prédio testado só por raycast/geometria, não por movimento real do jogador — recomenda-se
  confirmar jogando antes de considerar o padrão "provado" o bastante pra replicar nas escolas.
- Mini-game com bichos e terceiro parkour (escolhidos pelo usuário na pergunta de escopo) ainda
  não implementados — ver "O que o próximo laboratório deve desenvolver".

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para ESTE laboratório — mini-game com bichos e terceiro parkour já estavam
fora do escopo declarado em `FEATURES.md` desde o início (o usuário escolheu múltiplas opções na
pergunta de "brincadeiras interativas", mas só "colecionáveis escondidos" foi implementado agora
por tempo/escopo desta sessão).

## O que o próximo laboratório deve desenvolver

1. **Mini-game com bichos** (escolhido pelo usuário) — ainda sem forma concreta definida. Ideia
   inicial pra abrir com o usuário: uma interação simples de proximidade (parecido com o canto do
   passarinho/rosnado da onça já existentes) que dá uma recompensa pequena a primeira vez que o
   jogador chega perto de cada TIPO de bicho (uma espécie de "colecionar" os 7 tipos), em vez de
   um sistema de perseguição/minigame mais complexo — mas confirmar com o usuário antes.
2. **Terceiro parkour / mais parkour** (escolhido pelo usuário) — já existem dois (7 e 14
   degraus); um terceiro precisa de uma variação de verdade (não só mais do mesmo) pra valer a
   pena — talvez subindo uma das montanhas novas em espiral, em vez de mais uma sequência reta de
   blocos.
3. **Testar a Torre do Tesouro jogando de verdade** (não só raycast) antes de decidir se replica
   o padrão nas 21 escolas.
4. Se decidir replicar prédios navegáveis pras escolas — considerar um helper compartilhado (a
   torre tem MUITA duplicação de padrão com a lojinha: paredes com vão de porta, telhado
   piramidal) em vez de copiar o bloco inteiro 21 vezes.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
