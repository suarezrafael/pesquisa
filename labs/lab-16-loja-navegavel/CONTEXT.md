# Contexto — Laboratório 16 — Loja navegável (interior)

Preenchido em: 2026-08-17
Commit inicial → final: 0db3d7f..972ad69

## O que foi feito

Pedido original do lab-09 ("uma loja que dá pra entrar"), adiado em 6 labs seguidos.

1. **Prédio da loja** (`World3D.tsx`, `shopBase` + paredes/teto) — diferente das escolas (paredes
   sólidas decorativas, o jogador nunca "entra" de verdade, só dispara a missão por proximidade de
   fora), a parede da frente é partida em dois pedaços com um vão real de 1 unidade no meio — o
   jogador atravessa esse vão pra dentro. Teto reaproveita o mesmo truque de pirâmide de 4 lados já
   usado nas escolas. Local (busca de distância angular contra todos os outros marcos do mapa —
   platôs, lagoa, piscina, escolas, parkour, rio, rua) com ~37° de folga do vizinho mais próximo.
2. **Interior** — balcão perto do fundo (visível assim que o jogador entra pela porta), 2
   prateleiras encostadas nas paredes laterais com itens decorativos coloridos, e um lojista
   (`buildStudentFigure`, mesmo padrão do professor das escolas) parado atrás do balcão.
3. **Gatilho** — chegar perto do balcão dispara `onOpenShopRef.current()` (novo ref, mesmo padrão
   de `onSelectQuestRef`/`onCollectCoinRef` já usados pras escolas/moedas), abrindo o MESMO modal
   2D de lojinha (`AvatarShop.tsx`, lab-08/lab-13) — reaproveita toda a lógica de compra/equipar
   sem duplicar nada. Histerese gatilho/reset (mesmo padrão dos portais) evita reabrir o modal
   repetidamente enquanto o jogador fica parado perto do balcão.

## Decisões técnicas tomadas

- **Posição do balcão calculada via `Vector3.TransformCoordinates(shopCounter.position,
  shopBase.getWorldMatrix())`, não um vetor "pra frente" calculado à parte** — decisão direta do
  aprendizado do lab-15 (o bug do rio/`.normalize()`): confiar na transformação de verdade do
  motor em vez de recalcular a mesma coisa com matemática própria evita divergência entre "onde o
  balcão está desenhado" e "onde o gatilho de proximidade considera que ele está". Esse cuidado
  específico não chegou a virar um bug aqui (foi feito certo desde o início), mas documentando o
  raciocínio porque é o mesmo tipo de risco.
- **Reaproveita o modal 2D existente, não inventa uma UI de compra 3D nova** — o pedido era "dá
  pra entrar" (presença física no mundo), não "trocar como comprar"; a lógica de compra/equipar já
  funciona bem, duplicá-la em 3D seria trabalho considerável sem necessidade.
- **Sem colisor físico nas paredes** — mesmo padrão das escolas; o vão de porta já resolve
  visualmente "entrar de verdade" sem precisar bloquear fisicamente o resto do prédio.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 4 planejadas em `FEATURES.md` foram concluídas e verificadas (incluindo o gatilho
abrindo o modal de verdade, confirmado por captura de tela).

## O que o próximo laboratório deve desenvolver

Com loja navegável concluída, **todos os itens de "trabalho de jogo autocontido" da fila que vinha
sendo carregada desde o lab-09 estão concluídos**: parkour (lab-11), chat seguro (lab-12), bonecos
3D (lab-13), trovão/raio (lab-14), ruas+carros (lab-15), loja navegável (lab-16). O único item
grande que resta é:

1. **Backend/conta** (auth, parental gate, pagamento — ver `labs/lab-12-chat-seguro/CONTEXT.md`) —
   exige decisões de infraestrutura/negócio (qual provedor, o quanto investir agora vs. depois)
   que só o usuário pode tomar; não é algo pra simplesmente escolher e começar como os labs
   anteriores.

Com a fila de features de jogo esgotada, vale a próxima sessão:
- Perguntar ao usuário se quer entrar no backend/conta agora, ou
- Rodar uma nova revisão de `prompt.md` contra o código (mesmo exercício do lab-12) pra ver se
  surgiram gaps novos com todo o conteúdo adicionado desde então, ou
- Perguntar diretamente que tipo de conteúdo/funcionalidade novo o usuário quer pra continuar.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main; comando de merge/PR em
  `labs/lab-14-trovao-raio/CONTEXT.md`).
- Como rodar/verificar: `cd app && npm install && npm run dev`. A loja fica longe do ponto de
  nascimento — no console do navegador (build de DEV), a label "Lojinha" aparece por cima do
  telhado quando o prédio está em vista; `window.__scene.getTransformNodeByName('shopBase')` dá a
  posição exata.
