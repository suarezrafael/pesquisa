# Laboratório 197 — Centro de jogos educativo com saguão e portais

Status: em andamento
Início: 2026-09-18
Fim: -
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

- [ ] Achar um local livre no planeta principal pro prédio (fachada/porta visível de fora),
  verificado ao vivo sem sobreposição com o hub do lab-196 nem outras estruturas (mesmo método de
  distância angular + zoom de tela já usado no lab-196).
- [ ] Interagir com a porta (E/toque) teleporta a criança pro saguão — sala isolada nova (NÃO a
  `HOUSE_INTERIOR_CENTER` da casa pessoal; um centro/raio próprios), mesmo padrão de
  `enterHouseInterior` (posição direta, chão plano, troca de câmera pro modo interior).
- [ ] 4 placas dentro do saguão (`Contar`, `Soletrar`, `Memória`, `Lógica`), cada uma com nome
  curto, ícone/cor por categoria, e estado visual bloqueado/desbloqueado via `applyPortalVisual`.
  `Lógica` desbloqueada (liga ao quiz da ponte, `selectEnvironmentalChallengeQuest('logica', ...)`);
  as outras 3 bloqueadas com dica "Em breve".
- [ ] Interagir com uma placa desbloqueada abre o mini-jogo correspondente (reaproveitando
  `QuestModal`/`onOpenEnvironmentalChallengeRef` pra Lógica); interagir com uma bloqueada só mostra
  a dica, sem abrir nada.
- [ ] Saída clara do saguão de volta ao planeta (porta/placa de saída, `teleportAvatarTo` de volta
  ao centro/`up` salvos de fora) — sem reload de página.
- [ ] Eventos novos: `game_center_entered`, `game_portal_selected` (`meta: { portalId }`),
  `game_center_returned` — adicionados à allowlist do Worker + `productAnalytics.ts`, seguindo
  exatamente o padrão de validação por-tipo já usado pro hub do lab-196 (`isValidMinigameId`) desde
  o primeiro commit (não como correção de review depois). `minigame_started` (já existe) é
  reaproveitado quando o portal Lógica abre o quiz. `time_to_first_minigame` citado pelo backlog
  investigado durante a implementação — se for um evento de verdade (padrão a confirmar contra
  `time_to_first_learning_challenge`, já visto em `weeklyFunnel`) ou uma métrica derivada
  calculável sem evento novo.
- [ ] Verificar ao vivo: prédio visível e sem sobreposição; entrar/sair do saguão sem travar
  câmera/física; as 4 placas mostram o estado certo; portal Lógica abre o quiz de verdade; portais
  bloqueados mostram a dica sem abrir nada; toque equivalente ao teclado (tentar simulação real de
  toque desta vez, não só ler o código — pendência disclosed em todos os labs anteriores desta
  sessão).

## Fora de escopo (explicitamente adiado)

- Editor de fases, UGC, multiplayer competitivo, assinatura ou moedas pagas (excluídos
  explicitamente pelo próprio item do backlog).
- Os mini-jogos de Contar/Soletrar/Memória em si e o template de arena reutilizável — labs 213-216.
- Progressão/álbum/recompensas do centro de jogos — Lab 217.
- Redesenhar o hub de pedestais do lab-196 ou fundir os dois num só — ficam como duas entradas
  distintas pro mesmo conjunto de mini-jogos (hub = atalho rápido ao ar livre; saguão = "casa" do
  centro de jogos, mais alinhado à fantasia de arcade do backlog). Se isso se provar redundante na
  prática, decisão de unificar fica pra um lab futuro.
