# Laboratório 182 — Eventos semanais saudáveis

Status: concluído
Início: 2026-09-13
Fim: 2026-09-13
Commit inicial: eb1b75a4d3495bcc2b90030a75f51ea852146135

## Objetivo do laboratório

Dar ao evento semanal já existente (`data/weeklyEvents.ts`, lab-22) um objetivo educativo/ambiental
com recompensa fixa e previsível — hoje o "evento" é só um multiplicador passivo de XP/moeda, sem
nenhuma ação pra criança tomar nem feedback claro de progresso — sempre como convite opcional,
nunca como pressão, e com mensagem explícita pro responsável de que não há venda embutida.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 182", item 8 da ordem sugerida,
próximo item recomendado após o lab-181 (`labs/CURRENT.md`, "O que o próximo laboratório deve
desenvolver").

## Investigação prévia (antes de codar)

- `data/weeklyEvents.ts` (lab-22) já é a única fonte de verdade da rotação semanal: 4 eventos fixos
  (`semana-normal`, `semana-dourada` 2x moeda, `semana-sabio` 2x XP, `semana-dupla` 2x ambos),
  escolhido deterministicamente por `getCurrentWeeklyEvent(date)` via número da semana ISO 8601 —
  todo jogador na mesma semana real vê o mesmo evento, sem servidor. Consumido em 3 lugares:
  `progression.ts` (multiplica XP/moeda ao completar missão), `HudHeader.tsx` (badge não-clicável
  no topo, só tooltip com a descrição) e `RewardToast.tsx` (linha de bônus quando o multiplicador é
  >1). `isoWeekKey(date)` (mesmo arquivo, lab-157) já dá uma chave estável "AAAA-Www" pro ranking
  local — mesma definição de "semana" reaproveitável aqui.
- Não existe hoje NENHUM objetivo/ação pra criança tomar dentro do evento semanal — é só um
  multiplicador de fundo, sem convite nem feedback de progresso. O backlog pede exatamente isso:
  "objetivo educativo/ambiental, recompensa cosmética ou moeda grátis".
- O lab-180 (missões ambientais de aprendizagem) já criou exatamente 3 landmarks temáticos
  ambientais no planeta principal (ponte/lógica, posto de abastecimento do foguete/matemática,
  placa/leitura), sempre disponíveis, sorteando uma pergunta aleatória do tipo certo a cada vez
  (`selectEnvironmentalChallengeQuest`) — nunca esgotam. É o "objetivo educativo/ambiental" pronto
  pra reaproveitar sem nenhum conteúdo novo: "complete pelo menos 1 desafio ambiental nesta semana".
  `handleEnvironmentalChallengeCorrect` (`App.tsx`) é o único ponto que sabe que uma resposta certa
  veio de um landmark ambiental (chama `completeQuest` + `trackLearningChallengeCompleted(kind)`) —
  é o gancho certo pra avançar o objetivo semanal, já que os ids de pergunta em si são sorteados
  (não dá pra reconstruir "foi ambiental" só olhando `completedQuestIds` depois).
- Não existe HOJE nenhum estado semanal para o pote "já ganhei o bônus desta semana" — preciso de um
  campo novo em `Progress`, mesmo padrão de `weeklyXpWeekKey`/`weeklyXpSnapshot` (lab-157): uma
  chave de semana ISO comparada contra `isoWeekKey(now)`, reaproveitando a MESMA definição de
  "semana" já usada pro ranking e pra rotação do evento (evita 2 conceitos de "semana" divergentes).
- **Achado técnico importante (evitar regressão do tipo já corrigido no lab-181, rodada 6)**:
  `completeQuest()` (`useProgress.ts`) já lê `progress` do closure de render (não usa atualizador
  funcional) — encadear uma SEGUNDA chamada não-funcional logo depois, no mesmo handler
  (`handleEnvironmentalChallengeCorrect`), sobrescreveria o XP/moeda que `completeQuest` acabou de
  conceder. A função nova (`advanceWeeklyEventObjective`) PRECISA usar `setProgress(prev => ...)`
  (mesmo padrão de `collectCoin`) pra compor corretamente em cima da atualização anterior no mesmo
  lote do React.
- Calibração de moeda: descobertas/bônus pontuais existentes vão de 5 (desafio diário do pet,
  repetível) a 15 (baú/segredo, achado único permanente) a 10 (desafio em dupla, 1x por dia real).
  Um bônus SEMANAL (cadência mais rara que diário) na faixa de 15-20 moedas fica consistente.
- Regra inegociável do projeto (`docs/plano-comercial-backend.md`): nunca gatear
  progresso/exploração atrás de assinatura — o bônus tem que ser 100% grátis, o que já é o caso
  (nenhuma das 4 rotações de evento nem o objetivo novo checam `entitlementActive`).

## Funcionalidades planejadas

- [x] Campo novo em `Progress` (`weeklyEventObjectiveRewardedAtIso: string | null`, `types.ts` +
  default `null` em `storage.ts`) — marca em qual semana ISO o bônus já foi concedido, idempotente
  (não paga de novo na mesma semana mesmo completando vários desafios ambientais).
- [x] `data/weeklyEvents.ts` ganha as constantes de copy/recompensa do objetivo (única fonte de
  verdade, junto da rotação e do multiplicador, como o backlog pede): valor da recompensa em moeda,
  descrição do objetivo, e a mensagem de "sem problema se não der tempo — sempre grátis".
- [x] `applyWeeklyEventObjectiveProgress(progress, nowIso)` (`progression.ts`, função pura) — se a
  semana atual ainda não foi recompensada, credita a moeda e marca a semana; senão devolve
  `progress` inalterado. `isWeeklyEventObjectiveDone(progress, nowIso)` (leitura pura, sem mutar)
  pra UI saber se já foi concluído esta semana.
- [x] `weeklyEventObjectiveProgress(nowIso)` (`useProgress.ts`, renomeado de
  `advanceWeeklyEventObjective` durante a implementação) — chamado de
  `handleEnvironmentalChallengeCorrect` (`App.tsx`) logo após `completeQuest(...)`. **Achado ao vivo
  real, diferente do previsto acima** — ver "Decisões técnicas" no `CONTEXT.md`: o formato inicial
  (ler o resultado de DENTRO do atualizador funcional, copiando `petDailyChallengeCompleted`) causou
  um crash de verdade (`Cannot destructure property 'rewardGranted' of ... undefined`), porque
  encadear depois de `completeQuest` (não-funcional) pula o atalho de "bailout adiantado" do
  `useState`. Corrigido lendo a decisão do `progress` do closure (seguro, campo nunca tocado por
  `completeQuest`) e usando o atualizador funcional só pra ESCRITA, sem tentar ler de volta.
- [x] `RewardToast.tsx` ganha uma linha de bônus opcional (mesmo padrão de `planetClearBonusCoins`)
  quando o objetivo semanal é concedido NAQUELA resposta — feedback claro no momento certo.
- [x] Badge do evento semanal (`HudHeader.tsx`, `.weekly-event-badge`) vira um botão clicável (sem
  aumentar a fileira de ~11 ícones já existente) abrindo um painel novo pequeno
  (`WeeklyEventPanel.tsx`, mesmo padrão de `DailyLoginToast.tsx`/`.reward-modal`, mais uma classe
  nova `.weekly-event-modal` pra caber em telas curtas): nome/emoji/descrição do evento, status do
  objetivo (pendente ou já concluído esta semana + quanto ganhou), e a mensagem de "sem problema se
  não der tempo / sempre grátis".
- [x] `components/FamilyPortal.tsx`, seção "📚 Aprendizagem sempre grátis" (já existente, lab-166)
  ganha uma frase curta confirmando que o bônus do evento semanal também é sempre grátis — reforça
  o critério de aceite "responsável entende que não há pressão de compra" sem criar seção nova.
- [x] Evento novo `weekly_event_objective_completed` (sem `meta`, mesmo padrão de
  `camera_recenter_used`) — allowlist em `server-accounts/src/domain.ts`, branch explícito em
  `index.ts` (não herdar a tolerância de `meta` livre dos eventos legados), `weeklyFunnel.weeklyEventObjectiveCompleted`.
- [x] `docs/event-catalog.md` atualizado com a linha do evento novo + nota sobre "retorno semanal"
  já ser coberto pela infraestrutura de `weeklyFunnel`/D7 existente (nada novo necessário ali) e
  "feedback qualitativo infantil" ser pesquisa com usuário real, fora de escopo de laboratório de
  código (mesmo padrão de itens de pesquisa marcados fora de escopo em labs anteriores).
- [x] Testes novos em `progression.test.ts` (idempotência por semana, concede só 1x, reseta numa
  semana nova) e em `server-accounts/src/domain.test.ts` (allowlist do evento novo).

## Fora de escopo (explicitamente adiado)

- Timers agressivos, desconto relâmpago, passe de batalha, recompensa aleatória paga — já excluídos
  pelo próprio backlog.
- Recompensa cosmética dedicada nova (o backlog aceita "cosmética OU moeda grátis"; moeda grátis foi
  escolhida por ser mais simples/consistente com os outros bônus pontuais já existentes, sem exigir
  desenhar+catalogar um item novo por semana ou um item fixo reaproveitado de forma arbitrária).
- Uma 2ª rotação semanal paralela ou objetivos DIFERENTES por tipo de evento (dourada/sábio/dupla) —
  o backlog exige explicitamente "não existe segunda rotação semanal concorrente"; o objetivo é o
  MESMO toda semana, incorporado à única rotação já existente, não uma trilha nova.
- Feedback qualitativo infantil (métrica citada pelo backlog) — pesquisa com usuário real, não
  código.
