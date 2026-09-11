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
- **`useHeartbeat.ts`** envia `houseFurnitureIds`/`housePlacements`/`houseVisible` a cada tick,
  junto com `equippedLook`/`badges` já existentes — **nota**: esta descrição inicial dizia "RAW,
  sem transformação", mas isso ficou desatualizado já nas rodadas de correção do Copilot abaixo:
  `resolveHouseSyncSnapshot` (`progression.ts`) filtra item `subscriptionOnly`, descarta chave
  fora do formato esperado e trunca em 300 entradas ANTES de enviar — o dado que sai do aparelho
  já é um snapshot sanitizado, não o `progress` cru.
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

- **Sincroniza `unlockedFurnitureIds`/`housePlacements` já FILTRADOS/validados
  (`resolveHouseSyncSnapshot`), não uma versão já resolvida/computada de posição final** — o
  client de quem VISITA reaproveita a mesma lógica de resolução de quantidade/posição
  (`visitFurnitureQuantity` + o mesmo layout em anel de `refreshHouseFurnitureVisuals`) já usada
  pra própria casa, evitando duplicar a matemática do layout em dois lugares. "RAW" aqui nunca
  quis dizer sem sanitização — desde a criação (item `subscriptionOnly` sempre filtrado) e reforçado
  em rodadas seguintes do Copilot, `resolveHouseSyncSnapshot` remove item pago, descarta chave/valor
  inválido e corta em 300 entradas ANTES de qualquer heartbeat sair (achado da 10ª rodada: texto
  antigo dizendo "RAW" sem qualificar podia levar uma mudança futura a reintroduzir o vazamento ou
  a rejeição de payload que essas correções existem pra evitar).
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
  (169/169, 4 novos / 120/120, 11 novos) — atualizado nesta rodada, mas os números de teste finais
  mudam de novo em rodadas SEGUINTES conforme mais correções acrescentam testes (ver o número final
  de verdade na seção "Estado do repositório ao final" no fim deste documento, sempre a fonte
  correta — o corpo da PR e este trecho específico só registram o estado NAQUELE momento da
  revisão, não são atualizados retroativamente a cada rodada posterior).

Nenhuma verificação ao vivo nova pra estes 2 últimos — mudança pequena e de baixo risco (guarda de
montagem + diferenciação de mensagem de erro), confiança por revisão de código e pela suíte de
tipos/testes já limpa.

Quarta rodada do Copilot trouxe 4 achados corrigidos (o de ownership/amizade foi reafirmado de
novo — mesma decisão de documentar, ver `Pendências`):

- **`mountedRef` (correção da rodada 3) travava em `false` pra sempre depois do ciclo de
  desmontagem/remontagem proposital do `<StrictMode>` em dev** (`main.tsx`) — `useRef(true)` só
  roda uma vez, no primeiro render; a limpeza do efeito zera pra `false`, mas nada reafirmava
  `true` na montagem seguinte. Corrigido setando `mountedRef.current = true` no CORPO do efeito,
  não só `false` na limpeza. Só afeta `npm run dev` (StrictMode não roda em produção) — mas
  quebrava justamente a ferramenta de teste local usada pra verificar este mesmo lab. Verificado
  ao vivo: clique real em "Visitar casa" (depois do ciclo de StrictMode já ter acontecido no mount
  do componente) confirmado populando a cena 3D com a mobília certa do amigo.
- **Teto de 300 entradas do servidor (`isValidHouseFurnitureIds`/`isValidHousePlacements`) não
  tinha equivalente no client** — uma casa com mais de 300 cópias de mobília (nada impede comprar
  tantas) faria o heartbeat inteiro ser recusado (400), travando até `badges`/`equippedLook`/
  `last_seen_at` de sincronizar, não só a casa. `resolveHouseSyncSnapshot` agora trunca em 300 em
  vez de mandar tudo (testado).
- **Coordenadas de `housePlacements` só checavam `Number.isFinite`**, aceitando valores absurdos
  tipo `1e308` que passariam direto pro Babylon do visitante (`World3D.tsx`), sem qualquer relação
  com o tamanho real da sala (`HOUSE_ROOM_HALF_SIZE = 5.5`). Adicionado limite de amplitude
  generoso (`±20` posição, `±1000` rotação) em `isValidHousePlacementValue` (testado).
- **`GET /players/:id/public-profile` sem `Cache-Control: no-store`** — um navegador/proxy podia
  reaproveitar uma resposta com a casa visível mesmo depois do dono desligar, furando exatamente a
  revalidação da rodada 2/3. Header adicionado na resposta.

Quinta rodada do Copilot trouxe 1 achado real corrigido (mais o de ownership/amizade reafirmado de
novo pela 3ª vez — mesma decisão, ver `Pendências`; e os números de teste de `labs/CURRENT.md`
desatualizados de novo, corrigidos):

- **`house_visited` entrava na allowlist (`PRODUCT_EVENT_TYPES`) e era gravado normalmente, mas
  não aparecia em NENHUM endpoint de leitura** — `weeklyFunnel` (`GET /admin/metrics`) é um objeto
  de formato FIXO, um campo por tipo de evento; a métrica "visitas por criança" citada no
  documento nunca teria como ser consultada, só via query manual na tabela `product_events`.
  Corrigido adicionando `houseVisited: weeklyDevices('house_visited')` ao `weeklyFunnel`.
  **Observação pra um lab futuro** (fora do escopo deste PR, não introduzida por ele): o mesmo
  buraco já existe pros eventos de conversão adulta do lab-166/173 (`family_landing_viewed`,
  `parent_signup_started`, `checkout_started`, `weekly_report_preview_viewed`) — nenhum deles
  aparece em `weeklyFunnel`/`weeklyCommercial` hoje, mesma limitação pré-existente, não corrigida
  aqui por estar fora do escopo de "casa visitável".

Sexta rodada do Copilot trouxe 3 achados reais corrigidos + 3 melhorias de documentação (o de
ownership/amizade foi reafirmado de novo, mesma decisão mantida):

- **Visitar casa dirigindo o carro ou pilotando o foguete deixava os dois "ativos" ao mesmo tempo**
  — a entrada normal (E perto da porta) já passa pelo ramo de "sair do carro" de
  `handleInteractPress` antes de chegar em `enterHouseInterior`, mas "Visitar casa" (a ponte nova)
  pula direto pra lá, sem passar por esse ramo. Corrigido bloqueando a visita nesses dois casos
  (mensagem "🚗 Saia do carro ou do foguete antes de visitar uma casa.") — mais simples e mais
  seguro que tentar desparentar/reposicionar o veículo no meio da troca de mundo. Foguete em pleno
  voo já não tinha "sair" de propósito (regra do lab-59); agora carro segue a mesma lógica pra esta
  ação específica.
- **Margem de `±20` da 4ª rodada ainda deixava uma peça visivelmente FORA da sala real** (a sala
  tem só `4,8` de alcance real — `HOUSE_ROOM_HALF_SIZE - FURNITURE_PLACEMENT_MARGIN` = 5,5 - 0,7,
  o mesmo limite que `World3D.tsx` já usa pra travar o modo de posicionamento interativo, "Mover").
  Apertado o limite de `x`/`z` pra `4,8`, o mesmo valor real do jogo — nunca rejeita uma posição
  legítima, só as que só um client modificado conseguiria produzir (testado).
- **Sair de uma visita iniciada de Marte/outro planeta devolvia o jogador perto da casa no planeta
  PRINCIPAL, não de onde ele realmente veio** — `exitHouseInterior` sempre pousava numa direção
  fixa (`houseUp`), inofensivo enquanto só dava pra entrar em casa fisicamente perto dela (sempre
  no planeta principal), mas "Visitar casa" é alcançável de qualquer planeta. Nova variável
  `savedOutsideLocalUp` captura a direção de VERDADE de onde o jogador estava na entrada, usada na
  saída no lugar de `houseUp`. Verificado ao vivo: teletransportado pra uma posição aleatória no
  planeta principal (longe da casa), visitou uma casa fake, saiu pela porta, e a posição final
  ficou a ~2,5 unidades da posição ORIGINAL (a distância esperada do pequeno deslocamento
  tangencial pra não pousar exatamente na porta) — não a ~13 unidades de distância que a posição
  fixa antiga (perto da casa) produziria.
- **Corrigido (documentação)**: introdução de `docs/event-catalog.md` esclarecida (a frase "nenhum
  evento novo foi criado" descrevia só a CRIAÇÃO do documento no lab-165, não uma promessa de que a
  tabela nunca cresceria — já cresceu várias vezes desde então); comentário em `CONTEXT.md` (este
  arquivo) que dizia "RAW, sem transformação" pra descrever o que `useHeartbeat.ts` envia,
  desatualizado depois de `resolveHouseSyncSnapshot` passar a sanitizar antes de enviar; texto que
  citava "duas rodadas" reescrito pra nunca mais ficar defasado (aponta pra seção final em vez de
  citar um número fixo).

Sétima rodada do Copilot trouxe 4 achados reais corrigidos (mais o número de teste de
`labs/CURRENT.md`, atualizado de novo — desta vez pro número final de VERDADE, depois desta
rodada):

- **`body === null` (resposta 2xx com corpo vazio/JSON inválido) caía na mensagem de "casa não
  visitável agora" na revalidação de "Visitar casa"**, igual ao caso real "o dono desligou" —
  mesma falha que `usePlayerPublicProfile.ts` já trata como ERRO de verdade. Corrigido tratando
  `body === null` junto com `!res.ok`.
- **`sanitizeHousePlacements` (servidor) só filtrava item `subscriptionOnly`, repassando qualquer
  chave/valor já salvo** — uma linha gravada ANTES do limite de `4,8` existir (6ª rodada), ou
  corrompida por qualquer outro motivo, ainda podia chegar ao visitante com coordenada absurda ou
  formato inválido, apesar do contrato desta rota dizer que a resposta é sempre sanitizada.
  Reaplica agora o MESMO formato/limite de `isValidHousePlacements` (testado).
- **`resolveHouseSyncSnapshot` (client) só validava a CHAVE, nunca o VALOR do placement** — com o
  servidor agora rejeitando coordenada fora de `±4,8` (6ª rodada), um único valor de placement
  corrompido/antigo no `progress` local passaria a travar o heartbeat INTEIRO (400), impedindo até
  `badges`/`equippedLook`/`last_seen_at` de sincronizar — mesma classe de bug já corrigida uma vez
  pra CHAVES na 4ª rodada, mas não pra VALORES. Corrigido validando/descartando o mesmo contrato
  do servidor antes de enviar (testado).
- **`exitHouseInterior` ainda usava `PLANET_RADIUS` (13, fixo) pra escalar o deslocamento
  tangencial de saída, mesmo depois da correção de direção da 6ª rodada** — errado se o mundo
  salvo for outro planeta com raio bem diferente (Mercúrio, Marte). Corrigido chamando
  `savedOutsideGroundFn(savedOutsideLocalUp)` (a mesma função já usada pra calcular o chão de
  verdade) em vez de um raio fixo — sem precisar guardar mais nenhuma variável nova.

Nenhuma verificação ao vivo nova pra esta rodada — as 4 correções são hardening defensivo com
contrato já espelhado 1:1 do lado que JÁ tinha sido testado ao vivo (o mesmo limite de coordenada
da 6ª rodada, a mesma checagem de erro-vs-vazio da 3ª, o mesmo cálculo de chão já usado em toda
entrada normal de planeta) — confiança pela suíte de testes (2 novos) e revisão de código.

Oitava rodada do Copilot trouxe 1 achado real corrigido (crash) e 2 achados de precisão de
métrica/documentação (não são bug de código, corrigidos por clareza):

- **`resolveHouseSyncSnapshot` (client) validava os CAMPOS do valor de um placement (`x`/`z`/
  `rotY` fora do limite, 7ª rodada) mas nunca checava se o valor em si era um objeto** — um save
  local corrompido com `housePlacements: { "cama#0": null }` (ou string/array no lugar do objeto)
  fazia `value.x` estourar (`TypeError`) ANTES do filtro rodar, quebrando o heartbeat inteiro (mesma
  classe de bug da 7ª rodada, mas pra "valor nem é objeto" em vez de "objeto com campo fora do
  limite"). Corrigido com guard de tipo (`typeof === 'object' && !== null && !Array.isArray`) antes
  de ler os campos, igual ao guard já usado do lado do servidor (`isValidHousePlacementValue`,
  `domain.ts`) — testado (`housePlacements` com valor `null`/string/array misturado a um valor
  válido: só o válido sobrevive, sem lançar).
- **O mesmo achado também apontou o contêiner `progress.housePlacements` em si** — vem de JSON
  persistido sem validação (`loadProgress`, `storage.ts`), então um save com `housePlacements: null`
  faria `Object.entries` estourar antes de qualquer filtro. Corrigido com `?? {}` — testado
  (`housePlacements: null` não lança, resolve pra `placements: {}`).
- **Achado de precisão (não é bug de código introduzido por este lab)**: o campo `houseVisited` de
  `weeklyFunnel` usa `weeklyDevices('house_visited')` — a MESMA convenção de todo outro passo do
  funil (`playClick`, `questCompleted`, etc., todos por `count(distinct device_id)`). O documento
  descrevia a métrica como "visitas por criança", mas o que é medido de verdade é dispositivos
  únicos com pelo menos 1 clique na semana: perde revisitas do mesmo aparelho, e não distingue
  perfis que compartilham/trocam de aparelho (perfis não têm identificador próprio nos eventos, só
  `getOrCreateDeviceId()` — mesma limitação de privacidade já aceita do resto do funil, não uma
  regressão nova). Corrigido só a DOCUMENTAÇÃO (`docs/event-catalog.md` e um comentário em
  `index.ts` perto de `houseVisited`) pra descrever com precisão o que o número mede, em vez de
  mudar o cálculo em si (mudaria a convenção do `weeklyFunnel` inteiro, fora do escopo deste lab).

Verificação desta rodada: `npx tsc -b`/`npm run test` (app) e `npx tsc --noEmit`/`npm run test`
(server-accounts) limpos, `npm run build` limpo. Sem verificação ao vivo nova — o crash corrigido é
um caminho de dado corrompido/legado que não ocorre em nenhum fluxo normal já testado ao vivo nas
rodadas anteriores, e as mudanças de métrica são só texto/comentário.

Nona rodada do Copilot trouxe 3 achados reais corrigidos (mais a descrição da PR, desatualizada
desde a 1ª rodada):

- **`isValidHousePlacementValueForSync` (client) checava os CAMPOS mas não o número exato de
  chaves** — o validador do servidor (`isValidHousePlacementValue`, `domain.ts`) exige EXATAMENTE
  3 chaves (`x`/`z`/`rotY`); um placement salvo localmente com uma propriedade extra (ex.:
  `legacy: true` de uma versão antiga do save) passava pelo filtro do client mas era rejeitado pelo
  servidor, derrubando o heartbeat INTEIRO (400) — mesma classe de bug já corrigida pra "valor não
  é objeto" (8ª rodada) e "campo fora do limite" (7ª rodada), agora faltando só a checagem de
  contagem de chaves. Corrigido com `Object.keys(value).length === 3` (testado).
- **`sanitizeHouseFurnitureIds`/`sanitizeHousePlacements` (servidor, usadas na LEITURA por
  `GET /players/:id/public-profile`) não aplicavam o teto de 300 entradas** — os validadores de
  ESCRITA (`isValidHouseFurnitureIds`/`isValidHousePlacements`) impedem gravar mais que isso, mas
  uma linha salva ANTES desses limites existirem (ou corrompida) podia ter mais de 300 itens/
  placements válidos, e a sanitização de leitura devolvia tudo — a resposta pública ficava sem o
  teto de tamanho que o contrato promete. Corrigido cortando em `HOUSE_FURNITURE_MAX_COUNT`/
  `HOUSE_PLACEMENTS_MAX_KEYS` também na leitura (testado, 300 de 305 aceitos em ambos os casos).
- **Descrição da PR (não é código)**: o "Test plan" original ainda citava os números da 1ª rodada
  (173/173 app, 125/125 server-accounts) mesmo depois de rodadas seguintes terem adicionado mais
  testes — corrigido pra apontar pra este documento como fonte de verdade em vez de repetir um
  número que ficaria defasado de novo a cada rodada.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 176/176) e `npx tsc --noEmit`/
`npm run test` (server-accounts, 129/129) limpos, `npm run build` limpo. Sem verificação ao vivo
nova — os 3 achados são hardening defensivo de contratos já testados (o mesmo formato de chave do
servidor, o mesmo teto de tamanho da escrita), sem caminho novo de UI envolvido.

Décima rodada do Copilot trouxe 5 achados reais corrigidos (4 crashes/vazamento de recurso + 1
documentação desatualizada):

- **`resolveHouseSyncSnapshot` (client) fazia `.filter()` em `unlockedFurnitureIds` sem checar se
  era array** — mesma classe de bug já corrigida pra `housePlacements` na 8ª rodada; um save
  corrompido com `unlockedFurnitureIds: null` fazia o heartbeat inteiro (periódico E imediato)
  lançar `TypeError` antes de enviar qualquer campo. Corrigido com `Array.isArray(...) ? ... : []`
  (testado).
- **`useHeartbeat.ts` enviava `progressRef.current.houseVisible` direto pro servidor sem validar
  que era booleano** — um save corrompido com `null`/string nesse campo fazia o servidor recusar o
  heartbeat PERIÓDICO inteiro (400, "houseVisible inválido"), travando `badges`/`equippedLook`/
  `last_seen_at` a cada tick de 60s (pior que os achados anteriores, que exigiam mobília/placement
  específico — este acontece sempre que o save está corrompido). Corrigido normalizando pro
  default real (`true`, mesmo de `storage.ts`) quando o valor salvo não é booleano.
- **`GET /players/:id/public-profile` fazia `row.house_furniture_ids as string[]` sem checar se a
  coluna `jsonb` (sem constraint) realmente continha um array** — uma linha legada/corrompida com
  objeto/string nesse campo fazia `sanitizeHouseFurnitureIds` (que assume array pra `.filter`)
  lançar, devolvendo 500 em vez de um perfil sanitizado (ou `house: null`). Corrigido validando
  `Array.isArray`/formato de objeto antes de chamar as funções de sanitização, mesmo princípio já
  aplicado aos guards do lado client.
- **Vazamento de material/textura em `disposeAllHouseFurnitureNodes` e no laço de remoção
  incremental de `refreshHouseFurnitureVisuals`** — `TransformNode.dispose()` sem argumentos usa
  `disposeMaterialAndTextures = false`; como `buildFurniturePiece` cria um `PBRMaterial` novo por
  peça e `disposeAllHouseFurnitureNodes` roda em TODA troca de dono (própria ↔ visita, ou visita A
  ↔ visita B, não só ao sair do jogo), o material antigo ficava registrado na cena a cada visita,
  crescendo uso de heap/GPU. Corrigido chamando `.dispose(false, true)` nos dois pontos de remoção
  (confirmado pela assinatura real de `TransformNode.dispose` nos tipos do `@babylonjs/core`
  instalado: `dispose(doNotRecurse?, disposeMaterialAndTextures?)`).
- **Corrigido (documentação)**: `CONTEXT.md` (este arquivo, "Decisões técnicas tomadas") dizia que
  o heartbeat sincroniza os dados "RAW", o que nunca foi verdade desde a criação (item
  `subscriptionOnly` sempre foi filtrado) e ficou mais impreciso ainda depois das rodadas 4/7/8/9
  adicionarem validação de chave, valor e teto de tamanho — reescrito pra descrever o que
  `resolveHouseSyncSnapshot` realmente faz, pra não induzir uma mudança futura a reintroduzir um
  vazamento ou rejeição de payload que essas correções existem pra evitar.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 177/177) e `npx tsc --noEmit`/
`npm run test` (server-accounts, 129/129) limpos, `npm run build` limpo. Sem verificação ao vivo
nova pro fix de vazamento de material (nenhum teste automatizado de uso de heap/GPU existe neste
projeto; confiança pela leitura direta da assinatura real de `TransformNode.dispose` nos tipos
instalados) nem pro guard de `index.ts` (caminho de dado corrompido em produção, impraticável de
simular sem uma linha real assim no banco) — mesmo padrão de confiança já usado nas rodadas 7/8
pra hardening defensivo que espelha um contrato já testado.

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
- `npx tsc -b`/`npm run test` (app): limpo, 177/177 (12 novos: `visitFurnitureQuantity`,
  `setHouseVisible`, `resolveHouseSyncSnapshot` ×8, incluindo o truncamento em 300 da 4ª rodada, a
  validação de valor corrompido/fora do limite da 7ª, o guard de valor nulo/não-objeto + contêiner
  nulo da 8ª, a checagem de chaves extras da 9ª, e o guard de `unlockedFurnitureIds` não-array da
  10ª). `npm run build`: limpo, sem regressão de bundle.
- `npx tsc --noEmit`/`npm run test` (server-accounts): limpo, 129/129 (20 novos:
  `isValidHouseFurnitureIds`, `isValidHousePlacements` (incluindo os testes de limite de
  coordenada da 4ª e 6ª rodada, com o limite real de `4,8` apertado na 6ª),
  `sanitizeHouseFurnitureIds`/`sanitizeHousePlacements` (incluindo o teste de re-sanitização de
  formato/valor da 7ª rodada e o teto de 300 na leitura da 9ª), allowlist do evento). **Este é o
  número final de verdade — se você encontrar um número diferente em qualquer outro trecho deste
  documento ou na PR, este aqui é a fonte correta.**
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
- **Reverificado ao vivo de novo depois da 4ª rodada** (novo `wrangler dev`/Vite, novos jogadores
  de teste, dados removidos ao final): fluxo completo real repetido do zero (perfil recém-carregado,
  ciclo de `<StrictMode>` já ocorrido no mount) — clique em "Visitar casa" confirmado populando a
  cena 3D com a mobília certa do amigo (`furniture-plant-...`), provando que a correção do
  `mountedRef` realmente resolve o travamento em dev descrito pelo achado (sem ela, esse clique
  cairia silenciosamente no `if (!mountedRef.current) return`, nunca chamando `onVisitHouse`).
- **Reverificado ao vivo depois da 6ª rodada** (só o fix de posição de saída, o de bloqueio de
  veículo foi confirmado por revisão de código — o guard é um `if` simples de baixo risco, e
  entrar num carro de verdade via automação exigiria mais tempo do que o achado justifica):
  teletransportado pra uma posição ARBITRÁRIA no planeta principal (longe da casa de propósito),
  visitou uma casa (dados fictícios via `__visitFriendHouse`), saiu pela porta — posição final
  confirmada a ~2,5 unidades da posição ORIGINAL (a distância exata esperada do pequeno
  deslocamento tangencial que evita pousar exatamente na porta), não a ~13 unidades que a versão
  antiga (pousando sempre perto da casa) produziria — prova de que `savedOutsideLocalUp` captura a
  direção de verdade em vez de uma direção fixa.
