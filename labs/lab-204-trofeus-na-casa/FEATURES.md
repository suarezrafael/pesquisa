# Laboratório 204 — Troféus na casa (fecha o Lab 211)

Status: em andamento
Início: 2026-09-19
Commit inicial: 24a52c70feb7f36017de4181390ede4ad36393d9

## Objetivo do laboratório

Fechar a única peça genuinamente aberta do backlog "Lab 211 - Troféus e sala/álbum de mini-jogos":
uma presença visual de troféus dentro da casa pessoal do jogador (`"possivelmente na casa"`),
complementando o álbum de conquistas já existente.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 211 - Troféus e sala/álbum de
mini-jogos" — próximo item depois do lab-203 (Lab 210).

## Investigação prévia

- **Lab 211 já estava ~90% satisfeito antes desta lab**: "troféus por mini-jogo/parkour" (lab-202
  troféus 3D do centro de jogos + lab-203 `BADGE_PARKOUR_MASTER`) e "exibição no álbum/conquistas"
  (`AchievementsPanel`/`ACHIEVEMENT_CATALOG`, lab-93) já existem. O próprio critério de aceite ("casa
  OU álbum mostra conquistas") já era satisfeito só pelo álbum. Decisão confirmada com o usuário via
  `AskUserQuestion`: fazer a peça pequena que falta (troféus na casa) em vez de pular pro Lab 191
  (auditoria de FPS, bloqueado por depender de medição ao vivo indisponível nesta sessão) ou outro
  item da lista.
- **Casa já é uma sala 3D navegável de verdade** (lab-123/134/136): `buildHouseInteriorIfNeeded()`
  constrói piso/paredes/porta/balcão de compras (`houseCounterPos`, gatilho de proximidade abre
  `MyHousePanel`) + mobília comprada num anel de raio 3.0 ao redor do centro
  (`refreshHouseFurnitureVisuals`). Nenhuma peça do balcão/mobília tem colisor físico — são só
  gatilhos de proximidade + malha visual.
- **`onOpenAchievementsRef` já existe e já abre o catálogo de conquistas de qualquer lugar do mundo
  aberto** (carteira de estudos, lab-93) — o MESMO painel (`AchievementsPanel`, que já lista os
  emblemas de missão/dupla/parkour) pode ser reaproveitado 100% de dentro da casa, sem nenhuma
  mudança em `App.tsx`/painel novo.
- **Decisão de escopo**: prateleira/pedestal DECORATIVO (2 taças fixas, sem refletir contagem/tier
  real) — a criança vê o detalhe de verdade ao interagir (abre o catálogo já existente). Evita
  inventar uma segunda superfície de dados sincronizada com `progress.badges` só pra uma peça de
  cenário; o catálogo já é a fonte única de verdade visual de conquistas.

## Funcionalidades planejadas

- [x] Pedestal de troféus fixo dentro da casa (não é mobília comprável, sempre presente, mesmo
  espírito do balcão de compras) — `World3D.tsx`, `buildHouseInteriorIfNeeded()`, canto oposto à
  porta/balcão, fora do anel de mobília comprada (raio 3.0) pra nunca colidir com uma peça
  posicionada ali.
- [x] Interação por proximidade (mesmo padrão do balcão/pedestais do hub) abre o catálogo de
  conquistas já existente (`onOpenAchievementsRef.current()`), reaproveitando 100% do painel/dados
  — nenhuma UI nova, nenhuma mudança em `App.tsx`.
- [x] Bloqueado durante visita à casa de um amigo (`visitingHouseSnapshot`), mesmo raciocínio do
  balcão de compras: mostraria as conquistas do VISITANTE dentro da casa de outra pessoa, confuso e
  sem sentido (o catálogo só sabe mostrar o perfil local).
- [x] Verificar ao vivo (ver limitação conhecida abaixo) e, na falta dela, revisão de código
  cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` sem mudança de contagem
(nenhuma lógica de domínio nova — só construção de cena/gatilho de proximidade, sem função pura
nova pra testar); `npm run build` sem erros.

**Posicionamento verificado por geometria** (não ao vivo): pedestal em
`(S-1.3, ..., -(S-1.3))` — distância da origem ≈5.94, fora do anel de mobília (raio 3.0) e a 1.3
unidades de cada parede (dentro da sala de meia-largura `S=5.5`), longe da porta (parede sul,
`z=+S`) e do ponto de nascimento (alguns metros da parede sul). Sem colisor físico, mesmo padrão do
balcão de compras — o jogador pode andar por cima/perto sem travar.

**Risco remanescente, honesto**: posição/altura exata do pedestal e das taças decorativas não
confirmadas ao vivo (ambiente de automação desta sessão trava em `document.hidden` — 7ª lab seguida
com a mesma limitação). Reduzido por reusar a técnica exata do balcão de compras (já testada ao vivo
em labs anteriores) e por manter distância generosa de qualquer geometria existente.

## Rodada de review — Copilot (PR #87)

1 achado, confirmado contra o código real e corrigido:

1. **Médio — pedestal de troféus fora da validação de posicionamento de mobília**: o posicionamento
   manual de mobília (lab-136, `isCurrentFurniturePositionValid`) só conhecia o balcão de compras
   (`HOUSE_COUNTER_COLLISION`) como obstáculo FIXO — o pedestal novo não estava na lista, então uma
   cama/mesa podia ser confirmada bem em cima dele apesar da posição inicial ter sido escolhida pra
   não colidir com nada. Corrigido adicionando `HOUSE_TROPHY_SHELF_COLLISION` (mesma coordenada
   local do pedestal, `HOUSE_ROOM_HALF_SIZE - 1.3`) à lista de obstáculos — e, na mesma correção,
   `buildHouseInteriorIfNeeded` passou a LER a posição de `HOUSE_TROPHY_SHELF_COLLISION.x`/`.z` em
   vez de recalculá-la separadamente, garantindo que as duas nunca possam divergir.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` continuam limpos depois da
correção.

## Fora de escopo (explicitamente adiado)

- Tornar o pedestal um reflexo dinâmico de tier/contagem real de troféus (decisão deliberada — ver
  "Decisão de escopo" acima).
- `parkour2`/`parkour3` (fora de escopo desde o lab-203, não revisitado aqui).
- Evento `trophy_earned` dedicado citado no backlog — já coberto por `minigame_trophy_earned`
  (lab-202) e `parkour_course_completed.trophyEarned` (lab-203); não duplicado aqui.
