# Contexto — Laboratório 182 — Eventos semanais saudáveis

Preenchido em: 2026-09-13
Commit inicial → final: eb1b75a4d3495bcc2b90030a75f51ea852146135..(commit deste lab, ver PR)

## O que foi feito

- Campo novo em `Progress` (`weeklyEventObjectiveRewardedAtIso: string | null`, `types.ts` +
  default `null` em `storage.ts`) — guarda o INSTANTE ISO completo (`toISOString()`, não uma chave
  de semana) da última vez que o bônus foi pago, não um contador: o limiar é "pelo menos 1" desafio
  ambiental, então basta saber SE já foi pago pra ser idempotente. Guardar o instante completo (em
  vez de só a chave de semana) permite comparação cronológica de verdade contra manipulação de
  relógio — ver rodada 8 do review abaixo.
- `data/weeklyEvents.ts` ganhou 3 constantes novas (única fonte de verdade de rotação/bônus/copy,
  como o backlog pede): `WEEKLY_EVENT_OBJECTIVE_REWARD_COINS` (20), `WEEKLY_EVENT_OBJECTIVE_DESCRIPTION`,
  `WEEKLY_EVENT_NO_PRESSURE_MESSAGE`.
- Três funções puras novas em `state/progression.ts`: `applyWeeklyEventObjectiveProgress(progress, nowIso)`
  (credita a moeda e marca o instante na primeira vez; idempotente depois),
  `isWeeklyEventObjectiveDone(progress, nowIso)` (leitura pura pra UI — mesma semana ISO do último
  pagamento) e `wouldGrantWeeklyEventObjectiveReward(progress, nowIso)` (a decisão de "concede ou
  não" fatorada numa função só, reaproveitada pela escrita acima E pelo pré-check síncrono de
  `useProgress.ts` — ver rodada 9 do review abaixo).
- `weeklyEventObjectiveProgress(nowIso)` novo em `state/useProgress.ts`, chamado de
  `handleEnvironmentalChallengeCorrect` (`App.tsx`) logo depois de `completeQuest(...)` — qualquer
  um dos 3 desafios ambientais do lab-180 (ponte/lógica, abastecimento de foguete/matemática,
  placa/leitura) conta, já que todos passam por esse mesmo handler.
- `RewardToast.tsx` ganhou uma linha de bônus opcional (`weeklyEventObjectiveBonusCoins`, mesmo
  padrão de `planetClearBonusCoins`) — "🌱 Objetivo da semana concluído! +20 moedas bônus!" no
  momento exato em que o bônus é concedido.
- Badge do evento semanal (`HudHeader.tsx`, `.weekly-event-badge`) virou um `<button>` clicável (sem
  aumentar a fileira de ~11 ícones do HUD) abrindo `components/WeeklyEventPanel.tsx` (novo, mesmo
  padrão de `DailyLoginToast.tsx`, reaproveita `.reward-modal`/`.reward-icon`/`.reward-bonus-line`;
  `.weekly-event-modal` em `index.css` é a única classe nova, `max-height`/`overflow-y` pra caber
  em telas curtas — ver rodada 3 do review abaixo): nome/emoji/descrição do evento ativo, status do
  objetivo (pendente com a descrição+recompensa, ou "✓ concluído, já ganhou X moedas") e a mensagem
  de "sem problema se não der tempo — sempre grátis".
- `components/FamilyPortal.tsx`, seção "📚 Aprendizagem sempre grátis" (lab-166) ganhou uma frase
  confirmando que o bônus do evento semanal também é sempre grátis, sem criar seção nova.
- Evento novo `weekly_event_objective_completed` (sem `meta`) — allowlist em
  `server-accounts/src/domain.ts`, branch explícito em `index.ts` (mesmo padrão de
  `camera_recenter_used`, não herda a tolerância de `meta` livre dos eventos legados),
  `weeklyFunnel.weeklyEventObjectiveCompleted`.
- `docs/event-catalog.md` atualizado com a linha do evento novo e uma nota explicando que "retorno
  semanal" já é coberto pela infraestrutura D1/D7 existente e "feedback qualitativo infantil" é
  pesquisa com usuário real, fora de escopo de código.
- Testes: 7 novos em `progression.test.ts` (concede na 1ª vez, idempotente na mesma semana, concede
  de novo numa semana nova, `isWeeklyEventObjectiveDone` reflete o estado real, perfil vazio nunca
  mostra concluído, regressão do ataque de adiantar-e-voltar o relógio, `wouldGrantWeeklyEventObjectiveReward`
  nunca diverge de `applyWeeklyEventObjectiveProgress`) e 1 novo em `server-accounts/src/domain.test.ts`.
  Suíte completa ao final: app 204/204, server-accounts 149/149, `tsc -b`/`tsc --noEmit` e
  `npm run build` limpos.

## Decisões técnicas tomadas

- **Reaproveitar os 3 desafios ambientais do lab-180 como o "objetivo educativo/ambiental" do
  backlog, em vez de criar conteúdo novo.** Já são sempre disponíveis, nunca esgotam (sorteiam
  pergunta aleatória do tipo certo a cada abertura) e o próprio nome do backlog ("educativo/
  ambiental") já batia com o tema. Zero conteúdo/pergunta nova precisou ser escrita.
- **Recompensa em moeda grátis, não item cosmético dedicado.** O backlog aceita qualquer um dos
  dois; moeda é mais simples e consistente com os outros bônus pontuais já existentes (baú, segredo,
  desafio em dupla), sem precisar desenhar/catalogar um cosmético novo por semana.
- **Limiar de "pelo menos 1" desafio, não um contador.** Mantém o objetivo genuinamente "convite,
  não obrigação" (backlog) — fácil de bater numa sessão qualquer, sem precisar de grind. Também
  simplifica o estado: um único campo `weeklyEventObjectiveRewardedAtIso`, sem contador nem reset
  explícito (a comparação contra a semana atual já cobre os dois casos).
- **Bug real encontrado AO VIVO, não em teste unitário nem em review — o formato inicial de
  `weeklyEventObjectiveProgress` crashava de verdade.** A primeira versão copiou o formato de
  `petDailyChallengeCompleted`/`coopChallengeCompleted` (ler o resultado de DENTRO do atualizador
  funcional do `setProgress`, via uma variável `let result!: T` capturada no closure). Isso funciona
  quando a função é a ÚNICA chamada de `setProgress` no handler, mas `handleEnvironmentalChallengeCorrect`
  chama `completeQuest(...)` (não-funcional, `setProgress(result.progress)`) IMEDIATAMENTE ANTES —
  como já existe uma atualização pendente na fila do `useState` quando a segunda chamada
  (`weeklyEventObjectiveProgress`) acontece, o atalho de "bailout adiantado" do React (que invoca o
  atualizador de forma síncrona só quando a fila está vazia) não se aplica, e o atualizador só roda
  DEPOIS — tarde demais pra `result` já ter sido lido de volta. Isso produziu um crash real e
  reproduzível: `Cannot destructure property 'rewardGranted' of 'weeklyEventObjectiveProgress(...)'
  as it is undefined`, travando o `QuestModal` num "Preparando sua recompensa..." permanente.
  Verificado que a ESCRITA em si (a moeda sendo creditada e persistida) funcionou mesmo durante o
  crash (o `localStorage` mostrou `weeklyEventObjectiveRewardedAtIso` gravado corretamente) — só a
  LEITURA de volta pro código chamador quebrou. Corrigido separando as duas preocupações: a decisão
  "já concluído esta semana" é lida do `progress` do closure de render (seguro, porque
  `completeQuest` nunca escreve em `weeklyEventObjectiveRewardedAtIso`), e só a ESCRITA da moeda
  usa o atualizador funcional, sem tentar ler nada de volta dele. **Isso generaliza uma lição além
  deste lab**: o padrão "ler resultado de dentro do atualizador funcional" só é seguro quando essa é
  a ÚNICA chamada de `setProgress` no handler — encadear depois de OUTRA chamada (funcional ou não)
  no mesmo handler quebra a leitura síncrona, mesmo que a escrita em si continue correta.

## Review automático do Copilot (PR #61)

- **Rodada 1**: 3 achados reais corrigidos, 1 deles CRÍTICO. (1) `.hud-overlay .badge-row` já
  tinha `pointer-events: none` (`index.css:763-765`, texto informativo deixando cliques passarem
  pro mundo 3D por baixo) — o `.weekly-event-badge` novo, virando um `<button>` de verdade, herdava
  esse `none` e ficava CLICÁVEL SÓ PROGRAMATICAMENTE (`.click()` via JS bypassa CSS
  `pointer-events`), nunca por mouse/toque real. A verificação ao vivo anterior usou `.click()` via
  JS pra abrir o painel e não pegou isso — só um clique de MOUSE de verdade (coordenada) expôs o
  bug (o clique "vazava" pro avatar/3D por baixo do badge). Corrigido com `pointer-events: auto`
  no próprio botão (mesmo padrão de `.help-button`), e reverificado com um clique de mouse real
  desta vez, não só JS. (2) `WeeklyEventPanel.tsx` escondia `event.description` nas semanas sem
  multiplicador (`hasMultiplierBonus &&`), mas a descrição ("Sem bônus especial esta semana...") é
  informativa mesmo sem bônus — corrigido removendo a condição, sempre mostra. (3) Comentário em
  `progression.ts` ainda citava o nome antigo `advanceWeeklyEventObjective` depois do rename pra
  `weeklyEventObjectiveProgress`. Também 2 nits de gramática (palavra duplicada "todo toda",
  concordância de gênero "escolhido"→"escolhida") e um teste fortalecido pra checar o valor exato
  da recompensa (`toBe`, não `toBeGreaterThan`) — todos corrigidos.
- **Rodada 2**: 1 achado real — a copy de `semana-normal` ("Sem bônus especial esta semana — volte
  na próxima!") ficou CONTRADITÓRIA depois deste lab: o painel mostra essa frase E, logo abaixo, um
  objetivo que paga 20 moedas na mesma semana. Corrigido pra "Sem multiplicador de XP/moedas esta
  semana — mas o objetivo da semana ainda vale!", deixando claro que só o multiplicador passivo
  está ausente, não o bônus fixo do objetivo.
- **Rodada 3**: 1 achado real — o painel tem 2 parágrafos longos (status do objetivo + mensagem de
  "sem pressão") além da descrição do evento, mais texto que os outros usuários de `.reward-modal`
  (toasts curtos); em telas curtas isso podia empurrar o botão "Fechar" pra fora da área visível,
  já que `.modal` sozinho não tem limite de altura/scroll. Corrigido com uma classe nova
  `.weekly-event-modal` (`max-height: 80vh; overflow-y: auto`), mesmo padrão já usado por
  `.quest-list-modal`.
- **Rodada 4**: 1 achado real de documentação — `docs/event-catalog.md` não deixava claro que
  `weeklyFunnel.weeklyEventObjectiveCompleted` mede uma coisa DIFERENTE do bônus em si: o bônus é
  idempotente por semana ISO (segunda-domingo), mas `weeklyFunnel.*` inteiro (herdado do
  lab-165/185) é uma janela MÓVEL de 7 dias corridos a partir da consulta (`now() - interval '7
  days'`) por `device_id` distinto — não "quantos perfis bateram o objetivo nesta semana ISO".
  Corrigida a nota do catálogo pra explicitar essa diferença.
- **Rodada 5**: 1 achado real (extremo, mas real) — `WeeklyEventPanel` lia o relógio 2 vezes
  (`getCurrentWeeklyEvent()` sem argumento e `new Date().toISOString()` separado pro objetivo); bem
  na virada exata de domingo pra segunda, as duas leituras podiam divergir e mostrar o evento de uma
  semana com o status do objetivo de outra. Corrigido capturando um único `Date` e reaproveitando
  nas duas chamadas.
- **Rodada 6**: 1 achado real (mesma classe da rodada 5, lugar diferente) — `completeQuest()`
  (`useProgress.ts`) lê o relógio por conta própria pro multiplicador semanal (`getCurrentWeeklyEvent()`
  default), enquanto `handleEnvironmentalChallengeCorrect` (`App.tsx`) lia de novo, separadamente,
  pro objetivo; bem na virada exata de semana ISO os dois podiam divergir (toast mostrando o
  evento de uma semana, bônus/analytics gravados pra outra). Corrigido dando a `completeQuest` um
  3º parâmetro opcional `nowIso` (default preserva o comportamento de todo chamador que não passa —
  só `handleEnvironmentalChallengeCorrect` usa), e capturando um único `nowIso` no topo do handler,
  reaproveitado nas duas chamadas (`completeQuest`/`weeklyEventObjectiveProgress`). Reverificado ao
  vivo depois da mudança de assinatura: fluxo completo continua funcionando sem regressão.
- **Rodada 7**: 1 achado real — mesma classe das rodadas 5-6, num 3º lugar: `HudHeader.tsx` (o
  badge) calculava `getCurrentWeeklyEvent()` por conta própria, independente do
  `WeeklyEventPanel.tsx` que ele abre (já corrigido pra capturar 1 `Date` na rodada 5) — na virada
  exata de semana ISO os dois ainda podiam divergir. Em vez de continuar corrigindo local por
  local, resolvida a causa raiz de uma vez: `weeklyEvent` e `weeklyEventObjectiveDone` agora são
  calculados UMA ÚNICA VEZ em `App.tsx` (a partir do mesmo `Date`) e repassados por props pra baixo
  — `World3D.tsx` → `HudHeader.tsx` (prop nova `weeklyEvent`, substitui a chamada interna) e direto
  pro `WeeklyEventPanel.tsx` (props novas `event`/`objectiveDone`, substituem `progress` +
  `getCurrentWeeklyEvent()`/`isWeeklyEventObjectiveDone()` internos). Fecha a classe inteira do
  achado (badge, painel, e qualquer consumidor futuro que reaproveite essas props), em vez de só o
  sintoma mais recente. Reverificado ao vivo com um clique de mouse real: painel abre corretamente
  e mostra o mesmo evento do badge.
- **Rodada 8**: 1 achado real CRÍTICO (o mais sério do lab). `applyWeeklyEventObjectiveProgress`
  comparava só a CHAVE de semana ISO por igualdade — uma criança podia adiantar o relógio do
  aparelho pra uma semana futura, reivindicar o bônus "daquela semana", e depois voltar o relógio
  pra semana real: a chave guardada (da semana futura) não batia mais com "agora" (a semana real),
  liberando o MESMO bônus de novo, indefinidamente. Mesma classe de bug já corrigida em
  `applyDailyLoginReward` (que rejeita `dayGap <= 0` explicitamente) — precedente direto no próprio
  código deste projeto que deveria ter sido seguido desde o início. Corrigido trocando o campo
  guardado de uma CHAVE de semana (`weeklyEventObjectiveRewardedWeekKey`, ex. "2026-W37" — nem
  seria segura pra comparação cronológica, já que `isoWeekKey` não faz zero-padding do número da
  semana: "W7" > "W10" lexicamente) pelo INSTANTE completo da última concessão
  (`weeklyEventObjectiveRewardedAtIso`, sempre `toISOString()` — comparável lexicamente E
  cronologicamente); a concessão agora rejeita qualquer `nowIso <= weeklyEventObjectiveRewardedAtIso`
  (voltar ou empatar no tempo em relação à última concessão real), além de continuar idempotente
  dentro da mesma semana ISO. Teste de regressão novo simulando o ataque exato (adianta pra
  2026-W40, reivindica, volta pra 2026-W37, tenta reivindicar nessa semana de novo — rejeitado).
  Achados menores na mesma rodada, também corrigidos: `trackWeeklyEventObjectiveCompleted()` não
  usava o `nowIso` compartilhado (o evento de analytics ficaria com `occurredAt` de um instante
  ligeiramente diferente do usado pra decidir a semana do bônus, mesma classe das rodadas 5-7);
  `aria-label` estático no `WeeklyEventPanel` ("Evento da semana") sobrescrevia o nome acessível
  dinâmico do `<h2>` (ex. "Semana Dourada"), corrigido pra `aria-labelledby` apontando pro próprio
  `<h2>`; comentário do componente e docs do lab desatualizados (diziam "sem CSS novo" quando
  `.weekly-event-modal` já tinha sido adicionado na rodada 3). **Efeito colateral transparente do
  rename de campo** (`weeklyEventObjectiveRewardedWeekKey` → `weeklyEventObjectiveRewardedAtIso`):
  qualquer perfil que já tivesse concedido o bônus ANTES desta rodada (só perfis de teste desta
  sessão, nunca chegou à produção) mostra o objetivo como "pendente" de novo uma vez, já que o
  campo antigo fica órfão no `localStorage` (inofensivo, `{...emptyProgress, ...saved}` já cobre
  campo novo ausente com o default `null`) — sem perder moeda nem repetir a recompensa, só reseta o
  indicador visual "já concluído esta semana" uma vez.
- **Rodada 9**: 1 achado real — a correção da rodada 8 introduziu uma divergência nova entre o
  pré-check síncrono de `weeklyEventObjectiveProgress` (`useProgress.ts`, usava só
  `isWeeklyEventObjectiveDone`) e a decisão real de `applyWeeklyEventObjectiveProgress` (que também
  checa o recuo de relógio). No cenário de adiantar-e-voltar o relógio, o pré-check dizia "vai
  conceder" (semana diferente da guardada) enquanto a escrita de verdade rejeitava (recuo de
  relógio) — o app mostraria "+20 moedas" no toast e disparia o evento de analytics SEM a moeda ter
  sido creditada. Corrigido fatorando a decisão inteira numa função só, exportada
  (`wouldGrantWeeklyEventObjectiveReward`), reaproveitada pelos dois lugares — elimina a
  possibilidade estrutural das duas decisões divergirem de novo. Teste de regressão novo provando
  que o predicado nunca diverge da função de escrita no cenário exato do ataque.
- **Rodada 10**: 1 achado real — mesma classe da rodada 9, um nível acima: `App.tsx` calculava o
  status "concluído" do painel (`weeklyEventObjectiveDone`) com `isWeeklyEventObjectiveDone`, não
  com `wouldGrantWeeklyEventObjectiveReward` — no cenário de recuo de relógio, o painel mostraria a
  mensagem de "pendente, complete um desafio pra ganhar +20" mesmo a próxima tentativa real sendo
  bloqueada pela guarda anti-recuo, prometendo uma recompensa que nunca seria entregue. Corrigido
  trocando pra `!wouldGrantWeeklyEventObjectiveReward(...)` — o MESMO predicado que decide a
  escrita real agora também decide o que o painel mostra, garantindo que a UI nunca prometa uma
  recompensa que a escrita vai recusar.

## Pendências / dívidas conhecidas

- Nenhuma dívida técnica nova conhecida ao final deste lab (os achados da rodada 1 do review, todos
  corrigidos e reverificados ao vivo).

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — todos os itens do FEATURES.md foram concluídos.

## O que o próximo laboratório deve desenvolver

Próximo item da ordem sugerida em `docs/growth-retention-monetization-backlog.md` (item 9): **Lab
183 - Auditoria da vitrine adulta de assinatura** — não é construir nada novo, é AUDITAR
`TitleScreen`/`AvatarShop`/`/familia`/relatório de exemplo/CTA adulto/textos de item premium contra
a experiência infantil, ajustando só lacunas concretas encontradas (copy infantil que incentive
compra, falta de clareza grátis-vs-pago, ausência de evento num ponto adulto relevante). Critérios
de aceite do backlog: criança nunca vê checkout/preço/urgência; adulto continua vendo preço,
benefícios, cancelamento e a regra de aprendizagem grátis. Métricas citadas:
`parent_value_comprehension_rate`, `weekly_report_preview_viewed` (já existe, lab-173),
`checkout_started_from_parent_area`, zero entrada direta de checkout infantil.

## Estado do repositório ao final

- Branch: `lab-182-eventos-semanais` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (203 testes, inclui `applyWeeklyEventObjectiveProgress`/
    `isWeeklyEventObjectiveDone`).
  - `cd app/server-accounts && npm run test` (149 testes, inclui validação de
    `weekly_event_objective_completed`).
  - `cd app && npm run dev`, abrir o jogo, clicar no badge do evento semanal (topo esquerdo,
    "Semana Dourada"/etc.) pra ver o painel novo, depois completar qualquer desafio ambiental
    (ponte/abastecimento/placa) e conferir a linha de bônus no toast de recompensa + o painel
    atualizado como concluído.
