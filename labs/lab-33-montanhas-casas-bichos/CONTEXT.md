# Contexto — Laboratório 33 — Montanhas, casas com colisão, novo parkour, bichos novos

Preenchido em: 2026-08-17

## O que foi feito

1. **Montanhas maiores/mais no mapa** (`PLATEAU_CENTERS`, `src/world3d/World3D.tsx`) — as 4
   originais tiveram `radius`/`height` aumentados (radius +30-35%, height +30-35%); 4 novas
   entradas foram acrescentadas. Posições escolhidas por um script de busca (Node, fora do app)
   que testa distância angular contra todos os marcos existentes (lagoa, piscina, deserto,
   parkour, lojinha, e as próprias montanhas entre si) — as 4 novas ficam com pelo menos ~14,9°
   de folga de qualquer marco que não seja outra montanha (overlaps entre montanhas foram aceitos
   de propósito, ver "Decisões técnicas").
2. **`schoolGroundRadial()`** (novo helper, local ao bloco de construção das escolas) — mesmo
   padrão do `realGroundRadial` do lab-31 (raycast físico real contra a malha do planeta, com
   retry filtrando qualquer acerto que não seja `transformNode.name === 'planet'`, já que o
   avatar existe na cena antes das escolas serem construídas). Usado pra posicionar `surfacePos`
   de cada escola em vez de só `PLANET_RADIUS + terrainHeight(dir)`.
3. **Colisão física nas escolas** — `new PhysicsAggregate(walls, PhysicsShapeType.BOX, { mass: 0,
   friction: 0.7 }, scene)` em cada `walls-${quest.id}`. Mesmo padrão das plataformas de parkour.
4. **Segundo desafio de parkour** (`PARKOUR2_*`) — mesma técnica do primeiro (referencial
   tangente local fixo, mesma física de pulo — `PARKOUR_FORWARD_STEP`/`PARKOUR_LATERAL_AMPLITUDE`/
   `PARKOUR_HEIGHT_STEP` reaproveitados, não redeclarados), 14 degraus em vez de 7, material roxo
   (visualmente distinto do marrom do primeiro). Local achado pela mesma busca de distância
   angular usada pras montanhas, agora incluindo TODOS os marcos (montanhas, lagoa, piscina,
   deserto, parkour original, lojinha, e as 21 escolas via a mesma fórmula de ângulo áureo) —
   ~43,9° de folga do vizinho mais próximo. 5 moedas num leque no topo (`rotateAroundAxis` pra
   espalhar em ângulos diferentes ao redor do ponto final), não 1 — desafio maior valendo mais.
5. **Três bichos novos** (`buildCachorro`, `buildOnca`, `buildFalcao`) — mesmo estilo baixo-poli
   dos existentes. `CritterKind` estendido; `CRITTER_COUNT` subiu de 26 pra 39 (5 cachorro, 3
   onça — mais rara, predador grande —, 5 falcão, mantendo os originais). Falcão voa (mesmo
   mecanismo de asa/altura de voo do passarinho); cachorro/onça vagam pelo chão como os outros
   terrestres.
6. **Sons novos** (`src/world3d/ambientAudio.ts`): `playJaguarGrowl` (ruído grave filtrado +
   oscilador com vibrato), `playDogBark` (dois latidos curtos, onda quadrada), `playFalconScreech`
   (glissando agudo em banda estreita), `playFunnyTalk` (sequência de bipes em frequências
   aleatórias, efeito "blablablá"), `playFart` (tom grave caindo + ruído filtrado). Todos
   sintetizados via Web Audio, sem arquivo de áudio baixado (mesmo padrão de todo o áudio do
   projeto). Latido/rosnado/grito disparam por proximidade do jogador, mesmo mecanismo do canto
   do passarinho (timer por bicho, não sincronizado). Conversa/pum disparam raramente (timer de
   20-45s) por QUALQUER bicho perto do jogador, não só os 3 novos tipos.

## Decisões técnicas tomadas

- **Overlaps entre montanhas aceitos, overlaps com outros marcos não** — `terrainHeight` combina
  platôs com `Math.max`, então dois platôs sobrepostos só se fundem numa elevação maior/contínua
  (sem bug, cria uma "cordilheira" — até visualmente interessante). Já um platô sobrepondo a
  lagoa/piscina/lojinha faria essas features nascerem no meio de uma encosta, arriscando o mesmo
  tipo de flutuação que motivou este laboratório inteiro — por isso o script de busca teve que
  encontrar posições sem overlap especificamente contra ESSES marcos, mas overlaps
  montanha-com-montanha foram deixados passar sem problema.
- **Por que reaproveitar a técnica de raycast do rio (lab-31) em vez de só aumentar uma margem
  fixa** — o mesmo raciocínio do lab-31: o erro de discretização malha-vs-fórmula varia bastante
  dependendo de onde no mapa (maior perto de bordas íngremes, como bordas de platô/montanha — e
  agora as montanhas ficaram maiores E mais numerosas, aumentando a chance de uma escola cair
  perto de uma borda). Uma margem fixa grande o bastante pra cobrir o pior caso faria escolas em
  chão plano parecerem flutuando; o raycast sempre acha a altura real, não importa o terreno.
- **Cluster de moedas em vez de "moeda de valor maior"** — `onCollectCoin` (`useProgress.ts`) não
  aceita um valor por chamada, sempre soma uma unidade fixa (`applyCoinCollected`). Mudar isso
  pra aceitar valor variável mudaria uma peça da camada de domínio/progressão só pra um efeito que
  5 moedas ao lado uma da outra já produz sem tocar nessa camada — mais simples e sem risco de
  quebrar o cálculo de progressão em outro lugar que dependa de "1 coleta = +1".

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, 3 rodadas — montanhas/escolas, segundo
  parkour, bichos novos — todas exit code 0).
- Raycast físico real (mesma técnica do lab-31, filtro de colisor) varrendo a posição das 21
  escolas: folga entre -2,8e-7 e +8,96e-7 unidade — efetivamente zero (ruído de ponto flutuante),
  nenhuma escola flutuando ou afundada.
- Checado ao vivo: as 21 malhas `walls-*` têm `physicsBody` não-nulo (colisão real presente em
  todas).
- Confirmado visualmente (teleporte pra perto de uma montanha nova): prédio de escola sentado sem
  gap visível no chão, montanha maior visível nas proximidades.
- Não foi possível testar ao vivo os sons/bichos novos nesta sessão (build validado, lógica
  segue o mesmo padrão comprovado dos sons/bichos já existentes) — recomenda-se o usuário
  confirmar ouvindo/vendo na próxima sessão de jogo.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas — as adiadas (brincadeiras interativas vagas, prédios navegáveis) já
estavam marcadas como fora de escopo em `FEATURES.md`, não fizeram parte do planejado aqui.

## O que o próximo laboratório deve desenvolver

1. Prédios navegáveis (pedido do usuário, lab-32): entrar, subir escada, achar moedas, mais
   desafios dentro. Feature grande — considerar dividir em "estrutura do prédio (interior +
   colisão + escada)" e "o desafio de dentro" como dois laboratórios, ou pelo menos dois blocos
   bem distintos de trabalho dentro de um só.
2. "Mais brincadeiras interativas no mapa" — pedido vago, vale abrir com o usuário exemplos
   concretos antes de implementar (que tipo de brincadeira? Minigame, mais parkour, algo pra
   interagir com os bichos?).
3. Testar ao vivo os bichos/sons novos deste laboratório (não verificado nesta sessão, só a
   lógica/build) — confirmar visualmente e ouvindo antes de considerar 100% fechado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
