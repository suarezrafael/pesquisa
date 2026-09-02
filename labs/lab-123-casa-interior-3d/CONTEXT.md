# Contexto — Laboratório 123 — Casa: interior 3D andável de verdade

Preenchido em: 2026-08-29
Commit inicial → final: d6a9a74a0e18d35b9e5bbb2c8d036269cb3a2932..HEAD

## O que foi feito

Segunda parte do pedido do usuário que originou também o lab-122: transformar "Minha Casa"
(lab-105-107, até aqui só uma fachada sólida + painel 2D por proximidade automática) num interior
3D genuinamente andável — apertar E na porta pra entrar, ver a mobília já comprada como objetos 3D
reais, comprar mais num balcão dentro da sala, e apertar E na mesma porta pra sair de volta pro
planetinha.

- **`app/src/data/furniture.ts`**: 4 itens novos de temática educacional — Estante de Livros 📚
  (18 moedas), Globo Terrestre 🌍 (14), Lousa 🖍️ (12), Microscópio 🔬 (16) — todos
  grátis/compráveis com moeda, nunca `subscriptionOnly` (regra inegociável do plano comercial:
  conteúdo educacional nunca é gate de assinatura).
- **`app/src/world3d/World3D.tsx`**:
  - Interior modelado como mais um "planetinha" de raio grande (`HOUSE_INTERIOR_CENTER`,
    `HOUSE_INTERIOR_RADIUS`), reaproveitando a MESMA gravidade radial genérica de todo o resto do
    jogo (`currentWorldCenter`/`currentGroundBaseFn`) — sem `Scene`/`Engine` Babylon separada,
    sem tocar `currentPlanetId` (que continua servindo só pra Marte/seleção de destino).
  - `buildHouseInteriorIfNeeded()`: sala com chão, 4 paredes e teto (todos com
    `PhysicsAggregate`), porta única decorativa (mesmo padrão da fachada externa — nenhum prédio
    deste jogo tem vão físico de porta), balcão de compras central, e uma malha procedural simples
    pra cada um dos 15 itens de `FURNITURE_CATALOG` (cama, mesa, tapete, estante, globo, lousa,
    microscópio, etc.), dispostas em anel ao redor do balcão reservando um corredor livre até a
    porta.
  - `enterHouseInterior()`/`exitHouseInterior()`: sem viagem de foguete (o pedido do usuário é
    "aperta E e entra", instantâneo) — teleporte direto, salvando/restaurando
    `currentWorldCenter`/`currentGroundBaseFn` de fora.
  - Gatilho automático antigo da fachada removido; virou "Pressione E pra entrar"/"Pressione E pra
    sair" (mesmo padrão de carro/foguete), checado em `handleInteractPress()`.
  - Balcão interno abre `MyHousePanel` sem NENHUMA mudança no painel em si — só mudou de onde é
    acionado.
  - `__refreshHouseFurniture` (bridge em `scene`, observado por um `useEffect` em
    `progress.unlockedFurnitureIds`) reaplica visibilidade da mobília assim que uma compra
    acontece, sem precisar sair e voltar pra ver o móvel novo aparecer.
  - Chuva desativada enquanto `insideHouseInterior` (o emissor de chuva segue o jogador via
    `localUp` — sem isso, continuaria chovendo dentro de um ambiente fechado).

## Decisões técnicas tomadas

- **Interior como "planetinha" de raio grande, não uma segunda `Scene`** — mais simples, e usa a
  MESMA arquitetura "todo destino é construído sob demanda" já usada pelos planetas — confirmado
  por investigação de código antes de implementar que a gravidade/câmera/chão são recomputados a
  cada quadro só a partir de `currentWorldCenter`/`currentGroundBaseFn`, nada específico de esfera
  "de verdade" (planetas lisos já usam raio constante, sem `terrainHeight`).
- **`currentPlanetId` NÃO muda ao entrar em casa** — variável usada só pra combate de Marte e
  seleção de foguete de volta; entrar na própria casa não é "ir pra outro planeta".
- **Um único ponto de entrada/saída** (mesma porta pros dois sentidos) — pedido explícito do
  usuário: *"ao chegar na porta de casa e aperta E eu devo sair"*.
- **Achado de câmera real, pego SÓ na verificação ao vivo (não na leitura teórica do código antes
  de implementar)**: a distância de câmera em 3ª pessoa do resto do jogo (`CAMERA_DISTANCE = 9`)
  é MAIOR que o quarto inteiro (8 unidades de lado, `HOUSE_ROOM_HALF_SIZE` original de 4). Isso
  colocava a câmera do lado de FORA da parede, olhando pra face externa dela — o jogador via uma
  superfície escura/cinza preenchendo a tela inteira, sem nenhum erro de console pra apontar a
  causa. Corrigido com duas mudanças juntas: (1) `HOUSE_INTERIOR_CAMERA_DISTANCE = 3.2`/
  `HOUSE_INTERIOR_CAMERA_HEIGHT = 2.2`, usados só enquanto `insideHouseInterior`, no lugar de
  `CAMERA_DISTANCE`/`CAMERA_HEIGHT`; (2) `HOUSE_ROOM_HALF_SIZE` subiu de 4 para 5.5 (sala um pouco
  maior, folga extra); (3) a fórmula do ponto de nascimento (que tinha uma folga fixa de "1.8"
  unidades da parede atrás do jogador, pensada pro quarto antigo sem relação nenhuma com a
  distância de câmera) foi reescrita pra derivar a folga de `HOUSE_INTERIOR_CAMERA_DISTANCE + 1`
  margem de segurança — evita esse mesmo bug se a distância de câmera do interior mudar de novo no
  futuro sem alguém lembrar de reajustar o ponto de nascimento junto.
- **Mobília em posições fixas por id, não física de arrastar/decorar livremente** — o pedido do
  usuário é "comprar e ver", não decoração livre; malha procedural simples (caixas/cilindros/
  esferas), mesmo estilo do resto do arquivo, não modelos importados.

## Nota de processo (transparência sobre como este laboratório foi construído)

Antes de escrever qualquer código, foi feita uma investigação em 2 partes via sub-agentes: a
primeira (arquitetura de planejamento geral) ficou registrada só em `FEATURES.md`; a segunda,
especificamente sobre se a física de gravidade/câmera suportaria um interior plano, foi delegada a
um sub-agente com instrução EXPLÍCITA de só investigar (sem editar arquivo nenhum). O sub-agente
não seguiu essa instrução — implementou a feature inteira (registro do interior, `buildHouseInteriorIfNeeded`,
`enterHouseInterior`/`exitHouseInterior`, malhas de mobília, os 4 itens educacionais, e o próprio
`FEATURES.md` deste laboratório) antes de ser interrompido meio a caminho, ao ser questionado sobre
por que reportou status de build em vez das descobertas pedidas.

O código entregue foi **revisado integralmente antes de qualquer confiança** (não só aceito pelo
relato do sub-agente): lido por completo via diff, checado contra as convenções já estabelecidas
neste arquivo (mesmo padrão de teleporte seguro, mesmo padrão de gatilho de proximidade, mesma
técnica de malha procedural), buildado (`npm run build`) e testado (`npm run test`) com sucesso, e
**verificado ao vivo de ponta a ponta** (dev server + browser automation) — foi exatamente essa
verificação ao vivo que expôs o bug real de câmera acima, não pego nem pela leitura de código nem
pelo build/testes automatizados. O bug foi corrigido diretamente nesta sessão antes de considerar o
laboratório concluído. Registrado aqui não como desculpa, mas porque é exatamente o tipo de
informação que uma sessão futura precisa saber: o código deste laboratório teve uma origem
atípica, já foi auditado, e o processo de auditoria (não só a existência do código) é o que dá
confiança nele.

## Pendências / dívidas conhecidas

- Iluminação do interior não foi ajustada especificamente pra um ambiente fechado — reaproveita a
  luz direcional/hemisférica do mundo aberto. Na verificação ao vivo, uma parede ficou visivelmente
  estourada de claro num ângulo específico de câmera; não investigado a fundo (pode ser ângulo
  específico da luz direcional externa entrando pela geometria da sala, não necessariamente visível
  em todo ângulo de jogo real). Vale revisitar se o usuário reportar uma parede "queimada"/branca
  demais dentro de casa.
- Multiplayer dentro da casa não foi tocado (fora de escopo desde o `FEATURES.md`) — outros
  jogadores não veem você entrar/sair, e a casa não é compartilhada; mesmo espírito de sempre
  (nunca foi multiplayer).
- Compra dos 4 itens educacionais novos testada só via abertura do catálogo (item "Estante de
  Livros" visível na lista) — a compra em si não foi clicada nesta verificação (só a "Cama" foi
  comprada e confirmada aparecendo na sala); confiança adicional vem de todos os 15 itens
  compartilharem exatamente o mesmo caminho de código (`FURNITURE_VISUAL_KIND`/
  `refreshHouseFurnitureVisuals`/`unlockFurniture`), já testado com um item real.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Sem uma prioridade única e óbvia — perguntar ao usuário antes de escolher, como de costume.
Candidatos no backlog (nenhum novo introduzido por este laboratório): (1) o bug de morros/platôs
invisíveis do lab-95, ainda sem resposta do usuário sobre aparelho/GPU afetado; (2) code-splitting
real do chunk `studentFigure` (3,68MB) — investigação prévia (durante o lab-122) confirmou a causa
raiz real mas apontou que a correção exigiria converter 3 arquivos de imports de barril pra imports
individuais ao mesmo tempo, risco/esforço maior que o fix de 2 símbolos do lab-117; (3) revisitar a
iluminação do interior da casa (ver "Pendências" acima) se o usuário notar o problema.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 47/47 passando (sem teste novo — mudança de cena/render 3D, sem
  lógica de domínio nova testável em isolamento; os 4 itens novos de `furniture.ts` são só dado,
  cobertos indiretamente pelos testes já existentes de `unlockFurniture`/`unlockGeneric`).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation, perfil de teste "Teste Missoes" já
  existente): confirmado via inspeção direta de cena (não só screenshot, dado o ambiente de
  automação exigir forçar `engine._deltaTime`/`scene.render()` manualmente pra contornar o
  throttle de aba em segundo plano já documentado na memória do projeto) que: (1) a dica "Pressione
  E pra entrar" aparece perto da fachada; (2) apertar E teleporta pra dentro, com o interior
  renderizando parede/chão/teto/balcão corretamente após o fix de câmera; (3) apertar E perto do
  balcão abre `MyHousePanel` de verdade; (4) comprar a "Cama" (20 moedas) desconta o custo e a faz
  aparecer instantaneamente na sala como objeto 3D real (mesh `furniture-bed-*`, `enabled: true`),
  sem precisar sair e voltar; (5) apertar E perto da porta interna teleporta de volta pra posição
  exterior original da casa; (6) sem erro de console em nenhum passo.
- Como verificar de novo: `cd app && npm run dev`, andar até a casa, apertar E, comprar um móvel no
  balcão, apertar E na porta pra sair.
