# Laboratório 22 — Eventos semanais

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 99537c7fcbb4ada9bef181896149fd1f080b6d02

## Objetivo do laboratório
`prompt.md` §6 (Backlog Inicial Priorizado) lista como P1: "eventos semanais". Backend/conta
segue bloqueado por decisão de infraestrutura do usuário (P0 restante); ranking (lab-20) e
apelido seguro (lab-21) já cobriram os outros itens não-bloqueados recentes. Eventos semanais é o
próximo item de backlog que dá pra construir sem nenhuma conta/servidor novo: um evento
determinístico calculado a partir da data real (número da semana ISO), igual ao padrão de
"desafio diário" comum em jogos — todo jogador vê o mesmo evento na mesma semana, sem precisar de
sincronização de servidor.

## Funcionalidades planejadas
- [x] Catálogo de eventos semanais (`src/data/weeklyEvents.ts`, novo) — poucos temas fixos
      (bônus de XP, bônus de moedas, bônus duplo, semana normal sem bônus), cada um com
      multiplicador de recompensa. `getCurrentWeeklyEvent(date)` escolhe o evento da semana atual
      de forma determinística (número da semana ISO `% catálogo.length`) — sem estado, sem
      servidor, mesmo evento pra todo mundo que abrir o jogo na mesma semana.
- [x] `applyQuestCompletion` (`src/state/progression.ts`) aplica o multiplicador do evento atual
      à recompensa da missão (arredondado). `CompletionResult` passa a expor `awardedXp`/
      `awardedCoins` (o valor realmente creditado, já com o multiplicador) — a UI de recompensa
      não pode continuar lendo `quest.xpReward`/`coinReward` direto, senão mostraria o valor
      errado quando o evento multiplicar.
- [x] `RewardToast`/`useProgress`/`App.tsx` atualizados pra propagar `awardedXp`/`awardedCoins`
      até a tela de recompensa (em vez do valor base da missão), com uma linha extra quando o
      evento atual dá bônus (> 1x).
- [x] Banner do evento atual no `HudHeader` — emoji + nome curto, sempre visível (não precisa
      abrir um menu pra saber que tem evento rolando esta semana).
- [x] Verificação: `npm run build` passa; testado ao vivo — `import()` dinâmico de
      `progression.ts`/`quests.ts` no console do navegador, `applyQuestCompletion` chamado contra
      um `progress` fake (sem tocar no progresso real salvo) confirmou XP dobrado/moedas sem
      bônus batendo com o evento real da semana atual, e `awardedXp/Coins` batendo exatamente com
      `result.progress.xp/coins`. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Eventos configuráveis remotamente (por um admin/backend) — exigiria conta/servidor, que é o
  item ainda bloqueado por decisão de infraestrutura do usuário. Este lab é só o catálogo fixo,
  calculado no client a partir da data.
- Aplicar o multiplicador a moedinhas coletáveis no terreno (`applyCoinCollected`) — são um bônus
  incidental de exploração (1 moeda cada), não o "prêmio principal" que um evento semanal deveria
  destacar; manter fora evita complicar a UI de "moeda flutuante" existente sem necessidade.
