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

## Achados do review automático do Copilot (PR #49, corrigidos antes do merge)

Rodada com 5 achados reais (mais 1 avaliado e documentado, não corrigido nesta PR):

- **Mobília `subscriptionOnly` vazava pro visitante via `GET /players/:id/public-profile`** — só
  era filtrada no CLIENT que renderiza a visita (`visitFurnitureQuantity`); a resposta HTTP crua
  ainda continha `cama_nave`/etc., inspecionável via rede. Corrigido em DOIS lugares: (1)
  `resolveHouseSyncSnapshot` novo (`progression.ts`, testado) filtra ANTES de enviar no heartbeat
  — item pago nunca sai do aparelho do dono; (2) `sanitizeHouseFurnitureIds`/
  `sanitizeHousePlacements` novos (`domain.ts`, testados) filtram de novo no SERVIDOR antes de
  responder — defesa em profundidade, não depende só do client se comportar (um client modificado
  ou um heartbeat salvo antes desta correção não vaza o status de assinatura do anfitrião).
- **`housePlacements` com chave legada (sem `#índice`, formato de antes do lab-136) fazia o
  heartbeat INTEIRO ser recusado (400)** — um único save muito antigo nunca mais tocado impedia
  até `houseFurnitureIds`/`houseVisible` sincronizarem. `resolveHouseSyncSnapshot` descarta
  qualquer chave fora do formato esperado antes de enviar, em vez de deixar o objeto inteiro falhar
  a validação.
- **Toggle de visibilidade só valia no próximo tick do heartbeat (até 60s depois), ou nunca, se o
  jogador fechasse o jogo antes** — contradizia a promessa "você controla quem visita". Nova função
  `sendImmediateHouseVisibility` (`useHeartbeat.ts`) dispara um heartbeat imediato só com
  `houseVisible` no clique do toggle, sem esperar o tick periódico. Verificado ao vivo: `house:
  null` confirmado na resposta da API IMEDIATAMENTE após o clique, sem esperar 60s.
- **Visitar uma casa enquanto já dentro de OUTRA (própria ou visita anterior) corrompia a posição
  de retorno** — `enterHouseInterior` sempre recapturava `savedOutsideCenter =
  currentWorldCenter`, mas se já `insideHouseInterior`, `currentWorldCenter` já era o centro da
  SALA (não o mundo de fora); sair da casa NOVA devolvia o jogador pra dentro de uma sala em vez do
  planeta principal. Corrigido só capturando `savedOutsideCenter`/`savedOutsideGroundFn` quando
  ainda NÃO está dentro de nenhuma casa. Mesmo bloco também passou a chamar `getUpFromBed()`/
  `cancelFurniturePlacement()` antes de descartar os nós antigos — evita a figura ou uma peça
  fantasma ficarem presas a um nó já destruído. Verificado ao vivo: entrou na própria casa, visitou
  um amigo SEM sair antes (mobília trocou corretamente pra do amigo), saiu pela porta e confirmou
  a posição de volta batendo com o planeta principal de verdade (magnitude ~12,8, igual ao raio do
  planeta), não com o centro da sala (que teria magnitude ~211).
- **Pedido de visita podia ser descartado silenciosamente se clicado antes da cena 3D terminar de
  carregar** — `sceneRef.current` existe bem antes de `__visitFriendHouse` ser atribuído (só no
  fim do `setup()` assíncrono); o painel de Amigos já é alcançável nesse meio-tempo. Corrigido: o
  `useEffect` que consome `visitHouseRequest` agora tenta de novo a cada 200ms por até ~10s antes
  de desistir, em vez de checar uma vez só e descartar o pedido.
- **Avaliado e documentado, NÃO corrigido nesta PR: `POST /players/heartbeat` não verifica que
  quem chama controla de fato o `playerId` enviado** — qualquer um que descubra o UUID (opaco, não
  é credencial) pode sobrescrever `houseFurnitureIds`/`housePlacements`/`houseVisible` de outro
  jogador. Este é o MESMO modelo de confiança já usado por `equippedLook`/`badges` desde o
  lab-162/163 e por `POST /players/friend-request` desde o lab-160 (nenhum dos dois verifica
  ownership hoje) — decisão de arquitetura já tomada e aceita pra todo o sistema de identidade de
  jogador anônimo, não uma regressão introduzida por este lab. O blast radius já é pequeno por
  design: `visitFurnitureQuantity`/`FURNITURE_CATALOG.forEach` só constroem mobília de ids REAIS
  do catálogo fechado (confirmado ao vivo: ids inventados como `"sofa"` são silenciosamente
  ignorados, nunca geram erro nem mobília arbitrária) — o pior caso é um griefer mostrar uma
  combinação ERRADA de móveis aprovados na casa de um amigo, sempre auto-corrigido no próximo
  heartbeat real do dono (60s). Corrigir de verdade exigiria introduzir autenticação real pra TODO
  o sistema de identidade de jogador anônimo (busca, amizade, perfil público) — iniciativa maior,
  fora do escopo deste laboratório de "casa visitável". Candidato a lab dedicado se a superfície de
  risco social crescer o bastante pra justificar.

Segunda rodada do Copilot (mesmo PR, depois da primeira leva de correções) trouxe mais 6 achados:

- **Toggle de visibilidade imediato (correção da rodada 1) enviava só `houseVisible`, deixando
  `houseFurnitureIds`/`housePlacements` presos no valor do ÚLTIMO tick periódico** — se o dono
  mudasse a decoração enquanto a casa estava privada e reativasse a visibilidade antes do próximo
  tick (até 60s), os amigos veriam a decoração ANTIGA. `sendImmediateHouseVisibility` agora recebe
  o `progress` inteiro e envia o snapshot completo (`resolveHouseSyncSnapshot`), não só o
  booleano. Verificado ao vivo: heartbeat imediato confirmado carregando `houseFurnitureIds`
  correto junto com `houseVisible`, refletido na hora na API.
- **CRÍTICO: perfil público de um amigo era carregado uma vez só ao abrir a view e reaproveitado
  no clique de "Visitar casa"** — se o dono desligasse a visibilidade ENQUANTO o visitante já
  estava com o perfil aberto (mesmo com o heartbeat imediato da correção acima), o botão ainda
  usava o snapshot velho e deixava entrar. `PlayerPublicProfileView.tsx` agora busca o perfil DE
  NOVO no clique (`handleVisitClick`), só chama `onVisitHouse` se `house` ainda existir na resposta
  fresca; senão mostra "🏠 A casa não está mais visitável agora." Verificado ao vivo reproduzindo
  o cenário exato: perfil do amigo aberto, casa tornada privada por uma chamada direta à API
  simulando o dono, clique em "Visitar casa" confirmado bloqueado com a mensagem certa — e
  confirmado que a cena 3D nunca populou com a mobília do amigo (só a peça própria continuou lá).
- **Corrigido (menor)**: botão de toggle sem `aria-pressed` (acessibilidade, leitor de tela não
  anunciava o estado); comentário da migração `0010` dizia que o Worker "nunca interpreta" o
  conteúdo, desatualizado depois da sanitização server-side da rodada 1; comentário em `types.ts`
  dava a entender que a mobília só sincroniza quando `houseVisible` é `true` (na verdade sincroniza
  todo tick, é só a LEITURA pública que depende disso); números de teste desatualizados em
  `labs/CURRENT.md` (169/169→172/172 app, 120/120→123/123 server-accounts).
- **Avaliado e documentado, NÃO corrigido**: corrida entre o heartbeat periódico (60s) e o
  heartbeat imediato do toggle — se um heartbeat periódico com o `houseVisible` ANTIGO já estiver
  em trânsito quando o toggle dispara o imediato, e chegar depois, o `UPDATE ... coalesce` sem
  versionamento pode reverter o valor até o próximo tick. Mitigado (não eliminado) pela correção
  acima: o heartbeat imediato agora carrega um snapshot completo e atual, então mesmo se
  sobrescrito por um heartbeat antigo em trânsito, o efeito prático fica limitado a `houseVisible`
  reverter por até mais um ciclo de 60s — sempre autocorrigido no próximo tick real, nunca
  permanente. Resolver de verdade exigiria numeração/timestamp de requisição no heartbeat inteiro
  (mudança maior, mesma categoria da pendência de autenticação acima) — fora do escopo proporcional
  pra um único campo booleano.

Terceira rodada do Copilot trouxe 2 achados novos corrigidos + reafirmou 3 já avaliados/documentados
nas rodadas anteriores (corrida de heartbeat, falha silenciosa de rede — ver pendências abaixo — e
o mesmo achado de ownership/amizade não verificada em `GET /players/:id/public-profile`, agora
citando explicitamente que um ex-amigo REMOVIDO também continuaria com acesso — mantida a mesma
decisão de documentar como limitação arquitetural pré-existente do sistema de identidade anônima
inteiro, ver `Pendências` acima, não uma regressão nova):

- **`PlayerPublicProfileView.tsx`: clicar "Visitar casa" e sair da tela (Voltar/fechar) ANTES da
  resposta chegar ainda disparava `onVisitHouse` depois, teleportando o jogador mesmo com a tela
  já abandonada** — corrigido com uma ref de "montado" (mesmo padrão `cancelled` já usado em
  `usePlayerPublicProfile.ts`), checada antes de chamar `onVisitHouse`/atualizar estado.
- **Resposta HTTP com erro (rate limit, falha temporária) durante a revalidação caía na MESMA
  mensagem de "casa não visitável agora"**, misturando "o dono desligou de propósito" com "algo deu
  errado, tente de novo" — diferenciado: `!res.ok` mostra `body.error` ou uma mensagem genérica de
  retry; só `res.ok` com `house: null` mostra a mensagem de "não visitável".
- **PR desatualizada**: o corpo da PR (`gh pr edit`) tinha os números de teste da primeira versão
  (169/169, 4 novos / 120/120, 11 novos) — atualizado pros números finais depois das duas rodadas
  de correção (172/172, 7 novos / 123/123, 14 novos).

Nenhuma verificação ao vivo nova pra estes 2 últimos — mudança pequena e de baixo risco (guarda de
montagem + diferenciação de mensagem de erro), confiança por revisão de código e pela suíte de
tipos/testes já limpa.

## Pendências / dívidas conhecidas

- **Corrida entre heartbeat periódico e imediato sem versionamento** — pode reverter
  `houseVisible` por até mais um ciclo de 60s em uma janela bem estreita (heartbeat periódico já em
  trânsito no exato momento do toggle); sempre autocorrigido, nunca permanente. Resolver de
  verdade exige numeração/timestamp no heartbeat — mudança maior, mesma categoria da pendência de
  autenticação abaixo.

- **Autenticação/ownership real pro sistema de identidade de jogador anônimo** (busca, amizade,
  heartbeat, perfil público) — risco de baixo impacto hoje (ver achado do Copilot acima), mas
  cresce conforme mais dados por jogador viram sincronizados. Inclui especificamente `GET
  /players/:id/public-profile` não verificar amizade `accepted` (nem sequer remover acesso de um
  ex-amigo removido) — mesma limitação do sistema inteiro desde o lab-163, reafirmada pelo Copilot
  na 3ª rodada deste PR. Candidato a lab dedicado futuro.
- **`sendImmediateHouseVisibility`/`sendHeartbeat` descartam falha de rede ou resposta não-2xx
  silenciosamente** (mesmo padrão fire-and-forget de todo o resto do heartbeat desde o lab-162,
  "nunca interrompe o jogo pra criança por causa disto") — se o clique do toggle falhar por rede/
  rate limit, a UI já mostra o novo estado mas o backend continua com o valor antigo até o próximo
  tick periódico (60s) tentar de novo com sucesso. Mesmo raciocínio de tolerância a falha do resto
  do sistema; corrigir exigiria inspecionar a resposta e reverter/avisar a UI, tratamento
  diferente de todo o resto do heartbeat só pra este campo — desproporcional pro risco (janela
  de no máximo 60s, sempre autocorrigida).

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
- `npx tsc -b`/`npm run test` (app): limpo, 172/172 (7 novos: `visitFurnitureQuantity`,
  `setHouseVisible`, `resolveHouseSyncSnapshot` ×3). `npm run build`: limpo, sem regressão de
  bundle.
- `npx tsc --noEmit`/`npm run test` (server-accounts): limpo, 123/123 (14 novos:
  `isValidHouseFurnitureIds`, `isValidHousePlacements`, `sanitizeHouseFurnitureIds`/
  `sanitizeHousePlacements`, allowlist do evento).
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
- **Reverificado ao vivo depois dos achados do Copilot** (novo `wrangler dev`/Vite, novos
  jogadores de teste, dados removidos ao final): `GET /players/:id/public-profile` confirmado
  filtrando `cama_nave` mesmo com um heartbeat BRUTO forçando o item de propósito (bypass direto
  da API, simulando um client modificado) — prova de que a sanitização server-side funciona
  independente do client; clique no toggle de visibilidade confirmado disparando um heartbeat
  IMEDIATO (`window.fetch` monkey-patch capturou `{playerId, houseVisible:false}` no exato clique)
  e `house: null` confirmado na API sem esperar o tick de 60s; entrou na própria casa, visitou um
  amigo SEM sair antes (cenário exato do achado), confirmou a mobília trocando corretamente pra do
  amigo, saiu pela porta e confirmou a posição final batendo com o planeta principal de verdade
  (magnitude do vetor posição ~12,8, igual ao raio real do planeta) — não com o centro da sala
  (que teria ~211), provando que `savedOutsideCenter` não foi mais corrompido pela visita
  encadeada.
