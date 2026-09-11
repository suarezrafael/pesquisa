# Laboratório 175 — casa visitável somente leitura

Status: concluído
Início: 2026-09-10
Fim: 2026-09-10
Commit inicial: 0379c92e6adb685de8c680b6b4e86322c5a6fe0a

## Objetivo do laboratório

`docs/market-metrics-engagement-backlog.md`, "Lab 171 - Casa visitável somente leitura" (P1, fora
da lista top-8 do §10, mas o único item restante do backlog que ainda é código — o resto são
pesquisas com usuário real, fora de escopo de laboratório). Um amigo visita a casa decorada de
outro, só leitura, sem poder alterar nada.

## Decisão de escopo confirmada com o usuário

Perguntado via `AskUserQuestion`: cartão de prévia 2D (mais simples) vs. reentrar na MESMA cena 3D
da casa com a mobília do amigo (mais imersivo, mais trabalho). **Usuário escolheu a cena 3D
completa.**

## Estado atual levantado antes de planejar

- `Progress.housePlacements`/`unlockedFurnitureIds` são 100% locais (nunca sincronizados com o
  backend) — pra um amigo visitar, precisam virar snapshot sincronizado, mesmo padrão de
  `equippedLook`/`badges` do lab-163 (piggyback em `POST /players/heartbeat`).
- A casa em si é UM ÚNICO modelo 3D reaproveitado (`houseInteriorRootNode`), sempre populado a
  partir de `progress` do jogador local. "Visitar" não precisa de uma sala nova — só precisa
  popular a MESMA sala com os dados do amigo, sem nunca escrever em `progress` local.
- `nearestFurniturePiece()`/`showFurnitureReaction()` (lab-170) já operam sobre os NÓS 3D
  renderizados (`houseFurnitureNodes`), não sobre `progress` diretamente — reações genéricas (E
  perto de um móvel) funcionam pra mobília visitada sem nenhuma mudança de código.
- `MyHousePanel` (comprar/mover/excluir) só abre via `E` perto do balcão INTERNO
  (`onOpenMyHouseRef`, `houseCounterPos`) — não existe outro caminho pra abri-lo, então bloquear
  esse único gatilho durante uma visita já garante "visitante não altera nada".

## Funcionalidades planejadas

- [x] Migração `0010`: `player_identities` ganha `house_furniture_ids jsonb`,
      `house_placements jsonb`, `house_visible boolean not null default true`.
- [x] `POST /players/heartbeat` (piggyback, mesmo padrão de `equippedLook`/`badges`) aceita
      `houseFurnitureIds`/`housePlacements`/`houseVisible` opcionais, validados
      (`isValidHouseFurnitureIds`/`isValidHousePlacements` novos em `domain.ts`, testados).
- [x] `GET /players/:id/public-profile` devolve `house: null` se o dono desativou a visibilidade
      OU nunca sincronizou; senão `{ furnitureIds, placements }`.
- [x] `Progress.houseVisible: boolean` novo (padrão `true`) — toggle em `MyHousePanel.tsx`
      ("🔓 Amigos podem visitar minha casa").
- [x] `useHeartbeat.ts` passa a enviar `houseFurnitureIds`/`housePlacements`/`houseVisible` a cada
      tick (mesmo tick que já sincroniza `equippedLook`/`badges`).
- [x] `PlayerPublicProfileView.tsx` ganha botão "🏠 Visitar casa" (só quando `profile.house` não é
      `null`) — fecha o painel de Amigos e sinaliza `World3D.tsx` (mesma ponte de
      `coopAnswerSignalId`/`placingFurnitureRequestId`) pra entrar na casa com a mobília do amigo.
- [x] `World3D.tsx`: `enterHouseInterior` ganha um snapshot opcional de visita; itens
      `subscriptionOnly` nunca aparecem pra visitantes (`visitFurnitureQuantity`, novo em
      `progression.ts`, testado); bloqueia o balcão de compras durante a visita; mensagem de boas-
      vindas ("🏠 Você está na casa de {nome}!") reaproveitando o balão de reação já existente.
- [x] Evento novo `house_visited` (`productAnalytics.ts` + allowlist do backend) — métrica "visitas
      por criança" citada no documento.

## Fora de escopo (explicitamente citado no documento)

- Texto livre, desenho livre, upload, decoração ofensiva criada por usuário.
- Limite de frequência dedicado pra visitas — a chamada já passa pelo mesmo rate limiter de
  `GET /players/:id/public-profile` (`FRIEND_REQUEST_LIMITER`), sem limitador novo.
- Revelar status de assinatura do anfitrião pro visitante (mobília `subscriptionOnly` nunca é
  incluída na visita, mesmo que o dono tenha assinatura ativa).
