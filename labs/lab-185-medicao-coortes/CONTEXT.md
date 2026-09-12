# Contexto — Laboratório 185 — Medição de coortes de retenção e qualidade

Preenchido em: 2026-09-12
Commit inicial → final: c324d29860d896eca704104fc25369b355710464..HEAD (ver `git log` na branch
`lab-185-medicao-coortes`)

## O que foi feito

Investigação prévia (antes de codar, ver `FEATURES.md`) confirmou a premissa do backlog e mapeou o
pipeline de eventos já maduro (`trackEvent` → `POST /events` → allowlist → `product_events`) e a
retenção D1/D7 já existente mas incompleta (sem D0, sem comparação de coorte). O lab fechou os 6
itens planejados:

- **3 eventos novos** (`camera_recenter_used`, `cosmetic_equipped`, `planet_travel_completed`) na
  allowlist `PRODUCT_EVENT_TYPES` (`app/server-accounts/src/domain.ts`) + trackers finos em
  `app/src/productAnalytics.ts`, mesmo padrão de `trackHouseVisited`. Disparados em:
  `world3d/World3D.tsx` (`handleRecenterCamera`, `landRocket`) e `state/useProfile.ts` (7 funções
  `equip*`, disparo dentro da própria função de estado — não na UI — pra funcionar
  independentemente de qual componente chama).
- **`docs/event-catalog.md`**: 3 linhas novas na tabela de eventos + seção nova "Nível de
  agregação" consolidando a limitação device_id-only (antes espalhada em notas por evento) + 3
  bullets novos na seção "Qual métrica alimenta" (câmera, loja, planetas) + menção de
  `newDevicesToday`/`cohortComparison` na entrada de retenção já existente.
- **`newDevicesToday`** (D0) — adicionado à mesma query CTE que já calculava D1/D7
  (`handleAdminMetrics`), um `select count(*) from first_seen where day0 = current_date` a mais no
  `select` final, sem round-trip extra ao banco.
- **`cohortComparison`** via `?cohortSplitDate=YYYY-MM-DD` — nova query reaproveitando a MESMA
  estrutura de CTE (`first_seen`/`d1_eligible`/`d1_returned`/`d7_eligible`/`d7_returned`), trocando
  o `select` final por `count(*) filter (where day0 < data)` (grupo "antes") e
  `count(*) filter (where day0 >= data)` (grupo "depois") pra devolver os dois numa única ida ao
  banco. Só aparece na resposta quando o parâmetro é passado (spread condicional,
  `...(cohortComparison ? {...} : {})`) — não muda o formato pra quem já consome o endpoint sem o
  parâmetro.
- **`weeklyFunnel`** ganhou 3 chaves novas (`cameraRecenterUsed`, `cosmeticEquipped`,
  `planetTravelCompleted`), mesmo padrão `weeklyDevices(tipo)` das 8 chaves já existentes.
- **`guardrails: string[]`** no próprio JSON de resposta — repete as 2 limitações mais importantes
  (agregação por dispositivo, amostra pequena) pra quem só consome a API sem abrir o catálogo.
- **Nova função pura testada**: `isValidIsoDateOnly` (`domain.ts`) valida `YYYY-MM-DD` com
  checagem de calendário real (não só regex — `30 de fevereiro` passa no regex mas falha na
  reconstrução via `Date.UTC`), usada pra validar `cohortSplitDate` antes de interpolar na query
  (400 em vez de erro de SQL/resultado sem sentido com uma data malformada). Testada em
  `domain.test.ts` (contagem final de casos, incl. os adicionados pelo review do Copilot, na seção
  "Estado do repositório ao final" abaixo — evitando repetir um número aqui que dessincroniza fácil
  do estado real, como já aconteceu mais de uma vez neste mesmo arquivo).

## Decisões técnicas tomadas

- **`cosmetic_equipped` só dispara ao EQUIPAR um item real (`id !== null`), nunca ao voltar pro
  padrão** — o sinal de engajamento é "escolheu um cosmético", não "removeu um"; se contássemos os
  dois, alternar rapidamente entre itens (comum numa lojinha) infla artificialmente o número.
- **`planet_travel_completed` só na chegada de verdade ao destino, não ao desistir e voltar à
  origem** — `landRocket()` já distingue os dois casos via `arrivedAtDestination` (usado também
  pra decidir cartão-postal); reaproveitar essa mesma flag em vez de inventar uma checagem nova.
- **Disparo do evento de cosmético dentro de `useProfile.ts`, não na UI (`AvatarShop.tsx`)** — o
  hook é o único ponto real de mutação de estado, chamado por qualquer componente que decida
  equipar algo; colocar o `trackEvent` na UI arriscaria esquecer um caminho (ex.: um atalho de
  teclado ou outro painel que chame `equipHat` diretamente) e duplicar ou perder o evento.
- **D0/cohort comparison reaproveitam a MESMA CTE de sempre, não uma tabela nova** — evita
  qualquer migração (checado antes de codar: `product_events` já tem tudo que essas duas métricas
  precisam) e mantém as 3 formas de olhar retenção (D1/D7 globais, D0 diário, antes/depois) sempre
  coerentes entre si (mesma definição de `day0`, mesma janela de elegibilidade).
- **`cohortComparison` só aparece na resposta quando `?cohortSplitDate=` é passado** (em vez de
  sempre presente com valores nulos) — não quebra nenhum consumidor existente do endpoint que não
  conhece esse campo novo.
- **Validação de data com checagem de calendário real, não só regex** — `/^\d{4}-\d{2}-\d{2}$/`
  sozinho aceita "2026-02-30"; a query com uma data assim ou dá erro de SQL feio (Postgres rejeita
  data inválida) ou, pior, o Postgres podia interpretar de um jeito inesperado dependendo do modo —
  melhor recusar com 400 e mensagem clara antes de chegar na query.

## Review automático do Copilot (PR #55)

**1ª rodada** — 3 achados reais:

- **`?cohortSplitDate=` vazio (sem valor) escapava da validação** — `URLSearchParams.get()`
  devolve `''` (string vazia) pra `?cohortSplitDate=` sem valor depois do `=`; o teste de
  truthiness original (`if (cohortSplitDateParam) {...}`) tratava isso como "parâmetro ausente" em
  vez de "parâmetro fornecido mas inválido", devolvendo métricas globais em silêncio em vez do 400
  documentado. Corrigido comparando explicitamente contra `null`.
- **A CTE de retenção rodava duas vezes quando `cohortSplitDate` era passado** — uma vez pra
  retenção global (`d1Retention`/`d7Retention`/`newDevicesToday`), outra quase idêntica só pra
  comparação de coorte, dobrando o agrupamento/joins sobre `product_events` a cada relatório com
  coorte. Corrigido fundindo em UMA query só: valida `cohortSplitDate` (se fornecido) ANTES de
  rodar qualquer consulta, e a query única sempre calcula os campos `before_*`/`after_*` (baratos,
  `count(*) filter (where ...)` sobre CTEs já materializadas) — só são LIDOS de volta quando o
  parâmetro existe de verdade.
- **`isValidProductEventType` sem cobertura pros 3 eventos novos** — os testes cobriam
  `isValidIsoDateOnly` (a função nova), mas não confirmavam que `camera_recenter_used`/
  `cosmetic_equipped`/`planet_travel_completed` são aceitos pela allowlist — um typo no nome do
  evento (cliente e servidor usando o MESMO literal string, sem tipo compartilhado) passaria
  batido pela suíte, silenciosamente zerando a métrica nova pra sempre. 3 assertions novas
  adicionadas.
- **2 nits de documentação**: `FEATURES.md` contava 13 tipos de evento pré-existentes, mas eram 14
  (esquecia `house_visited`, lab-175); `docs/event-catalog.md` ainda dizia que `meta` só carrega
  números/`questId`, desatualizado depois dos 2 eventos novos com `meta` string (`slot`,
  `toPlanetId`) — corrigido pra deixar claro que são valores de um conjunto FIXO do código-fonte,
  nunca texto livre.

Verificação desta rodada: `npx tsc --noEmit` (server-accounts) limpo; `npm run test`
(server-accounts) 135/135 (1 novo). Reverificado ao vivo contra produção (`wrangler dev` porta
8791, banco real, só leitura): `?cohortSplitDate=` (vazio) confirmado devolvendo 400; sem o
parâmetro, `cohortComparison` confirmado ausente da resposta; `?cohortSplitDate=2026-09-01`
confirmado continuando a funcionar depois da fusão das duas queries em uma.

**2ª rodada** — "Comments generated: 0 new" no resumo, mas 7 achados substantivos nos "Suppressed
comments" (mesmo padrão já visto no lab-178: contagem de "novos" zerada não significa nada
acionável de verdade) — todos verificados contra o código real antes de decidir a correção, 7 reais:

- **Guardrail de agregação se contradizia** — o texto dizia que aparelho COMPARTILHADO E
  aparelho TROCADO/reinstalado "contam como dispositivos diferentes", mas são o OPOSTO: um
  aparelho compartilhado por irmãos é UM device_id só (subconta crianças distintas); só trocar de
  aparelho ou reinstalar CRIA um device_id novo (superconta a mesma criança). Corrigido o texto em
  `index.ts` (guardrails) pra distinguir os dois casos corretamente.
- **`isValidIsoDateOnly` quebrava pra anos de 2 dígitos** — `Date.UTC(year, ...)` interpreta anos
  0-99 como deslocamento a partir de 1900 (comportamento legado do construtor `Date`), então
  `'0050-01-01'` virava internamente 1950 e a comparação de ano batia por acidente/erro dependendo
  do caso. Corrigido construindo a data com um ano-base de 4 dígitos e usando `setUTCFullYear` pra
  setar o ano de verdade (sem essa interpretação especial). 2 casos de teste novos (`'0050-01-01'`,
  `'0099-12-31'`).
- **`meta.slot`/`meta.toPlanetId` não tinham validação nenhuma no servidor** — `handleTrackEvent`
  só valida `meta` pra `session_end` (`durationMs`, desde o lab-99); os outros tipos, incluindo os
  2 novos deste lab, gravavam `meta` como veio do client sem checar o valor, contradizendo a
  própria afirmação do `docs/event-catalog.md` de que são "valores de um conjunto FIXO... nunca
  texto livre". Corrigido com 2 funções puras novas em `domain.ts`
  (`isValidCosmeticSlot`/`isValidDestinationPlanetId`, allowlist de 7 valores cada, com testes) e 2
  branches novos em `handleTrackEvent`, mesmo padrão já usado pro `durationMs` implausível: valor
  fora do allowlist grava o evento com `meta: null` em vez de recusar o evento inteiro (verificado
  ao vivo contra produção, ver abaixo).
- **Typo no comentário SQL** — "e' o acumulado" devia ser "é o acumulado" (apóstrofo escapando
  sem querer o significado). Corrigido.
- **`cameraRecenterUsed` mede alcance, não frequência** — `weeklyDevices()` conta dispositivos
  ÚNICOS com pelo menos 1 evento na semana; o backlog original do Lab 178 queria medir "menor uso
  repetido" (frequência). Decisão (sancionada como alternativa aceitável pelo próprio review): só
  documentar a limitação num comentário perto de `weeklyFunnel.cameraRecenterUsed`, sem construir
  uma métrica de contagem nova — o sinal de alcance já resolve a pergunta mais urgente ("a câmera
  tá sendo usada?"), frequência fica pra quando isso virar decisão de produto de verdade.
- **`cosmetic_equipped` disparava ao VOLTAR pro padrão em 5 dos 7 slots** — a decisão documentada
  era "nunca ao voltar pro padrão", mas só `equipHat`/`equipGlasses` tratam `null` como o único
  "padrão" (têm uma opção real "Nenhum" na UI). Pros 5 eixos de cor/cabelo
  (`ColorSection`/`HairShapeSection` em `AvatarShop.tsx`), o PRÓPRIO item padrão do catálogo (custo
  0, não-assinatura, sempre a primeira entrada) tem um `id` real e não-nulo — reequipar essa cor
  depois de ter trocado por outra chamava `equip*Color(idDoPadrao)`, não `equip*Color(null)`, e o
  guard antigo (`if (id) trackCosmeticEquipped(...)`) via isso como "equipou um cosmético novo".
  Corrigido em `useProfile.ts`: nova função `isCatalogDefault` compara o `id` contra o catálogo real
  (`PANTS_COLOR_CATALOG`/`SHOE_COLOR_CATALOG`/`BACKPACK_COLOR_CATALOG`/`SHIRT_COLOR_CATALOG`/
  `HAIR_SHAPE_CATALOG`, importados de `data/customization.ts`) — o disparo do evento agora exclui
  esse caso, sem mudar o que é persistido em `equippedXxxId`.
- **Doc de privacidade fazia uma alegação não enforçada** — `docs/event-catalog.md` já dizia que
  `slot`/`toPlanetId` são "um conjunto FIXO... nunca texto livre", mas isso só era verdade no
  client, não no servidor (achado anterior). Corrigido junto com a validação: o parágrafo agora
  explica que a garantia é enforçada em `handleTrackEvent`, com o mesmo tratamento de "grava com
  `meta: null`" já usado desde o lab-99. A linha da tabela de `cosmetic_equipped` também foi
  ajustada pra descrever a condição real de "voltar pro padrão" (não só `id === null`).

Verificação desta rodada: `npx tsc --noEmit` (server-accounts) e `npx tsc -b` (app) limpos;
`npm run test` server-accounts 140/140 (5 novos: 2 casos de ano de 2 dígitos, 4 casos entre
`isValidCosmeticSlot`/`isValidDestinationPlanetId`), app 178/178 (inalterado — mudança em
`useProfile.ts` é só uma condição a mais antes de uma chamada já testada indiretamente via
integração, sem lógica nova isolável além do que os testes de domínio já cobrem). Reverificado ao
vivo contra produção (`wrangler dev` porta 8792, banco real): `POST /events` com
`meta.slot`/`meta.toPlanetId` válidos gravou o valor normalmente; com valores fora do allowlist
(incl. um payload tipo `<script>`) gravou `meta: null` e ainda devolveu 204 (evento não recusado,
mesmo padrão do `durationMs` implausível) — confirmado lendo as linhas de volta direto do banco
antes de apagá-las; `GET /admin/metrics` sem parâmetro e com `?cohortSplitDate=2026-09-01`
continuam respondendo exatamente como antes (guardrails com o texto corrigido, cohort comparison
com a mesma soma exata de antes); data malformada/vazia confirmadas devolvendo 400.

**3ª rodada** — "Comments generated: 3" no resumo + 5 achados nos "Suppressed comments" (8 no
total) — todos verificados antes de corrigir, 8 reais:

- **`isValidIsoDateOnly` aceitava ano `0000`, que o Postgres recusa como `::date`** — JS aceita ano
  0 numa `Date` de boa (`getUTCFullYear()` devolve 0 sem erro), então `'0000-01-01'` passava na
  validação e só quebrava depois, na query, com um erro de SQL feio em vez do 400 documentado.
  Confirmado direto contra o banco de produção (`select '0000-01-01'::date` → "date/time field
  value out of range") antes de corrigir. Corrigido com uma checagem explícita `year === 0` antes
  da reconstrução via `Date`/`setUTCFullYear`. 2 casos de teste novos.
- **Os 8 campos `before_*`/`after_*` da query de retenção rodavam SEMPRE**, mesmo sem
  `cohortSplitDate` (viravam `filter (where day0 < NULL::date)`, sempre 0, mas ainda liam as CTEs
  de novo) — desperdício no caminho mais comum (relatório sem coorte). Esse achado parecia
  contradizer o da 1ª rodada ("não rode a CTE duas vezes"), mas não são incompatíveis: a correção é
  ter DOIS textos de query possíveis (um simples, um com os campos de coorte), escolhidos por
  `if (cohortSplitDateParam === null)`, com cada request rodando exatamente UM deles — nunca dois
  round-trips pro mesmo request, e o caminho sem coorte não paga mais pelos campos que nem vai ler.
- **`safeMeta` gravava o objeto `meta` INTEIRO mesmo com `slot`/`toPlanetId` válidos** — um payload
  tipo `{ slot: 'hat', note: '<script>...' }` passava a validação (que só olhava `slot`) e gravava
  a chave `note` extra e não documentada junto. Corrigido construindo um objeto novo só com a
  chave permitida (`{ slot: metaObj.slot }`/`{ toPlanetId: metaObj.toPlanetId }`) em vez de
  reaproveitar `metaObj` inteiro — verificado ao vivo lendo a linha de volta do banco (só `slot`
  sobrou, `note` sumiu).
- **Doc de privacidade generalizava demais "ENFORÇADA no servidor"** — o parágrafo da 2ª rodada
  dava a entender que TODO `meta` documentado como "conjunto fixo" é validado no servidor, mas
  `questId` de `quest_completed` nunca teve validação nenhuma (confirmado grepando `handleTrackEvent`
  por `questId` — zero ocorrências). Corrigido pra escopar a palavra "ENFORÇADA" só aos 3 campos que
  realmente são validados (`durationMs`, `slot`, `toPlanetId`) e declarar `questId`/demais `meta`
  como dívida conhecida, não garantia.
- **Bullet de "Câmera" no catálogo repetia a confusão reach-vs-frequência** que já tinha sido
  corrigida só no comentário de código (`index.ts`), não no doc — `docs/event-catalog.md` ainda
  dizia "uso repetido do botão ⟲" como se `weeklyFunnel.cameraRecenterUsed` medisse frequência.
  Corrigido pra explicar a mesma limitação (alcance, não frequência) também no catálogo.
- **`FEATURES.md` ainda contava "3 casos de teste" pra `isValidIsoDateOnly`**, defasado depois dos
  casos adicionados nas rodadas 2 e 3 (já eram 5 blocos de teste: os 3 originais + 1 de ano de 2
  dígitos da rodada 2 + 1 de ano 0000 desta própria rodada). Corrigido pra 5 — a correção original
  desta rodada tinha dito "4" por engano (esqueceu de contar o próprio teste do ano 0000 que estava
  sendo adicionado no mesmo commit), erro capturado e corrigido só na rodada seguinte.
- **`labs/CURRENT.md` e a própria seção "Estado do repositório ao final" deste `CONTEXT.md`
  citavam `server-accounts 134/134 (3 novos)`**, o número da 1ª rodada — defasado depois dos testes
  adicionados nas rodadas 2 e 3 (141/141 no final). Como `CURRENT.md` é o handoff que o próximo
  laboratório lê primeiro, um número velho podia levar a um diagnóstico errado do estado dos
  testes. Ambos corrigidos pro número final.

Verificação desta rodada: `npx tsc --noEmit` (server-accounts) limpo; `npm run test`
(server-accounts) 141/141 (1 novo: ano 0000). Reverificado ao vivo contra produção (`wrangler dev`
porta 8793, banco real): `'0000-01-01'::date` confirmado quebrando no Postgres (motivo do achado);
`?cohortSplitDate=0000-01-01` agora devolve 400 em vez de deixar a query estourar; `POST /events`
com `meta: { slot: 'hat', note: '<script>evil</script>' }` gravou só `{ slot: 'hat' }` (confirmado
lendo a linha de volta do banco antes de apagá-la); `GET /admin/metrics` sem parâmetro e com
`?cohortSplitDate=2026-09-01` devolveram exatamente os mesmos números de antes da refatoração da
query (76/47/123 de novo), confirmando que os dois textos de query (com/sem coorte) continuam
equivalentes ao antigo query único nos dois casos.

**4ª rodada** — "Comments generated: 0 new" + 2 achados nos "Suppressed comments", 2 reais:

- **Evento com `slot`/`toPlanetId` inválido ainda inflava `weeklyFunnel`** — a correção da 3ª
  rodada gravava `meta: null` pra um valor inválido, mas ainda INSERIA o evento; `weeklyDevices()`
  conta por `event_type` sem olhar `meta`, então um payload malformado ainda incrementava
  `cosmeticEquipped`/`planetTravelCompleted` — a validação protegia o CONTEÚDO gravado, não a
  MÉTRICA, que era o ponto todo. Diferença chave em relação a `session_end` (onde só o campo
  suspeito é descartado, evento mantido): pra `session_end`, "sessão terminou" é um sinal válido
  mesmo com duração implausível; pra `cosmetic_equipped`/`planet_travel_completed`, o slot/planeta
  É o sinal inteiro — não existe uma versão "válida mas sem slot" desses dois eventos, e nenhum
  client oficial (`productAnalytics.ts`) jamais manda um sem valor. Corrigido: agora RECUSA o
  evento inteiro (400) quando `slot`/`toPlanetId` é inválido, antes de decidir `safeMeta`, em vez
  de aceitar com `meta: null` — comportamento novo só afeta payload malformado/malicioso, nunca
  telemetria real.
- **Contagem de testes "9 novos" na seção final estava errada** — a soma certa (conferida via
  `git diff` do `domain.test.ts` inteiro contra o commit inicial do lab) é 10 blocos `it` novos,
  não 9 (a subconta de `isValidIsoDateOnly` tinha ficado em "4 blocos" quando na verdade são 5 —
  esqueceu de contar o próprio teste do ano 0000 adicionado nesta mesma rodada). Corrigido pra
  listar a contagem exata por função (1+5+2+2=10) em vez de um número solto fácil de dessincronizar
  de novo — e a descrição da PR (que ainda citava o número da 1ª rodada, 134/134) também foi
  atualizada pra bater com o resultado final.

Verificação desta rodada: `npx tsc --noEmit` (server-accounts) limpo; `npm run test`
(server-accounts) 141/141 (sem teste novo — o comportamento novo é em `handleTrackEvent`, I/O puro
sem lógica isolável, mesmo padrão do resto do endpoint; verificado ao vivo em vez de unitário).
Reverificado ao vivo contra produção (`wrangler dev` porta 8794, banco real): `cosmetic_equipped`
com `slot` inválido ou ausente → 400 (antes: 204 com `meta: null`); `planet_travel_completed` com
`toPlanetId` inválido → 400; os mesmos dois eventos com valores VÁLIDOS continuam 204 e gravando só
a chave permitida; confirmado lendo a tabela de volta que SÓ os 2 eventos válidos foram inseridos
(os 3 payloads rejeitados nunca viraram linha).

**5ª rodada** — puramente de documentação: as correções de contagem de teste da própria 3ª/4ª
rodada continuaram introduzindo novos números errados em novos lugares (efeito chicote: cada
correção tocava um trecho e deixava outro pra trás) — 5 achados, todos reais:

- **`docs/event-catalog.md` ainda documentava `slot`/`toPlanetId` com o MESMO tratamento de
  `durationMs`** ("grava com `meta: null`, nunca recusa o evento inteiro") — desatualizado desde a
  correção da 4ª rodada, que passou a RECUSAR o evento inteiro (400) pra esses dois campos
  especificamente. Corrigido pra descrever os dois comportamentos separadamente, com o porquê da
  diferença (session_end tem um sinal válido sem duração confiável; cosmetic_equipped/
  planet_travel_completed não têm sinal nenhum sem o slot/planeta).
- **`labs/CURRENT.md` ainda dizia "3 rodadas" e "9 novos"** — o handoff não tinha acompanhado nem a
  4ª rodada (que já tinha corrigido a contagem noutro arquivo) nem a 5ª que estava em andamento.
  Corrigido pra "10 novos" com a subconta explícita por função, e trocado "3 rodadas" por uma
  referência sem número fixo (aponta pro histórico completo no `CONTEXT.md`) — pra não continuar
  ficando defasado a cada rodada nova.
- **A narrativa "O que foi feito" (bem no topo deste `CONTEXT.md`) ainda tinha "3 casos de teste"
  pra `isValidIsoDateOnly`** — um número solto duplicado da contagem "oficial" mais abaixo, achado
  de raiz do problema: ter o MESMO número escrito em mais de um lugar do mesmo documento é o motivo
  de continuar dessincronizando a cada rodada. Corrigido removendo o número duplicado dali (deixa
  só um lugar — "Estado do repositório ao final" — como fonte da verdade da contagem de testes).
- **O próprio registro da correção da 3ª rodada (neste `CONTEXT.md`) dizia "já eram 4 blocos"**,
  mas o número certo nesse ponto já era 5 (a correção da 3ª rodada tinha, ela mesma, esquecido de
  contar o teste do ano 0000 que estava sendo adicionado no mesmíssimo commit). Corrigido.
- **`FEATURES.md` ainda dizia "4 blocos de teste"**, mesmo erro de origem do achado anterior,
  propagado pro checklist. Corrigido pra 5.

Verificação desta rodada: contagem re-conferida com o comando real (`awk` isolando cada bloco
`describe` em `domain.test.ts` e contando `it(` dentro dele) em vez de contar de cabeça de novo —
`isValidIsoDateOnly` 5, `isValidCosmeticSlot` 2, `isValidDestinationPlanetId` 2, mais 1 em
`isValidProductEventType` = 10, batendo com `npm run test` 141/141 (baseline 131 + 10). `npx tsc
--noEmit` limpo (mudança é só em 4 arquivos de documentação/handoff, nenhum código).

**6ª rodada** — 2 achados reais, um deles o mais substancial de todas as rodadas:

- **`occurredAt` é 100% controlado por um client anônimo e não autenticado, sem NENHUMA validação
  de plausibilidade** — `handleTrackEvent` só confere que é uma string; esse mesmo campo alimenta
  `min(occurred_at)` = `day0` de TODO cálculo de retenção, incluindo os dois novos deste lab
  (`newDevicesToday`/`cohortComparison`). Um client malicioso podia criar um `device_id` novo e
  mandar um `occurredAt` de anos atrás pra forjar entrada/retorno numa coorte antiga, inflando D0/
  D1/D7 e a comparação antes/depois à vontade — o tipo de achado que fica mais valioso de explorar
  justamente PORQUE este lab deu mais visibilidade/uso a `day0`. Também não é totalmente novo (D1/
  D7 já confiavam em `occurredAt` desde o lab-99), mas nenhum lab anterior tinha mexido nisso.
  Considerei 2 abordagens: (a) coluna `received_at` nova (carimbo do servidor, ignora o que o
  client alega) — exigiria migração e trocar toda a base de cálculo de retenção/funil semanal por
  uma coluna diferente, escopo bem maior; (b) janela de plausibilidade (recusar o evento se
  `occurredAt` estiver fora de um intervalo pequeno ao redor de "agora") — bem mais barata. Escolhi
  (b) depois de confirmar em `productAnalytics.ts` que `trackEvent` SEMPRE manda
  `new Date().toISOString()` no instante exato da chamada (sem fila offline, sem reenvio tardio por
  design) — um client honesto nunca precisa de uma janela ampla, só o suficiente pra cobrir relógio
  de aparelho desconfigurado. Implementado: `isPlausibleOccurredAt` (`domain.ts`, nova função pura,
  6 casos de teste) com janela de 48h pra trás / 10min pra frente; `handleTrackEvent` recusa o
  evento inteiro (400) fora dessa janela, antes até da checagem de tipo de evento. Fecha o exploit
  descrito (fabricar `day0` de anos atrás) sem reescrever a base de cálculo já existente.
- **Contagem de testes "após as 4 rodadas" no `CONTEXT.md` contradizia a própria 5ª rodada
  documentada mais abaixo** — mesmo efeito chicote das rodadas anteriores (corrigir a contagem num
  lugar sem sincronizar outro). Corrigido removendo o número de rodadas fixo (trocado por "várias
  rodadas", sem contagem — a mesma lição já aplicada ao `CURRENT.md` na rodada anterior, agora
  aplicada aqui também) e atualizando os números pro estado realmente final (147/147, 16 novos, com
  a subconta de `isPlausibleOccurredAt` incluída).

Verificação desta rodada: `npx tsc --noEmit` limpo; `npm run test` 147/147 (6 novos:
`isPlausibleOccurredAt`). Reverificado ao vivo contra produção (`wrangler dev` porta 8795, banco
real): `occurredAt` de 2020 e de 2030 confirmados devolvendo 400 e NUNCA virando linha na tabela
(lido de volta do banco antes de apagar); um evento com `occurredAt` real (agora) continua 204 e
grava normalmente; `GET /admin/metrics` continua respondendo normalmente depois da mudança
(`newDevicesToday`/`totalDevices` bateram com o esperado).

**7ª rodada** — a mais substancial de todas: a "solução" da 6ª rodada (janela de plausibilidade)
tinha ficado incompleta, mais 5 achados de documentação — 6 reais no total:

- **A janela de 48h da 6ª rodada não fechava o exploit de verdade** — um client ainda podia mandar
  um evento com `occurredAt` de "ontem" (dentro da janela de 48h, aceito) pra um `device_id` NOVO, e
  logo em seguida outro evento com `occurredAt` de "agora" — como `day0` vinha de
  `min(occurred_at)`, isso fabricava `day0 = ontem` pro dispositivo, e o segundo evento contava
  IMEDIATAMENTE como "retorno D1", sem a criança ter voltado de verdade (os dois eventos aconteceram
  segundos um do outro). Pior ainda: **`product_events.received_at` (carimbo do SERVIDOR,
  `default now()`) já existia desde `migrations/0001_baseline.sql` — a justificativa da 6ª rodada
  pra não usá-lo ("exigiria migração") estava simplesmente ERRADA**, um achado de raiz que também
  invalidava parte do raciocínio anterior. Corrigido de vez: `handleAdminMetrics` agora usa
  `received_at`, não `occurred_at`, pra `day0`/D1/D7/`cohortComparison`/janela semanal do
  `weeklyFunnel` — como `received_at` é sempre o instante REAL em que o servidor recebeu a
  requisição, os dois eventos do exemplo acima teriam `received_at` idênticos (segundos um do
  outro), então `day0` seria HOJE pros dois, nunca "ontem" — fecha o exploit de verdade, sem
  depender de nenhuma janela de plausibilidade. Confirmado ao vivo (ver abaixo) reproduzindo
  exatamente esse cenário: `occurred_at` mentindo "ontem", `received_at` mostrando a hora real.
  `isPlausibleOccurredAt` (6ª rodada) continua existindo como uma segunda camada de sanidade sobre o
  campo que o client alega (não mais a defesa principal) — reescrevi os comentários em `domain.ts`/
  `index.ts` pra deixar claro qual campo faz o quê agora.
- **Abuso residual: `device_id` continua sem autenticação nenhuma** — mesmo com `received_at`,
  nada impede gerar UUIDs novos à vontade pra inflar `newDevicesToday`/alcance. O revisor
  corretamente separou isso como um problema DIFERENTE (Sybil/anti-abuso, não fabricação de
  timestamp) — decidido documentar como pendência aceita (ver seção abaixo) em vez de construir
  prova-de-dispositivo-real, desproporcional pro volume/risco atual.
- **`docs/event-catalog.md` dizia que `player_identities` "não está amarrado a nenhum evento" —
  garantia de privacidade incorreta**: a migração 0005 grava o MESMO `device_id` de
  `product_events` em `player_identities`, então um admin com acesso ao banco PODE, em tese, fazer
  join e correlacionar um apelido com o histórico de eventos anônimos — nenhum CÓDIGO faz esse join
  hoje, mas a garantia documentada era sobre os DADOS, não sobre o código. Corrigido pra distinguir
  "nenhum endpoint expõe isso" de "impossível de correlacionar" (a segunda afirmação era falsa).
- **`docs/event-catalog.md` não documentava a existência/papel de `received_at`** — a linha que
  descreve as colunas de `product_events` só citava `occurred_at`. Corrigido, explicando a
  distinção client-alega vs. servidor-carimba e qual métrica usa qual campo agora.
- **Descrição da PR e `CONTEXT.md` ainda citavam `141/141`/10 novos**, defasado desde a 6ª rodada
  (que já tinha ficado sem sincronizar a descrição da PR de novo — a mesma lição da 5ª rodada não
  tinha "pegado" na 6ª). Corrigido pra 147/147, 16 novos, e a descrição da PR atualizada de novo.

Verificação desta rodada: `npx tsc --noEmit` limpo; `npm run test` 147/147 (sem teste novo — a
mudança é só qual coluna a query usa, I/O puro). Reverificado ao vivo contra produção (`wrangler
dev` porta 8796, banco real): reproduzido o cenário exato do achado (evento 1 com `occurredAt` de
~20h atrás, evento 2 com `occurredAt` de agora, mesmo `device_id`) — confirmado lendo a tabela de
volta que `received_at` dos dois ficou a menos de 1 segundo de diferença (a hora REAL em que os
dois chegaram), enquanto `occurred_at` continuava mostrando a mentira de "ontem" — ou seja, `day0`
calculado a partir de `received_at` dá HOJE pros dois eventos, não mais "ontem" como daria com
`occurred_at`; `GET /admin/metrics` sem parâmetro e com `?cohortSplitDate=2026-09-01` devolveram
exatamente os mesmos números de sempre (76/47/123), confirmando que a troca de coluna não muda
nada pra tráfego real (onde `occurred_at` e `received_at` já são essencialmente o mesmo instante).

**8ª rodada** — 3 achados reais + 1 incidente operacional descoberto durante a correção:

- **Faltava índice em `received_at`** — a troca de `occurred_at` pra `received_at` (7ª rodada)
  deixou a janela semanal do `weeklyFunnel` e as CTEs de retenção sem nenhum índice que sirva
  (só existiam `idx_product_events_occurred_at`/`idx_product_events_device_occurred`, ambos sobre a
  coluna ERRADA agora), forçando scan da tabela inteira — exatamente o mesmo problema que
  `idx_product_events_occurred_at` já tinha resolvido pra `occurred_at` no lab-165 (PR #39).
  Corrigido com `migrations/0011_product_events_received_at_index.sql` (2 índices novos:
  `idx_product_events_received_at` simples pra janela semanal, `idx_product_events_device_received`
  composto pra CTE de retenção). Confirmado com `EXPLAIN` que a query agora usa
  `Index Scan using idx_product_events_received_at` em vez de sequential scan.
- **`guardrails` no JSON não avisava sobre `device_id` sintético** — a pendência documentada na 7ª
  rodada (device_id sem autenticação, `newDevicesToday`/alcance semanal infláveis) só existia no
  `CONTEXT.md`, não na própria resposta da API — que é o lugar que `guardrails` existe pra cobrir
  ("quem só consome a API sem abrir o catálogo"). Adicionado um 3º guardrail no JSON.
- **Garantia de privacidade no TOPO do `docs/event-catalog.md` (linhas 33-34) contradizia a
  correção da 7ª rodada mais abaixo** — o topo continuava dizendo "sem NENHUM vínculo com
  nome/apelido/e-mail/família", mesma alegação incorreta que já tinha sido corrigida na seção
  "Nível de agregação" (`player_identities` compartilha `device_id`, então É correlacionável via
  join por quem tem acesso ao banco). Corrigido pra dizer "nenhum PAYLOAD/ENDPOINT" em vez de
  "nenhum vínculo", com referência cruzada pra seção que já explica a ressalva completa.
- **Incidente operacional descoberto ao aplicar a migração 0011**: `npm run migrate` processa TODO
  arquivo em `migrations/`, sem checar se está rastreado pelo git — e um arquivo `.sql` de um
  experimento abandonado de OUTRA sessão (`0007_player_appearance.sql`, deixado como arquivo solto
  depois de um `git stash pop` acidental documentado mais cedo nesta mesma sessão) ainda estava no
  diretório. `npm run migrate` aplicou os DOIS arquivos de uma vez, adicionando 7 colunas órfãs
  (`equipped_hat_id`, `equipped_glasses_id`, `equipped_shirt_color_id`, `equipped_pants_color_id`,
  `equipped_shoe_color_id`, `equipped_backpack_color_id`, `equipped_hair_shape_id`) a
  `player_identities` EM PRODUÇÃO — nenhuma delas usada por código nenhum (confirmado por busca em
  `src/`; a implementação de verdade do lab-163 usa uma coluna `equipped_look jsonb` única,
  `0007_player_public_profile.sql`, já mesclada antes). Sempre `NULL`, zero impacto funcional, mas
  ainda assim uma mutação de schema de produção não revisada/não intencional. Confirmado com o
  usuário (`AskUserQuestion`) antes de corrigir: removido o arquivo solto do diretório, escrita
  `migrations/0012_drop_orphan_appearance_columns.sql` (`drop column if exists` nas 7 colunas,
  seguro por serem confirmadamente não-lidas por nenhum código) e aplicada — schema de
  `player_identities` verificado de volta ao estado correto (11 colunas, batendo com
  `0007_player_public_profile.sql` + `0010_player_house_visit.sql`).

Verificação desta rodada: `npx tsc --noEmit` limpo; `npm run test` 147/147 (sem teste novo — índice
de banco e string de guardrail, nada testável por unidade). Reverificado ao vivo contra produção
(`wrangler dev` porta 8797, banco real): `EXPLAIN` confirmou o novo índice sendo usado pela query
semanal; `GET /admin/metrics` respondeu normalmente com o guardrail novo presente; schema de
`player_identities` conferido via `information_schema.columns` — 11 colunas, nenhuma órfã; índices
de `product_events` conferidos via `pg_indexes` — os 2 novos (`idx_product_events_received_at`,
`idx_product_events_device_received`) presentes ao lado dos 3 já existentes.

## Pendências / dívidas conhecidas

- **Agregação por device, não por criança, continua sem solução real** — decisão explícita de
  escopo (ver "Fora de escopo" no `FEATURES.md`): resolver isso amarrando eventos a
  `player_identities` é uma mudança de arquitetura maior, não um catálogo/instrumentação. Impacto
  prático: os 3 eventos novos deste lab herdam a MESMA imprecisão já aceita pro resto do funil.
- **`device_id` é gerado e escolhido inteiramente pelo client, sem autenticação nenhuma** (achado
  da 7ª rodada do review da PR #55) — mesmo depois de trocar a base de cálculo pra `received_at`
  (fecha a fabricação de `day0`/retorno com timestamp forjado), nada impede um script malicioso de
  gerar um UUID novo a cada requisição e inflar `newDevicesToday`/alcance semanal com dispositivos
  sintéticos que nunca existiram de verdade — o `EVENTS_LIMITER` (rate limit por IP) limita a
  VELOCIDADE desse abuso, não a possibilidade dele. Resolver isso de verdade exigiria algum tipo de
  prova de dispositivo real (proof-of-work, atestação, ou exigir uma sessão autenticada antes de
  contar um device novo) — desproporcional pro volume/risco atual deste jogo (`GET /admin/metrics`
  já é protegido por segredo e lido manualmente, não alimenta nenhuma decisão automática/financeira
  hoje). Mesma categoria de limitação estrutural do item anterior (agregação imprecisa por
  natureza do modelo anônimo) — documentado, não resolvido, coerente com a decisão de escopo já
  tomada pra "agregação por device" acima.
- **`activated_at` de assinatura continua sem coluna própria** (pendência do lab-165, não deste
  lab) — `weeklyCommercial` não tem "assinaturas ativadas na semana" por esse motivo, inalterado.
- **Lab 179 (Planetas interativos v1) vai precisar de eventos PRÓPRIOS de interação** —
  `planet_travel_completed` mede só a CHEGADA, não o que a criança faz depois de chegar (NPC,
  mini-puzzle, coletável) — registrado explicitamente como fora de escopo deste lab.
- **`questId` de `quest_completed` (e o `meta` de todo evento fora de `session_end`/
  `cosmetic_equipped`/`planet_travel_completed`) não tem validação de conteúdo no servidor**
  (achado da 3ª rodada do review da PR #55) — gravado como o client mandar, sem checar contra o
  catálogo público de missões. Pré-existente desde antes deste lab (não introduzido aqui), mas
  ficou mais visível pelo contraste com os 3 campos que este lab passou a validar de verdade.
  Resolver isso de vez exigiria uma allowlist de `questId`s conhecidos (parecida com
  `isValidCosmeticSlot`/`isValidDestinationPlanetId`) — não fica em escopo aqui.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 6 funcionalidades planejadas em `FEATURES.md` foram concluídas e verificadas ao vivo
contra produção (leitura) e num navegador real (os 3 eventos novos).

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md` (seção 12), o
próximo item é o **Lab 179 — Planetas interativos v1** (P0): pelo menos 3 interações por planeta
existente (NPC com fala catalogada, objeto acionável, mini-puzzle ambiental, coletável ou segredo
visual), instrumentadas com eventos próprios (não reaproveitar `planet_travel_completed`, que este
lab deixou medindo só a chegada), sem texto livre/UGC.

## Estado do repositório ao final

- Branch: `lab-185-medicao-coortes`.
- `npx tsc -b` (app) e `npx tsc --noEmit` (server-accounts): limpos. `npm run test` (estado FINAL,
  após as várias rodadas de review automático do Copilot na PR #55 — número sempre conferido
  programaticamente contra `git diff` do `domain.test.ts` inteiro, nunca de cabeça, depois de mais
  de uma rodada pegando esse tipo de erro de contagem): app 178/178 (inalterado, mudança
  client-side é só uma condição a mais antes de uma chamada já existente, sem lógica nova
  isolável); server-accounts 147/147, 16 testes novos desde o início do lab (baseline 131) — 1 em
  `isValidProductEventType` (allowlist aceita os 3 eventos novos), 5 em `isValidIsoDateOnly` (data
  real/bissexta, formato/calendário inválido, anos de 2 dígitos, ano 0000), 2 em
  `isValidCosmeticSlot`, 2 em `isValidDestinationPlanetId`, 6 em `isPlausibleOccurredAt`.
  `npm run build` (app): limpo, sem regressão de bundle.
- **2 migrações novas, ambas adicionadas pelo review da PR #55 (não fazem parte do escopo original
  planejado, que de fato não precisava de nenhuma — `product_events` já tinha as colunas
  necessárias)**: `0011_product_events_received_at_index.sql` (2 índices em `received_at`, 8ª
  rodada) e `0012_drop_orphan_appearance_columns.sql` (limpeza de um incidente operacional não
  relacionado a este lab — ver "Review automático do Copilot" 8ª rodada abaixo para o histórico
  completo). Ambas aplicadas em produção via `npm run migrate` e verificadas.
- **Verificado ao vivo contra produção** (`wrangler dev` local, porta 8790, banco de PRODUÇÃO
  real, só leitura): `GET /admin/metrics` respondeu com `newDevicesToday`/`weeklyFunnel` (3 chaves
  novas, todas 0 — nenhum evento novo em produção ainda, esperado) e `guardrails`;
  `?cohortSplitDate=2026-09-01` devolveu `before.d1.eligibleDevices` (76) + `after.d1.eligibleDevices`
  (47) = 123, EXATAMENTE igual a `totalDevices` (123) — confirma que o split cobre o conjunto
  inteiro sem sobra nem duplicata; `?cohortSplitDate=2026-99-99` confirmado devolvendo 400.
- **Verificado ao vivo num navegador real** (Chrome via automação, `npm run dev` local, perfil de
  teste já existente): os 3 eventos novos capturados via monkey-patch de `window.fetch` —
  `camera_recenter_used` no clique do botão ⟲; `cosmetic_equipped` (`meta.slot: "hat"`) ao equipar
  um boné pela lojinha real; `planet_travel_completed` (`meta.toPlanetId: "marte"`) numa viagem de
  foguete completa (embarcar via tecla E perto do foguete, decolar, pousar — cartão-postal "Novo
  cartão-postal: Saudações de Marte!" confirmado na tela). Nenhum erro de console em nenhum
  momento dos testes.
