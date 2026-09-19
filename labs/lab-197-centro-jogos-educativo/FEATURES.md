# Laboratório 197 — Centro de jogos educativo com saguão e portais

Status: concluído
Início: 2026-09-18
Fim: 2026-09-18
Commit inicial: 25d4c30a1883ca348f1a627d61cc4f35c16acd9c

## Objetivo do laboratório

Criar um prédio/saguão de jogos no planeta principal — um lugar único e reconhecível (não
pedestais soltos ao ar livre, como o hub do lab-196) onde a criança entra, vê 4 placas/portais
(`Contar`, `Soletrar`, `Memória`, `Lógica`), entende pra que tipo de mini-jogo cada um leva, e
consegue voltar ao planeta sem reload. Reaproveita a arquitetura de interior/teleporte da casa do
jogador (`insideHouseInterior`), sem misturar com a casa pessoal.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 212 - Centro de jogos educativo com
saguão e portais" — próximo item da ordem recomendada depois do Lab 209 (hub de mini-jogos,
lab-196, já concluído e mergeado).

## Investigação prévia

Investigação de código (fork) sobre os mecanismos existentes a reaproveitar:

- **Interior da casa (`World3D.tsx`)**: NÃO é uma `Scene`/`Engine` separada — é uma área
  re-skinada do MESMO mundo físico/de renderização, tratada como um "planetinha" à parte.
  Constantes em `~8601-8613`: `HOUSE_INTERIOR_CENTER = (150,0,150)`, `HOUSE_INTERIOR_RADIUS = 10`,
  sala com meia-largura 5.5, altura 3. `enterHouseInterior` (`~9148-9196`) salva o centro/`groundFn`/
  `up` de fora, troca `currentWorldCenter` pro centro do interior, troca `currentGroundBaseFn` por
  um chão PLANO fixo (`() => HOUSE_INTERIOR_RADIUS`), posiciona o avatar direto (sem
  `teleportAvatarTo` — comentário `~9178-9180` explica que a sala é um chão plano de verdade, ao
  contrário da aproximação de superfície esférica que `offsetLandingUp` assume) e liga a flag de
  módulo `insideHouseInterior` (`~3450`). `exitHouseInterior` (`~9198-9239`) reverte via
  `teleportAvatarTo` de volta ao centro/`up` salvos de fora. Câmera muda de verdade dentro do
  interior (`HOUSE_INTERIOR_CAMERA_DISTANCE = 3.2`/`HEIGHT = 2.2` vs. `CAMERA_DISTANCE = 9` fora,
  trocada condicionalmente em `~11341-11342`); iluminação usa a mesma `hemiLight` única, sem rig
  próprio.
- **Nenhum prédio não-residencial usa esse padrão hoje**: "Lojinha" e "Prédio dos Enigmas"/"Torre
  do Tesouro" (`~9571-10073`) são estruturas ESCALÁVEIS AO AR LIVRE (rampas reais na superfície do
  planeta principal, via `groundSurfacePosition`/`alignmentQuaternion`) — a criança sobe rampas no
  mundo aberto, não atravessa um teleporte pra uma sala isolada. Só a casa do jogador (e visitas à
  casa de amigos, que reaproveitam a MESMA sala) usa o padrão de teleporte-pra-bolso-dimensional.
  **Decisão**: o saguão deste lab usa o padrão da CASA (sala isolada/plana), não o padrão da
  Lojinha (escalável ao ar livre) — mais alinhado com "recepção" descrita no backlog e mais barato
  de posicionar 4 placas de forma legível (chão plano, sem lidar com curvatura de esfera).
- **`teleportAvatarTo`**: genérico, já usado tanto pros pedestais de retorno do hub (lab-196,
  `~4210,4222`) quanto pra SAÍDA da casa (`~9234-9238`). ENTRAR na casa não usa essa função (seta
  posição direto, já que o chão do interior é plano/exato) — mesmo padrão a seguir aqui pra entrar
  no saguão; usar `teleportAvatarTo` de verdade só na SAÍDA (volta pro planeta, precisa da
  aproximação de superfície esférica).
- **Quiz de lógica (ponte)**: `selectEnvironmentalChallengeQuest('logica', completedQuestIds)`
  (`state/progression`) chamado perto de `bridgeSurfacePos` (`~4156-4161`), abre o `QuestModal`
  padrão (`App.tsx`) via `onOpenEnvironmentalChallengeRef.current(quest, 'bridge')`. Reaproveitar
  do portal "Lógica" só exige chamar a mesma função com uma nova string de origem (ex.:
  `'game-center-logica'`), sem duplicar lógica de quiz nenhuma.
- **Estado visual bloqueado/desbloqueado**: `applyPortalVisual` (`~9421-9440`) já existe pros
  portais de planeta-destino — tinge o material (`emissiveColor`/`albedoColor`) e ajusta
  `visibility` (0.55 se bloqueado, 1 se desbloqueado/completo) baseado em `isQuestUnlocked`. Padrão
  em 3D real, direto de reaproveitar pras 4 placas — melhor encaixe que o padrão 2D de cadeado
  (`AvatarShop.tsx`, CSS/emoji), que é de overlay DOM, não de objeto no mundo.

**Decisão de escopo pros 4 portais**: só `Lógica` tem um mini-jogo de verdade hoje (o quiz da
ponte, lab-180). `Contar`/`Soletrar`/`Memória` são construídos nos labs 213-216 (template de arena
+ os 3 mini-jogos), ainda não existem. Em vez de fingir conteúdo ou duplicar o hub do lab-196,
os 3 portais sem mini-jogo aparecem com o MESMO padrão visual "bloqueado" de `applyPortalVisual`
(dimmed, sem cor de categoria) e uma dica "Em breve" ao interagir — honesto sobre o que existe,
sem quebrar o critério de aceite "entende pra qual tipo de mini-jogo vai" (a placa já indica a
categoria mesmo bloqueada). Isso mantém a fatia pequena e cumpre o critério de aceite sem esperar
os labs 213-216.

## Funcionalidades planejadas

- [x] Achar um local livre no planeta principal pro prédio (fachada/porta visível de fora),
  verificado ao vivo sem sobreposição com o hub do lab-196 nem outras estruturas (mesmo método de
  distância angular + zoom de tela já usado no lab-196). 3 candidatas rejeitadas ao vivo antes da
  final — ver "Verificação ao vivo" abaixo.
- [x] Interagir com a porta (E/toque) teleporta a criança pro saguão — sala isolada nova (NÃO a
  `HOUSE_INTERIOR_CENTER` da casa pessoal; um centro/raio próprios), mesmo padrão de
  `enterHouseInterior` (posição direta, chão plano, troca de câmera pro modo interior).
  `GAME_CENTER_INTERIOR_CENTER = (-150, 0, -150)` — quadrante diferente do da casa `(150, 0, 150)`.
- [x] 4 placas dentro do saguão (`Contar`, `Soletrar`, `Memória`, `Lógica`), cada uma com nome
  curto, ícone/cor por categoria, e estado visual bloqueado/desbloqueado. `Lógica` desbloqueada
  (liga ao quiz da ponte, `selectEnvironmentalChallengeQuest('logica', ...)`); as outras 3
  bloqueadas com dica "Em breve". Usa uma versão própria e mais simples do sinal visual de
  `applyPortalVisual` (cor apagada + `visibility` reduzida), não a função em si — `applyPortalVisual`
  depende de `isQuestUnlocked`/planetas-destino, forma de dado incompatível com os 4 portais fixos
  daqui; reaproveitado o CONCEITO (apagado = bloqueado), não o código.
- [x] Interagir com uma placa desbloqueada abre o mini-jogo correspondente (reaproveitando
  `QuestModal`/`onOpenEnvironmentalChallengeRef` pra Lógica); interagir com uma bloqueada só mostra
  a dica, sem abrir nada.
- [x] Saída clara do saguão de volta ao planeta (porta/placa de saída, `teleportAvatarTo` de volta
  ao centro/`up` salvos de fora) — sem reload de página.
- [x] Eventos novos: `game_center_entered`, `game_portal_selected` (`meta: { portalId }`),
  `game_center_returned` — adicionados à allowlist do Worker + `productAnalytics.ts` desde o
  primeiro commit (não como correção de review depois, lição do lab-196), com validação de
  `portalId` (`isValidGameCenterPortalId`) e exposição em `weeklyFunnel` já incluídas.
  `minigame_started` (já existe) é reaproveitado quando o portal Lógica abre o quiz (mesmo
  `minigameId: 'ponte-logica'` do hub — é o mesmo mini-jogo por baixo). `time_to_first_minigame`
  confirmado como evento de VERDADE (mesmo padrão de `time_to_first_learning_challenge`, lab-164) —
  implementado como `trackFirstMinigame()`, chamado de dentro de `trackMinigameStarted` (cobre
  qualquer caminho de início de mini-jogo, não só este lab).
- [x] Verificar ao vivo: prédio visível e sem sobreposição; entrar/sair do saguão sem travar
  câmera/física; as 4 placas mostram o estado certo; portal Lógica abre o quiz de verdade; portais
  bloqueados mostram a dica sem abrir nada. Ver "Verificação ao vivo" abaixo.
  **Toque equivalente ao teclado**: NÃO testado com simulação de toque de tela de verdade (mesma
  pendência disclosed em todos os labs anteriores desta sessão) — o botão `E` mobile chama a mesma
  `handleInteractPress`, sem lógica nova.

## Verificação ao vivo

Testado no dev server, Chrome automatizado, usando os helpers de QA já existentes
`window.__debugTeleport`/`__debugTeleportExact` e um `window.fetch` interceptado temporariamente
pra confirmar o corpo exato dos eventos.

**Posição do prédio — 3 candidatas rejeitadas antes da final**:
1. `(0.15, 0.7, -0.7)` — media só ~30° do hub (lab-196), abaixo da folga mínima que o próprio hub
   manteve dos vizinhos dele (~35-64°). Confirmado ao vivo: labels do hub visíveis parado na porta
   do centro de jogos.
2. `(0.75, 0.55, 0.4)` — caiu perto demais de uma formação rochosa de montanha; a câmera de 3ª
   pessoa ficava presa numa visão de cima (topo do rochedo), sem enquadramento normal em nenhum
   ângulo testado.
3. `(0.85, 0.15, 0.5)` — media só ~12,7° de `SHOP_ANCHOR_UP` (Lojinha) — etiquetas "Centro de
   Jogos"/"Lojinha" sobrepostas na mesma tela, telhados quase encostados.
4. **Final**: `(-0.2, 0.3, 0.9)`, ajustada por `findFlatterUpReal` pra `(-0.213, 0.184, 0.959)` —
   mede ~100° do hub (19,3 unidades), ~58° da casa (12,4 unidades), ~80° da Lojinha (16 unidades);
   nenhuma malha de outro landmark dentro de 3 unidades do prédio (só peças do próprio prédio e do
   avatar). Confirmado ao vivo em múltiplos ângulos: prédio, placa "🎮 Centro de Jogos" e área ao
   redor sem sobreposição.

**Achado de ferramental (não é bug do jogo)**: teleportar repetidamente perto do prédio via
`__debugTeleport`/`__debugTeleportExact` em sucessão rápida (sem esperar a física/câmera
assentarem) produzia uma visão aérea/enevoada — câmera presa olhando de cima, cores lavadas.
Investigado a fundo: a posição do avatar em si sempre ficava correta (raio normal, ~13, mesmo valor
de outros landmarks); o problema desaparecia por completo esperando ~2s de tempo real entre um
teleporte e o screenshot seguinte. Consistente com a limitação já documentada em memória desta
sessão (abas controladas por automação sofrem throttle de `requestAnimationFrame`) — câmera usa
suavização por `Vector3.Lerp` a cada quadro, e poucos quadros reais entre ações consecutivas
deixa a interpolação visivelmente "atrasada". Não é um bug de produção (jogadores reais nunca
teleportam repetidamente sem quadros renderizados entre uma ação e outra); mitigado nas
verificações seguintes esperando o tempo real necessário antes de cada captura.

**Fluxo completo verificado, com o `window.fetch` interceptado confirmando cada evento**:
- Entrar pela porta externa → teleportou pro saguão (posição confirmada perto de
  `GAME_CENTER_INTERIOR_CENTER`) → disparou `game_center_entered`.
- As 4 placas apareceram em leque, de frente pra porta — 3 apagadas/cinza (`Contar`/`Soletrar`/
  `Memória`) e 1 colorida/verde (`Lógica`), visualmente distintas.
- Interagir com `Contar` (bloqueada) → mostrou a dica "🔢 Contar: em breve!" sobre a cabeça do
  avatar, sem abrir nada → disparou `game_portal_selected` com `{"portalId":"contar"}`.
- Interagir com `Lógica` (desbloqueada) → abriu o modal real do quiz ("Dobrando Sempre — Complete a
  sequência: 1, 2, 4, 8, ?") → disparou, na ordem, `game_portal_selected` (`portalId: "logica"`),
  `time_to_first_learning_challenge`, `learning_challenge_started` (`kind: "bridge"`),
  `minigame_started` (`minigameId: "ponte-logica"`) e `time_to_first_minigame` — os 5 eventos
  esperados, nenhum a mais nem a menos.
- Fechar o modal (sem responder) e sair pela porta interna → teleportou de volta pra fora, perto do
  prédio (label "🎮 Centro de Jogos" visível de novo) → disparou `game_center_returned`.

Câmera/física estáveis nos 2 teleports reais (entrar/sair) — sem atravessar chão, sem travar.

Checagens automatizadas: `npx tsc -b` limpo; `npm run test` app 213/213 (inalterado); `npm run
build` sem erros; `npm run test` `server-accounts` 160/160 (+3 desde o lab-196: `isValidMinigameId`
já existia, novos testes cobrem `isValidGameCenterPortalId` e a allowlist dos eventos do lab-197).

## Review automático — PR #80, rodada 1

2 achados reais, ambos confirmados contra o código de verdade (não só o texto do review):

1. **`trackGameCenterReturned()` disparava ao sair da CASA, não só do centro de jogos (real,
   corrigido)** — bug de edição: o teleporte de saída de `exitHouseInterior()` é praticamente
   idêntico ao de `exitGameCenterInterior()` (mesma chamada de `teleportAvatarTo` com os mesmos
   argumentos), e a chamada nova acabou anexada ao fim da função ERRADA por engano ao escrever o
   bloco novo. Resultado: sair de casa (qualquer jogador, a qualquer momento) também contava como
   "voltou do centro de jogos", inflando `weeklyFunnel.gameCenterReturned` com falsos positivos.
   Corrigido removendo a chamada de `exitHouseInterior()` — só `exitGameCenterInterior()` (linha
   verificada por `grep`) dispara o evento agora. **Verificado ao vivo**: entrou e saiu da casa
   normalmente (não do centro de jogos) com `window.fetch` interceptado — log de eventos vazio,
   confirmando que o bug não reproduz mais.
2. **`time_to_first_minigame` gravava `meta` inteiro em vez de só `durationMs` (real, corrigido)**
   — o branch de `safeMeta` copiava o objeto `metaObj` inteiro quando `durationMs` era plausível
   (mesmo padrão do `session_end`, um evento LEGADO que tolera isso por compatibilidade), mas
   `time_to_first_minigame` é um evento NOVO deste lab — o mesmo raciocínio já aplicado a
   `game_center_entered`/`game_center_returned`/`game_portal_selected` (eventos novos não herdam a
   tolerância de `meta` livre) deveria valer aqui também, e não valia. Corrigido restringindo
   explicitamente a `{ durationMs: metaObj.durationMs }`.

Checagens depois desta rodada: `npx tsc -b` limpo; `npm run test` app 213/213 e `server-accounts`
160/160 (inalterados — mudança é comportamento/sanitização, não testada por unit test nova); `npm
run build` sem erros. Re-verificado ao vivo (Chrome real): fluxo de entrar/sair da CASA não dispara
mais nenhum evento do centro de jogos.

## Fora de escopo (explicitamente adiado)

- Editor de fases, UGC, multiplayer competitivo, assinatura ou moedas pagas (excluídos
  explicitamente pelo próprio item do backlog).
- Os mini-jogos de Contar/Soletrar/Memória em si e o template de arena reutilizável — labs 213-216.
- Progressão/álbum/recompensas do centro de jogos — Lab 217.
- Redesenhar o hub de pedestais do lab-196 ou fundir os dois num só — ficam como duas entradas
  distintas pro mesmo conjunto de mini-jogos (hub = atalho rápido ao ar livre; saguão = "casa" do
  centro de jogos, mais alinhado à fantasia de arcade do backlog). Se isso se provar redundante na
  prática, decisão de unificar fica pra um lab futuro.
