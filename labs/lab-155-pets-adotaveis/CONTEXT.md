# Contexto — Laboratório 155 — Pets adotáveis

Preenchido em: 2026-09-08
Commit inicial → final: fcfe898a0ba589ef931f1a932fbf54b343945768..HEAD

## O que foi feito

Primeiro item do Grupo A do backlog social (lab-154) — adotar, cuidar, ver crescer, o core loop do
Adopt Me! identificado como maior alavancagem de engajamento na pesquisa de mercado desta sessão.

- **`app/src/data/pets.ts`** (novo): catálogo de 4 pets (Gato Laranja/Preto, Cachorro Marrom/
  Branco), reaproveitando `buildGato`/`buildCachorro` já existentes no arquivo do mundo 3D — zero
  geometria nova.
- **`app/src/types.ts`/`state/storage.ts`**: `Progress` ganhou `unlockedPetIds`/`equippedPetId`
  (mesmo padrão de `unlockedHatIds`/`equippedHatId` — pode possuir vários, só um segue o jogador
  por vez), `petCareCounts` (Record por id de catálogo, não por "pet ativo" — cada pet cresce no
  próprio ritmo mesmo trocando o equipado) e `lastPetFeedAt`.
- **`app/src/state/progression.ts`**: `adoptPet` (reaproveita `unlockGeneric`, mesma função de
  compra do resto do jogo; primeiro pet adotado já sai equipado), `equipPet`, `feedPet` (uma vez
  por dia real, mesma defesa anti-farm de `applyDailyLoginReward` — `dayGap` negativo/não-finito
  também bloqueia), `petStageFor`/`petStageScale` (filhote/jovem/adulto nos limiares 3/7
  alimentações). 17 testes novos em `progression.test.ts`.
- **`app/src/state/useProgress.ts`**: `adoptPet`/`equipPet`/`feedPet` wrappers, mesmo formato de
  `unlockFurniture`/`claimDailyLogin`.
- **`app/src/world3d/PetPanel.tsx`** (novo): reaproveita a mesma grade/CSS de `MyHousePanel.tsx`
  (`.avatar-shop-grid`/`.avatar-shop-item`/etc.) — mostra estágio atual (🍼/🌱/⭐), "✓ Ativo" pro
  equipado, botão "🍖 Alimentar" desabilitado quando já alimentado hoje.
- **`app/src/world3d/HudHeader.tsx`/`App.tsx`**: ícone 🐾 novo no HUD (mesmo padrão de "🎭 Loja") —
  diferente de `MyHousePanel`/`AvatarShop`, que só abrem via gatilho de proximidade no mundo,
  pets precisam ser checados/alimentados com frequência, então um ícone sempre acessível faz mais
  sentido que exigir andar até um balcão todo dia.
- **`app/src/world3d/World3D.tsx`**: pet ativo é construído na cena (`rebuildPet`) e segue o
  jogador com atraso — `petUp` (uma direção a partir do centro do planeta, mesmo sistema de
  navegação usado pelo resto do jogo) persegue o `localUp` real do jogador a cada quadro via
  `Vector3.Lerp` (não recalcula uma posição de rastro explícita — o próprio atraso do lerp já
  produz o efeito de "vindo atrás"). Posição final usa `currentGroundBaseFn`/`currentWorldCenter`
  (os MESMOS usados pro chão do próprio avatar) — funciona em qualquer planeta-destino sem código
  extra por planeta. Escondido (`setEnabled(false)`) dentro de casa/dirigindo carro ou foguete.
  Ponte `__refreshPet` (mesmo padrão de `__refreshHouseFurniture`) reconstrói a malha (espécie/cor/
  escala) quando adotar, trocar de equipado, ou alimentar muda algo relevante.

## Decisões técnicas tomadas

- **Só UM pet segue por vez, mesmo possuindo vários**: mesmo padrão já estabelecido de chapéu/
  óculos (`equippedXxxId`) — evita a complexidade (e a poluição visual) de várias criaturas
  seguindo o jogador ao mesmo tempo, sem fechar a porta pra isso no futuro se for pedido.
- **Crescimento por NÚMERO DE ALIMENTAÇÕES, não por dias corridos**: um jogador que some por uma
  semana não deveria ver o pet "crescer sozinho" sem cuidado nenhum — só a ação de alimentar (com
  o limite de uma vez por dia real) avança o estágio.
- **Ícone no HUD, não gatilho de proximidade**: diferente de Minha Casa/lojinha (que só abrem
  andando até um balcão específico no mundo), um pet precisa ser checado com frequência — exigir
  caminhar até um ponto fixo todo dia seria fricção desnecessária pra uma ação de rotina.
- **`petUp` perseguindo `localUp` via lerp, sem posição de rastro explícita**: mais simples que
  calcular um ponto "atrás" do jogador (evita duplicar a lógica de orientação/gravidade radial já
  usada por todo o resto do jogo) e já produz naturalmente o efeito de atraso visual esperado.
- **Escondido dentro de casa**: o interior é uma sala PLANA (sem conceito de `up` esférico — mesma
  razão documentada pra chuva/gravidade nesse ambiente); reaproveitar a lógica esférica ali
  quebraria, e construir uma versão própria pro interior é escopo maior, não pedido agora.

## Achados reais do review automático do Copilot (PR #26)

- **Corrida de estado real em `useProgress.feedPet`**: diferente do resto do arquivo (chamados só
  uma vez por evento — `claimDailyLogin` no mount, `unlockMarsReward`/`foundTreasureChest` por
  gatilho de mundo), `feedPet` é chamado por um BOTÃO clicável repetidas vezes — ler `progress` do
  closure do componente (em vez de `setProgress` com atualização funcional) arriscava duas
  chamadas rápidas (antes do React re-renderizar com `lastPetFeedAt` novo, o que desabilita o
  botão) computarem a partir do MESMO estado desatualizado. Corrigido usando `setProgress((prev) =>
  ...)`, sempre aplicado sobre o estado mais recente da fila, com `result` capturado de dentro do
  updater pra continuar devolvendo o valor de forma síncrona pro chamador. **Verificado ao vivo**:
  3 cliques sintéticos disparados no MESMO tick (`btn.click()` três vezes seguidas, mais agressivo
  que qualquer duplo-clique humano) resultaram em `careCount: 1`, não 3.
- **Alocação por quadro em `World3D.tsx`**: `Vector3.Lerp(...)` cria um `Vector3` novo a cada
  quadro enquanto o pet está visível (60x/s) — trocado por `Vector3.LerpToRef` (escreve direto em
  `petUp`, sem alocar) + `petUp.normalize()` (já muta o próprio vetor). `petUp` virou `const` (nunca
  mais reatribuído, só mutado in-place).

## Pendências / dívidas conhecidas

- Nenhum aviso/toast quando o pet muda de estágio — o jogador só vê a mudança reabrindo o
  `PetPanel` (a tag de estágio já reflete o valor atual). Se o usuário quiser um aviso mais
  chamativo, é uma adição pequena (`feedPet` já devolve `newStage` quando muda).
- Pet não aparece dentro de casa nem em veículos (ver "Decisões técnicas").
- Não testado em outro planeta-destino (Marte etc.) além do principal — a lógica reaproveita
  `currentGroundBaseFn`/`currentWorldCenter`, que já generalizam pra qualquer planeta, mas não foi
  verificado ao vivo lá (roteiro de viagem de foguete é historicamente um dos mais trabalhosos de
  testar nesta sessão de automação).

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Restam do Grupo A do backlog social (lab-154): séries (Bronze/Prata/Ouro/Diamante) e ranking local
entre perfis do mesmo aparelho. O Grupo B (amigos, busca por nick, status online, convites)
continua bloqueado nas 3 perguntas de arquitetura/segurança registradas em
`labs/lab-154-.../FEATURES.md`.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc -b` (app): sem erros. `npm run test` (app): 124/124 (17 novos).
- Verificado ao vivo (dev server local + navegador, Chrome desktop): adotar desconta moeda
  corretamente e mostra "✓ Ativo"; alimentar mostra "🍖 Já alimentado hoje" (desabilitado) até o
  dia seguinte (confirmado forçando `petCareCounts` via `localStorage` + reload); posição/escala
  do pet lidas DIRETO do motor (`scene.transformNodes`) — pet fica a ~0,58 unidade do avatar
  (seguindo, não colado nele), escala confirmada mudando de 0,55 (filhote) pra 0,8 (jovem) no
  limiar exato de 3 alimentações. Sem erro de console em nenhum passo.
- Como verificar de novo: `cd app && npm run dev`, clicar no ícone 🐾 do HUD, adotar um pet,
  alimentar, e observar o bichinho seguindo o personagem pelo mundo (fora de casa).
