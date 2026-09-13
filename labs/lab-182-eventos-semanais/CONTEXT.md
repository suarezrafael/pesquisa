# Contexto — Laboratório 182 — Eventos semanais saudáveis

Preenchido em: 2026-09-13
Commit inicial → final: eb1b75a4d3495bcc2b90030a75f51ea852146135..(commit deste lab, ver PR)

## O que foi feito

- Campo novo em `Progress` (`weeklyEventObjectiveRewardedWeekKey: string | null`, `types.ts` +
  default `null` em `storage.ts`) — mesma definição de "semana" de `weeklyXpWeekKey` (lab-157,
  `isoWeekKey`). Guarda a chave da semana em que o bônus já foi pago, não um contador: o limiar é
  "pelo menos 1" desafio ambiental, então basta saber SE já foi pago pra ser idempotente.
- `data/weeklyEvents.ts` ganhou 3 constantes novas (única fonte de verdade de rotação/bônus/copy,
  como o backlog pede): `WEEKLY_EVENT_OBJECTIVE_REWARD_COINS` (20), `WEEKLY_EVENT_OBJECTIVE_DESCRIPTION`,
  `WEEKLY_EVENT_NO_PRESSURE_MESSAGE`.
- Duas funções puras novas em `state/progression.ts`: `applyWeeklyEventObjectiveProgress(progress, nowIso)`
  (credita a moeda e marca a semana na primeira vez; idempotente depois) e
  `isWeeklyEventObjectiveDone(progress, nowIso)` (leitura pura pra UI).
- `weeklyEventObjectiveProgress(nowIso)` novo em `state/useProgress.ts`, chamado de
  `handleEnvironmentalChallengeCorrect` (`App.tsx`) logo depois de `completeQuest(...)` — qualquer
  um dos 3 desafios ambientais do lab-180 (ponte/lógica, abastecimento de foguete/matemática,
  placa/leitura) conta, já que todos passam por esse mesmo handler.
- `RewardToast.tsx` ganhou uma linha de bônus opcional (`weeklyEventObjectiveBonusCoins`, mesmo
  padrão de `planetClearBonusCoins`) — "🌱 Objetivo da semana concluído! +20 moedas bônus!" no
  momento exato em que o bônus é concedido.
- Badge do evento semanal (`HudHeader.tsx`, `.weekly-event-badge`) virou um `<button>` clicável (sem
  aumentar a fileira de ~11 ícones do HUD) abrindo `components/WeeklyEventPanel.tsx` (novo, mesmo
  padrão de `DailyLoginToast.tsx`, reaproveita `.reward-modal`/`.reward-icon`/`.reward-bonus-line`
  sem CSS novo além do próprio botão): nome/emoji/descrição do evento ativo, status do objetivo
  (pendente com a descrição+recompensa, ou "✓ concluído, já ganhou X moedas") e a mensagem de
  "sem problema se não der tempo — sempre grátis".
- `components/FamilyPortal.tsx`, seção "📚 Aprendizagem sempre grátis" (lab-166) ganhou uma frase
  confirmando que o bônus do evento semanal também é sempre grátis, sem criar seção nova.
- Evento novo `weekly_event_objective_completed` (sem `meta`) — allowlist em
  `server-accounts/src/domain.ts`, branch explícito em `index.ts` (mesmo padrão de
  `camera_recenter_used`, não herda a tolerância de `meta` livre dos eventos legados),
  `weeklyFunnel.weeklyEventObjectiveCompleted`.
- `docs/event-catalog.md` atualizado com a linha do evento novo e uma nota explicando que "retorno
  semanal" já é coberto pela infraestrutura D1/D7 existente e "feedback qualitativo infantil" é
  pesquisa com usuário real, fora de escopo de código.
- Testes: 5 novos em `progression.test.ts` (concede na 1ª vez, idempotente na mesma semana, concede
  de novo numa semana nova, `isWeeklyEventObjectiveDone` reflete o estado real, perfil vazio nunca
  mostra concluído) e 1 novo em `server-accounts/src/domain.test.ts`. Suíte completa: app 203/203,
  server-accounts 149/149, `tsc -b`/`tsc --noEmit` e `npm run build` limpos.

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
  simplifica o estado: um único campo `weeklyEventObjectiveRewardedWeekKey`, sem contador nem reset
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
  crash (o `localStorage` mostrou `weeklyEventObjectiveRewardedWeekKey` gravado corretamente) — só a
  LEITURA de volta pro código chamador quebrou. Corrigido separando as duas preocupações: a decisão
  "já concluído esta semana" é lida do `progress` do closure de render (seguro, porque
  `completeQuest` nunca escreve em `weeklyEventObjectiveRewardedWeekKey`), e só a ESCRITA da moeda
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
