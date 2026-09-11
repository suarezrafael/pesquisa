# Contexto — Laboratório 175 — casa visitável somente leitura

Preenchido em: 2026-09-10
Commit inicial → final: 0379c92e6adb685de8c680b6b4e86322c5a6fe0a..(PR aberto, ver seção final)

## O que foi feito

`docs/market-metrics-engagement-backlog.md`, "Lab 171 - Casa visitável somente leitura" — o único
item do backlog que ainda era código puro (o resto do documento já estava completo ou é pesquisa
com usuário real, fora de escopo). Confirmado com o usuário via `AskUserQuestion`: reentrar na
MESMA cena 3D da casa com a mobília do amigo (opção mais imersiva e mais trabalhosa, em vez de um
cartão de prévia 2D).

### Backend (`app/server-accounts`)

- **Migração `0010`**: `player_identities` ganha `house_furniture_ids jsonb`,
  `house_placements jsonb`, `house_visible boolean not null default true`. Aplicada em produção.
- **`isValidHouseFurnitureIds`/`isValidHousePlacements`** (`domain.ts`, testados) — mesmo padrão de
  `isValidBadgeList`/`isValidEquippedLook` (lab-163): tetos generosos contra payload abusivo,
  formato de chave (`${id}#${índice}`) validado também, não só o valor.
- **`POST /players/heartbeat`**: piggyback dos 3 campos novos, opcionais, `coalesce` preserva o
  valor salvo quando ausentes (mesmo mecanismo de `equippedLook`/`badges`).
- **`GET /players/:id/public-profile`**: novo campo `house` — `null` se `house_visible` for
  `false` OU o dono nunca sincronizou mobília; senão `{ furnitureIds, placements }`.

### Client

- **`Progress.houseVisible`** (padrão `true`) — toggle em `MyHousePanel.tsx` ("🔓 Amigos podem
  visitar sua casa" / "🔒 Casa privada"), função pura `setHouseVisible` (`progression.ts`).
- **`useHeartbeat.ts`** envia `houseFurnitureIds`/`housePlacements`/`houseVisible` (RAW, sem
  transformação) a cada tick, junto com `equippedLook`/`badges` já existentes.
- **`visitFurnitureQuantity`** (`progression.ts`, testada) — mesma regra de `furnitureQuantity`,
  mas item `subscriptionOnly` sempre conta 0 pra visitante (nunca revela status de assinatura do
  anfitrião).
- **`PlayerPublicProfileView.tsx`** ganha botão "🏠 Visitar casa" (só quando `profile.house` não é
  `null`; senão "🏠 Casa não visitável agora.") — chama `onVisitHouse`, que sobe até `App.tsx`.
- **`App.tsx`**: `handleVisitHouse` fecha o painel de Amigos, dispara `trackHouseVisited()` e
  sinaliza `World3D.tsx` via `visitHouseRequest` (mesma ponte de `coopAnswerSignalId`/
  `placingFurnitureRequestId` — `id` novo a cada clique, `crypto.randomUUID()`, garante que
  visitar o MESMO amigo duas vezes seguidas dispare de novo).
- **`World3D.tsx`** (mudança mais extensa):
  - `enterHouseInterior(visitSnapshot?)` — com snapshot, entra na casa de OUTRO jogador; sem,
    entra na própria (comportamento de sempre). Reaproveita a MESMA sala 3D
    (`houseInteriorRootNode`) já existente — nunca cria uma sala nova.
  - `disposeAllHouseFurnitureNodes()` novo — descarta TODAS as peças construídas antes de repovoar,
    chamado no INÍCIO de toda entrada (própria OU visita). Necessário porque a otimização
    incremental de `refreshHouseFurnitureVisuals` (reaproveitar `houseFurnitureNodes[key]` já
    existente) assume implicitamente que a chave `${itemId}#${i}` sempre pertence ao MESMO dono —
    trocar de dono sem isto deixaria peças na posição do dono ERRADO sempre que os dois tiverem o
    mesmo item no mesmo índice.
  - `refreshHouseFurnitureVisuals()` lê de `visitingHouseSnapshot` (mobília do amigo) em vez de
    `progressRef.current` quando presente — nunca escreve de volta em `progress`.
  - Balcão de compras (`houseCounterPos`) bloqueado durante uma visita (`if (!visitingHouseSnapshot)
    onOpenMyHouseRef.current()`) — único caminho de acesso a `MyHousePanel` (comprar/mover/
    excluir), então bloqueá-lo já garante "visitante não altera nada" sem precisar tocar em mais
    nada.
  - Mensagem de boas-vindas ("🏠 Você está na casa de {nome}!") reaproveita o balão de reação já
    existente (`furnitureReactionLabel`/`showChatBubbleText`, lab-170).
  - Reações genéricas (`nearestFurniturePiece`/`showFurnitureReaction`, lab-170) funcionaram pra
    mobília visitada SEM NENHUMA mudança de código — já operavam sobre `houseFurnitureNodes` (os
    nós 3D renderizados), nunca sobre `progress` diretamente.
- **Evento novo `house_visited`** (`productAnalytics.ts` + allowlist `PRODUCT_EVENT_TYPES`,
  testado) — mede "visitas por criança" (métrica esperada citada no documento). Dispara no
  clique, não só na confirmação da cena 3D (mesmo espírito de `trackWeeklyReportPreviewViewed`,
  lab-173). `docs/event-catalog.md` atualizado.

## Decisões técnicas tomadas

- **Sincroniza os dados RAW (`unlockedFurnitureIds`/`housePlacements`), não uma versão já
  resolvida/computada** — o client de quem VISITA reaproveita a mesma lógica de resolução de
  quantidade/posição (`visitFurnitureQuantity` + o mesmo layout em anel de
  `refreshHouseFurnitureVisuals`) já usada pra própria casa, evitando duplicar a matemática do
  layout em dois lugares (dado bruto sincronizado uma vez, lógica de apresentação continua só no
  client).
- **Item `subscriptionOnly` nunca aparece pra visitante, mesmo com o dono assinante** — decisão
  registrada no `FEATURES.md` antes de codar: mostrar mobília paga do anfitrião revelaria o status
  de assinatura dele pra outra criança, informação que a visita não precisa expor e que o
  documento não pede. Não precisou sincronizar entitlement nenhum pro heartbeat — mais simples.
  Mesmo raciocínio se aplica a `planetReward` (conquista pessoal do dono) — esses SIM aparecem,
  já que não revelam nada sensível, só progresso de exploração.
- **Sem limite de frequência dedicado pra visitas** — a chamada de "Visitar casa" já passa pelo
  `GET /players/:id/public-profile` de sempre (`FRIEND_REQUEST_LIMITER`), suficiente pro pedido do
  documento ("limites de frequência") sem inventar um limitador novo.
- **`disposeAllHouseFurnitureNodes` chamado em TODA entrada (própria ou visita), não só na
  transição** — mais simples e mais seguro que tentar detectar "mudou de dono desde a última vez";
  custo de performance desprezível (reconstruir procedural, poucas dezenas de peças no máximo, só
  ao entrar/visitar, nunca por quadro).

## Achados do review automático do Copilot (PR aberto — preencher após a rodada)

(placeholder — atualizado após a revisão)

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

Com este lab, o backlog de código do `docs/market-metrics-engagement-backlog.md` está
COMPLETAMENTE esgotado — todos os itens de implementação (§6, labs 163-175) estão feitos. O que
resta no documento (§7, "Backlog de pesquisa": teste de 5 segundos, sessão moderada, entrevista com
responsáveis, benchmark de concorrentes, teste de preço, segurança percebida) exige pesquisa com
usuários reais — o próprio documento recomenda só avançar pra aquisição paga depois dessa
evidência, e isso está fora do escopo de um laboratório de código. Aguardar pedido novo do usuário
(nova funcionalidade, novo backlog, ou correção de bug reportado).

## Estado do repositório ao final

- Branch: `lab-175-casa-visitavel`.
- `npx tsc -b`/`npm run test` (app): limpo, 169/169 (4 novos: `visitFurnitureQuantity`,
  `setHouseVisible`). `npm run build`: limpo, sem regressão de bundle.
- `npx tsc --noEmit`/`npm run test` (server-accounts): limpo, 120/120 (11 novos:
  `isValidHouseFurnitureIds`, `isValidHousePlacements`, allowlist do evento).
- **Migração `0010` aplicada em produção** (`npm run migrate`, confirmado via query real).
- **Verificado ao vivo, ponta a ponta, contra o banco de PRODUÇÃO real**: subiu um `wrangler dev`
  local (porta 8790, apontando pro `DATABASE_URL` real) + um segundo processo Vite (porta 5180,
  `VITE_ACCOUNTS_API_URL` apontando pro wrangler local) — mesma técnica já usada no lab-172, mas
  aqui pra testar amizade+visita de casa em vez de multiplayer em tempo real. Dois jogadores de
  teste registrados de verdade (`POST /players/register`), amizade criada e aceita via API
  (`POST /players/friend-request`/`respond`), mobília sincronizada pro anfitrião via heartbeat
  (`cama`×2, `tapete`, e um item `subscriptionOnly` de propósito pra confirmar exclusão).
  Confirmado via API: `GET /players/:id/public-profile` devolve a mobília certa quando visível,
  `house: null` quando o dono desliga `houseVisible`, `housePlacements` malformado rejeitado com
  400. **Confirmado na UI real** (perfil de teste local, friend-summary batendo com a amizade
  criada via API): botão "🏠 Visitar casa" aparece só quando há dado; clique fecha o painel de
  Amigos e entra na cena 3D real da casa, populada com EXATAMENTE a mobília do anfitrião (2 camas +
  1 tapete, nenhum `cama_nave` apesar de estar no snapshot enviado); balcão de compras confirmado
  bloqueado durante a visita (`E` perto dele não abre nada); saída pela porta confirmada
  devolvendo o jogador pro planeta principal; reentrada na PRÓPRIA casa depois de visitar
  confirmada mostrando de volta só a mobília própria (1 tapete), com nós 3D novos (nomes aleatórios
  diferentes dos da visita) — prova de que `disposeAllHouseFurnitureNodes` realmente descartou as
  peças do anfitrião, não só escondeu. Toggle de visibilidade confirmado persistindo em
  `localStorage` (`houseVisible: false` após clicar). Perfis de teste (2 `player_identities` + 1
  `friendships`) removidos do banco de produção ao final via `DELETE` direto, confirmado por
  consulta pós-remoção (`GET /players/:id/public-profile` devolvendo 404).
- **Nota de ambiente (não é bug de código)**: verificar a navegação 3D via automação exigiu
  descobrir que `window.__debugTeleport(x,y,z)` recebe uma DIREÇÃO (normalizada internamente),
  não coordenadas exatas — `window.__debugTeleportExact(x,y,z)` é quem posiciona de verdade;
  confundir os dois consumiu tempo de verificação, documentado aqui pra não repetir. Também
  precisou limpar um número grande de processos `wrangler dev`/`vite` órfãos de dev servers
  anteriores desta sessão que ainda ocupavam portas (8788), atrapalhando a primeira tentativa de
  subir um servidor de teste limpo.
