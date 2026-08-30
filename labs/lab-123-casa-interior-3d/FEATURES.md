# Laboratório 123 — Casa: interior 3D andável de verdade

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: d6a9a74a0e18d35b9e5bbb2c8d036269cb3a2932

## Objetivo do laboratório

Segunda parte do mesmo pedido do usuário que originou o lab-122: *"a casa não consigo entrar, ele
deve ser uma mapa interno a parte do mundo virtual, ou seja ao checar perto tenho aperta E e entrar
na casa e entrar pra uma nova cena 3d da casa onde deve ser possivel comprar os moveis deve ter um
cataloogo de itens pra casa, mas mais itens relacionados a educacao tbm. au chegar na porta de casa
e aperta E eu devo sair e voltar pro planetinha. na porta de saida."*

## Investigado antes de planejar

- **Estado atual confirmado por leitura de código**: `Minha Casa` (lab-105-107) é só uma fachada
  SÓLIDA (`World3D.tsx` ~5832-5899, `houseWalls` com `PhysicsAggregate` de caixa cobrindo o volume
  inteiro, porta é uma malha decorativa sem vão nenhum) + gatilho de proximidade AUTOMÁTICO (sem
  apertar E, só chegar perto — `HOUSE_TRIGGER_DISTANCE = 1.2`, ~linha 7716) que abre
  `MyHousePanel.tsx`, um painel 2D de compra (11 itens em `data/furniture.ts`, só "possuído ou
  não", sem posição/objeto 3D). Confirmado (via `docs/prompts` e o próprio `CONTEXT.md` do
  lab-105): **nenhum prédio deste jogo tem interior andável** — todo prédio interage por gatilho
  de proximidade abrindo um painel 2D. Este laboratório quebra esse padrão deliberadamente, só
  pra casa, a pedido explícito do usuário.
- **Arquitetura de gravidade/física já é radial, recomputada a cada quadro** (`World3D.tsx`
  ~7205-7213): `localUp = normalize(avatarMesh.position - currentWorldCenter)`, e a gravidade
  (`body.applyForce(localUp.scale(-GRAVITY), pos)`), o "chão" (`currentGroundBaseFn(localUp)`), a
  orientação do boneco e da câmera (`camera.upVector = Lerp(camera.upVector, localUp, 0.15)`) TUDO
  deriva só dessas duas variáveis (`currentWorldCenter`, `currentGroundBaseFn`) — nenhuma delas é
  específica de esfera "de verdade": os planetas lisos (Mercúrio/Vênus/Júpiter/...) já usam
  `currentGroundBaseFn = () => planet.radius`, uma função CONSTANTE (não uma superfície ondulada
  como o planeta principal). Confirmado em `landRocket` (~2450-2455): trocar de local é só
  reatribuir essas 2 variáveis + `currentPlanetId` + chamar `teleportAvatarTo(center, landingUp,
  groundFn)` (função já pronta, ~linha 2288, independente do sistema de foguete).
- **Consequência prática**: um interior "plano" pode ser modelado como mais um "planetinha" de
  raio bem grande (curvatura imperceptível numa sala de poucos metros) — reaproveitando o MESMO
  mecanismo de gravidade/câmera sem nenhuma mudança na física ou câmera em si. Não precisa de
  `terrainHeight` (isso só existe pro relevo ondulado do planeta principal) — os planetas lisos já
  provam que `currentGroundBaseFn` constante funciona perfeitamente.
- **`currentPlanetId` NÃO precisa mudar pra entrar na casa** — é uma variável separada de
  `currentWorldCenter`/`currentGroundBaseFn`, usada só pra decidir coisas como combate de Marte e
  qual foguete de volta existe. Entrar na própria casa não muda "em que planeta você está" (é um
  espaço pessoal DENTRO do mesmo planetinha) — só uma nova flag booleana `insideHouseInterior`
  controla o que muda (chuva, gatilhos antigos desativados, etc.), sem arriscar quebrar nenhuma
  lógica já existente que lê `currentPlanetId`.
- **Padrão "Pressione E" já existe e é reaproveitável tal e qual**: `handleInteractPress()`
  (~linha 2625, a função central chamada tanto pelo teclado quanto pelo botão de toque) e um
  `TextBlock` de dica linkado à malha da porta com `alpha` alternando 0/1 por distância a cada
  quadro (mesmo padrão de `carHint`/`rocketHint`, ~linhas 4188-4196, 8296-8323) — usado por
  carro/foguete. O pedido do usuário ("aperta E") bate exatamente com esse padrão, diferente do
  gatilho automático que a casa usa hoje — este laboratório MUDA a casa de "automático" pra
  "apertar E", trazendo-a pro mesmo padrão de carro/foguete.
- **`FURNITURE_CATALOG`** (`data/furniture.ts`) já tem 11 itens (5 grátis/compráveis + 6
  exclusivos de assinante em 2 sets temáticos) — nenhuma posição 3D, só booleano "tem ou não" em
  `Progress.unlockedFurnitureIds`. Precisa de um mapeamento fixo id→posição dentro da nova sala.

## Decisões técnicas tomadas

- **Interior modelado como "planetinha" de raio grande, não uma `Scene`/`Engine` nova** — muito
  mais simples e consistente com a arquitetura existente (mesma cena Babylon, mesmo padrão "todo
  destino é construído sob demanda" já usado pelos planetas) do que gerenciar duas `Scene`s
  separadas (custo, sincronização de recursos, sem precedente neste projeto).
- **Sem viagem de foguete pra entrar/sair da casa** — o pedido do usuário é "aperta E e entra",
  instantâneo, diferente da viagem de foguete entre planetas (que É deliberadamente uma animação
  de vários segundos). `enterHouseInterior()`/`exitHouseInterior()` chamam `teleportAvatarTo`
  DIRETO, sem passar pelo sistema de foguete (`boardRocket`/`landRocket`/`drivingRocket`) — reaproveita
  só a função de teleporte, não a máquina de estado do voo.
- **Um único ponto de entrada/saída** (não uma porta de entrada + outra de saída em lugares
  diferentes) — pedido do usuário: *"ao chegar na porta de casa e aperta E eu devo sair"*, ou seja,
  a MESMA porta serve pros dois sentidos. O jogador nasce alguns metros PRA DENTRO da sala (longe o
  bastante da porta pra não disparar a saída no instante da chegada — mesmo espírito de
  `RESET_DISTANCE`/histerese já usado em todo gatilho deste arquivo), e andar de volta até a porta +
  apertar E de novo sai.
- **Chuva desativada dentro de casa** (`insideHouseInterior` desliga `rainSystem.emitRate`) — sem
  isso, o sistema de chuva dinâmica (que segue o jogador via `localUp`) continuaria caindo dentro
  de um ambiente fechado, quebrando a imersão. Reativada (deixada pro estado normal do sistema de
  chuva) ao sair.
- **Gatilho automático antigo da fachada REMOVIDO** (o bloco em ~7712-7720 que abria
  `MyHousePanel` sozinho por proximidade) — substituído por: dica "Pressione E pra entrar" +
  checagem em `handleInteractPress()`. `MyHousePanel` continua existindo tal e qual, só passa a
  ser aberto de um gatilho de proximidade NOVO, colocado dentro da sala (um "balcão" decorativo),
  no lugar do gatilho antigo na fachada.
- **Mobília: posições FIXAS por id num layout da sala** (não física de arrastar/posicionar
  livremente — fora de escopo, o pedido do usuário é "comprar e ver", não "decorar livremente").
  Cada item de `FURNITURE_CATALOG` ganha uma malha procedural simples (mesmo estilo de caixas/
  cilindros/esferas já usado em todo o resto do arquivo) construída SEMPRE (a sala tem o layout
  completo), mas só fica `setEnabled(true)` se `progress.unlockedFurnitureIds.includes(id)` —
  mesmo espírito de "construir sempre, mostrar condicionalmente" já usado nos loops de props dos
  planetas.
- **Novos itens de temática educacional** adicionados a `FURNITURE_CATALOG` (pedido explícito do
  usuário: "mais itens relacionados a educação também") — grátis/compráveis com moeda, nunca
  exclusivos de assinante (mesma regra inegociável do plano comercial: conteúdo educacional nunca
  é gate de assinatura — `docs/plano-comercial-backend.md`): Estante de Livros 📚, Globo Terrestre
  🌍, Lousa 🖍️, Microscópio 🔬.
- **`MyHousePanel` sem mudança de props/lógica** — só o gatilho que o abre muda de lugar
  (fachada → balcão interno). Continua sendo o único jeito de comprar mobília (nenhuma UI de
  "comprar tocando no objeto 3D" — fora de escopo, adicionaria um segundo caminho de compra
  redundante com o painel já existente e testado).

## Funcionalidades planejadas

- [x] `World3D.tsx`: novo registro do interior da casa (centro/raio/up de "aterrissagem" fixos,
      distante de qualquer outro planeta/prop) + `buildHouseInteriorIfNeeded()` (sala com chão,
      4 paredes, teto, porta única decorativa, balcão de compras) construída sob demanda no
      primeiro `enterHouseInterior()`.
- [x] `World3D.tsx`: `enterHouseInterior()`/`exitHouseInterior()` — salvam/restauram
      `currentWorldCenter`/`currentGroundBaseFn`, teleportam via `teleportAvatarTo`, ligam/desligam
      `insideHouseInterior` (desativa chuva enquanto dentro).
- [x] `World3D.tsx`: remover o gatilho automático antigo da fachada; adicionar dica "Pressione E
      pra entrar"/"Pressione E pra sair" (mesmo padrão de carro/foguete) + checagem em
      `handleInteractPress()` pras duas direções.
- [x] `World3D.tsx`: balcão de compras dentro da sala — gatilho de proximidade (mesmo padrão da
      carteira de estudos) abre `MyHousePanel` (sem mudança no painel em si).
- [x] `World3D.tsx`: malha procedural simples pra cada um dos itens de `FURNITURE_CATALOG`,
      posicionada num layout fixo da sala, visível só se `unlockedFurnitureIds` incluir o id.
- [x] `data/furniture.ts`: 4 itens novos de temática educacional (grátis/compráveis com moeda,
      nunca exclusivos de assinante).
- [x] Verificação: `npm run build` sem erros; verificação ao vivo (dev server + browser
      automation) — entrar na casa apertando E, ver ao menos um móvel já possuído renderizado
      dentro, abrir o catálogo pelo balcão interno, comprar um item novo e confirmar que aparece
      na sala, sair apertando E na porta e confirmar volta pro planetinha; sem erro de console.
      **Achado real de câmera pego nesta verificação, corrigido antes de concluir**: ver
      `CONTEXT.md`, seção "Decisões técnicas tomadas" — a distância de câmera padrão (9 unidades)
      era maior que o quarto inteiro (8 unidades), fazendo a câmera ficar do lado de FORA da
      parede. Corrigido com distância/altura de câmera menores específicas do interior + reajuste
      da folga do ponto de nascimento.

## Fora de escopo (explicitamente adiado)

- Posicionamento livre de mobília pelo jogador (arrastar/girar) — o pedido é "comprar e ver", não
  decoração livre.
- Segunda `Scene`/`Engine` Babylon separada — decisão técnica acima explica por que o modelo de
  "planetinha de raio grande" é suficiente e mais simples.
- Multiplayer dentro da casa (outros jogadores te vendo entrar/sair, ou aparecerem dentro da sua
  casa) — a casa é um espaço pessoal, mesmo espírito de sempre neste projeto (nunca foi
  multiplayer); nenhuma mudança no relay/sincronização de posição planejada aqui.
- Animações/efeitos especiais na mobília (ex. borboletas animadas voando de verdade) — malhas
  estáticas nesta rodada, animação fica como possível polimento futuro se o usuário pedir.
