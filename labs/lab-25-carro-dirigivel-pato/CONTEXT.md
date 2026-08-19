# Contexto — Laboratório 25 — Pato no rio + carro dirigível + rua em loop fechado

Preenchido em: 2026-08-17
Commit inicial → final: 50d8f891a82d60333309669966cee4e3e0254140..5e7f59e5042a3c589d5beadbb63c270e6807d7a4

## O que foi feito

1. **Pato no rio** — `buildPato()` (já existia pra lagoa, lab-09) reaproveitado num novo
   `riverDuck`, nadando ida-e-volta ao longo de `riverCenter` com o mesmo mecanismo de
   `pathIndex` já usado pelos carros. Ping-pong (não laço), porque o rio tem pontas de verdade.

2. **Rua vira laço fechado** — trocado o arco curto original (`theta` 280°-320°, `phi` variando
   junto com a faixa das escolas) por um círculo completo: `STREET_PHI = π*0.1` (18°) constante,
   `theta` de 0° a 360° (`STREET_SEGMENTS = 72`), `MeshBuilder.CreateRibbon` com
   `closePath: true`. Local escolhido calculando o `phi` (latitude, ângulo a partir do polo norte)
   de **todos** os marcos existentes — 4 platôs (52-75°), lagoa (86°), piscina (36°), parkour
   (128°), lojinha (76°), deserto (108°), as 20 escolas (40-112°) — nenhum tem `phi` < 36°, então
   um laço em 18° nunca cruza fisicamente nada, e ainda fica bem perto do spawn (jogador nasce em
   `phi=0`). A lojinha, que dava pra imaginar "perto" da rua antiga, na real já estava a ~68° de
   distância — mover a rua não quebrou nenhuma relação de verdade.

3. **Carros de IA viram voltas contínuas** — antes ricocheteavam nas pontas (ping-pong); um laço
   fechado não tem ponta, então agora só envolvem (`%`) sempre na mesma direção.

4. **`positionOnLoopPath()`** (novo, função de módulo, perto de `rotateAroundAxis`) — extrai a
   matemática de "posição/orientação num ponto fracionário de um trajeto fechado" que os carros
   de IA e o carro do jogador (item 5) precisavam igual, evitando triplicar ~20 linhas de vetor.

5. **Entrar/dirigir/sair do carro** — tecla `e`:
   - Perto de um carro parado (`CAR_ENTER_DISTANCE`) e não dirigindo nenhum: entra. Corpo físico
     do avatar congela (gravidade/velocidade/pulo pulados via um `if (!drivingCar)` cercando só
     essa parte do bloco de física — multiplayer/ranking/checagem de portal continuam rodando
     normalmente todo quadro, dirigindo ou não), figura visual escondida
     (`studentFigure.root.setEnabled(false)`).
   - Dirigindo: setas cima/baixo avançam/recuam o carro pelo `pathIndex` da rua (mesmo mecanismo
     dos carros de IA, agora movido por teclado); câmera passa a seguir o carro (mesmo esquema de
     lerp já usado pra seguir o avatar, só que ancorado na orientação do carro).
   - Apertar `e` de novo: sai, reaparece do lado do carro (não dentro), figura reaparece.
   - Rótulo GUI "Pressione E pra entrar" por carro (mesmo padrão de bolha de fala dos NPCs — um
     `TextBlock` por carro, alpha 0/1, não criado/destruído a cada quadro), visível só quando o
     jogador está perto e não já dirigindo.

## Decisões técnicas tomadas

- **Rua em laço na latitude 18° (perto do spawn), não uma pesquisa de folga pra um laço em
  qualquer lugar** — a alternativa (laço centrado em algum ponto do meio do mapa, tipo os já
  usados pra lagoa/piscina) exigiria garantir que o trajeto INTEIRO (não só o centro) tivesse
  folga de tudo, um problema bem mais difícil de resolver bem com o tempo disponível. Como
  NENHUM marco tem `phi` menor que 36°, uma faixa de latitude perto do polo é uma zona
  inteiramente livre por construção — zero risco de cruzar algo, e ainda convenientemente perto
  de onde o jogador começa a jogar (melhor pra achar o carro logo de cara, também).
- **`if (!drivingCar)` cercando só a física/velocidade/pulo do avatar, não o bloco inteiro
  `if (avatarBody && avatarMesh)`** — esse bloco maior também contém câmera-segue-avatar,
  broadcast de multiplayer, tick de ranking e checagem de proximidade de portais/moedas; gatear
  tudo isso pausaria coisas que não têm nada a ver com estar dirigindo (ex.: ranking parar de
  atualizar). A câmera-segue-avatar continua rodando (harmless — usa a posição congelada do
  avatar), mas é sobrescrita no mesmo quadro pela câmera-segue-carro, que roda depois no código.
- **Bug real encontrado testando, não presumido**: o handler de sair escrevia
  `avatarMesh.position` direto, sem o padrão de teleporte físico seguro
  (`disablePreStep=false` → escreve → `scene.render()` → zera velocidades →
  `disablePreStep=true`) já usado no resto do jogo (`__debugTeleport`, respawn). Sem isso, o
  corpo físico (rodando em `disablePreStep=true`, modo normal do jogo) ignorava completamente a
  escrita e devolvia o avatar pra onde ele estava — descoberto só ao testar de verdade
  (`distanceToCarAfterExit` batendo 6+ unidades em vez do ~1.3 esperado), não intuído do código.
- **`positionOnLoopPath` extraído pra função de módulo** — só quando ficou claro que a MESMA
  matemática (posição/orientação num trajeto fechado por `pathIndex`) seria necessária em dois
  lugares (carros de IA e carro do jogador) com comportamento idêntico, diferente só na fonte do
  `pathIndex` (autônomo vs. teclado) — não extraído preventivamente, só quando a duplicação ficou
  concreta.
- **Sem sincronizar carro dirigido nem colisão carro-carro/carro-jogador** — documentado como
  fora de escopo desde o `FEATURES.md`: mesmo padrão de "cosmético só local" já usado pra
  chapéus (lab-24); os carros de IA nunca tiveram colisão física antes deste lab e continuam sem.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, duas vezes — antes e depois do fix do
  bug de teleporte na saída).
- Testado ao vivo no navegador via `KeyboardEvent` real despachado em `window` (não simulação de
  estado interno) e consulta direta a dados da cena:
  - **Pato**: distância do pato ao vértice mais próximo da malha do rio = 1.21 (meia-largura do
    rio = 1.1) — confirma que está sobre/junto à faixa do rio, não solto em outro lugar.
  - **Rua em laço**: `phi` de 4 pontos amostrados ao longo de `streetCenter` (índices 0/18/36/54)
    = 18.0° em todos, confirmando latitude constante; distância entre o primeiro e o último ponto
    do array = 0.355 (consistente com a discretização de 72 segmentos de um círculo, fechado
    visualmente pelo `closePath: true` do ribbon).
  - **Entrar no carro**: teleportado o avatar (padrão físico seguro) pra perto de um carro,
    despachado `keydown 'e'` real — confirmado `studentFigure.root.isEnabled() === false`.
  - **Congelamento do avatar dirigindo**: posição do avatar idêntica (drift = 0) antes/depois de
    segurar `ArrowUp` por até 1.5s real, em múltiplos testes independentes.
  - **Carro se move dirigindo**: segurando `ArrowUp` (via `window.dispatchEvent` real, com
    `computer wait` real entre os eventos pra garantir quadros de verdade renderizando — testes
    baseados só em `setTimeout` dentro do próprio `javascript_exec` sofreram throttling de aba em
    segundo plano do Chrome, um artefato do ambiente de teste, não do código, diagnosticado
    contando quadros de `onBeforeRenderObservable` direto: 0 quadros em 1s real nesse modo),
    posição do carro mudou ~0.55–1.15 unidades em janelas de 0.7–0.8s, na direção esperada.
  - **Sair do carro**: depois do fix do bug de teleporte, `distanceToCarAfterExit = 1.43` (bate
    com o offset de 1.3 pretendido, considerando a projeção no terreno real) e
    `figureEnabled === true` de novo.

## Pendências / dívidas conhecidas

Nenhuma nova além do que já estava documentado como fora de escopo em `FEATURES.md`
(colisão carro-carro/carro-jogador, sincronizar carro dirigido no multiplayer).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as seis funcionalidades planejadas (pato, rua em laço, carros de IA sem ponta, entrar/
sair, dirigir, verificação) foram concluídas e verificadas, incluindo um bug real encontrado e
corrigido durante a própria verificação (teleporte de saída do carro).

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Se o usuário continuar pedindo mais conteúdo/customização: outras sugestões já levantadas
   (missão temática no bioma do deserto, mais customização de avatar além de chapéus — ver
   `labs/lab-23-bioma-deserto/CONTEXT.md` e `labs/lab-24-chapeus/CONTEXT.md`).
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
3. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001). Pra testar o carro: andar até qualquer um dos 5 carros na rua perto
  do spawn (círculo em `phi≈18°`), apertar `e`, dirigir com as setas, apertar `e` de novo pra
  sair.
