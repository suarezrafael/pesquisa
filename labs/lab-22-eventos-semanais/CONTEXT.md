# Contexto — Laboratório 22 — Eventos semanais

Preenchido em: 2026-08-17
Commit inicial → final: 99537c7fcbb4ada9bef181896149fd1f080b6d02..78a228d988fb998fc52c7f282ee37da12f9fad34

## O que foi feito

1. **`src/data/weeklyEvents.ts`** (novo) — catálogo fixo de 4 eventos ("Semana Normal", "Semana
   Dourada" ×2 moedas, "Semana do Sábio" ×2 XP, "Semana da Recompensa Dupla" ×2 ambos).
   `getCurrentWeeklyEvent(date)` escolhe determinística e localmente a partir do número da semana
   ISO 8601 (`% catálogo.length`) — sem servidor, sem estado salvo; qualquer jogador que abrir o
   jogo na mesma semana calendário vê o mesmo evento.
2. **`applyQuestCompletion`** (`src/state/progression.ts`) passou a receber o evento atual
   (parâmetro opcional, default `getCurrentWeeklyEvent()`) e aplicar o multiplicador à recompensa
   da missão, arredondado. `CompletionResult` ganhou `awardedXp`/`awardedCoins` — o valor
   realmente creditado a `progress.xp`/`coins`, não o valor base da missão.
3. **Propagação do valor real até a UI** — `useProgress.completeQuest` agora retorna o
   `CompletionResult` inteiro (antes só `newBadges: string[]`); `App.tsx` guarda
   `awardedXp`/`awardedCoins` no estado de recompensa e passa pro `RewardToast`, que trocou de
   ler `quest.xpReward`/`coinReward` direto pra ler os valores já creditados — mostra também uma
   linha de bônus quando o evento da semana multiplica alguma coisa.
4. **Selo do evento no `HudHeader`** — sempre visível (não só quando há badges), emoji + nome
   curto do evento atual, com a descrição completa no `title` (tooltip).

## Decisões técnicas tomadas

- **Backlog P1 (`prompt.md` §6: "eventos semanais"), não pedido explícito do usuário** — próximo
  item não-bloqueado depois de ranking (lab-20) e apelido seguro (lab-21); backend/conta segue
  bloqueado por decisão de infraestrutura do usuário.
- **Determinístico a partir da data real, sem servidor** — mesmo padrão de "desafio semanal" que
  jogos sem backend próprio usam; evita ter que construir qualquer sincronização/conta só pra
  “todo mundo ver o mesmo evento”.
- **`awardedXp`/`awardedCoins` como fonte de verdade da UI, não `quest.xpReward`/`coinReward`** —
  decisão mais importante deste lab: sem isso, a tela de recompensa mostraria o valor base da
  missão mesmo numa semana com bônus, dessincronizado do que `progress.xp`/`coins` realmente
  recebeu (um bug de confiança bem visível — a criança veria "+10 XP" na tela mas o XP total
  subiria 20). `CompletionResult` virou a única fonte pra ambos.
- **Multiplicador só nas missões, não nas moedinhas coletáveis do terreno** — moedinhas são bônus
  incidental de exploração (1 moeda cada, `applyCoinCollected`), não o "prêmio principal" que um
  evento semanal deveria destacar; documentado como fora de escopo em `FEATURES.md`, não
  esquecido.
- **Evento calculado onde é consumido (`HudHeader`, `RewardToast`, `progression.ts`), não
  guardado em estado React** — é uma função pura da data atual, recalcular é mais barato e mais
  simples que sincronizar estado, e evita qualquer risco de UI mostrar o evento de ontem depois
  da virada de semana sem reload.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção).
- Testado ao vivo no navegador: confirmado via DOM que `.weekly-event-badge` mostra o evento real
  da semana atual ("🧠 Semana do Sábio", xp×2/moedas×1 — 2026-08-17 cai nessa semana pelo cálculo
  ISO). Verificação numérica direta da lógica de domínio: `import()` dinâmico de
  `progression.ts`/`quests.ts` no console do navegador (servidos crus pelo Vite dev server),
  chamado `applyQuestCompletion` contra um `progress` **fake** (não tocou no progresso real
  salvo) com a primeira missão (`xpReward: 10, coinReward: 5`) — resultado:
  `awardedXp: 20, awardedCoins: 5` (XP dobrado, moedas sem bônus, batendo exatamente com o
  multiplicador da Semana do Sábio), e `result.progress.xp/coins` bateram exatamente com
  `awardedXp/awardedCoins`. Confirmado que o `localStorage` do progresso real do jogador não foi
  alterado por esse teste.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as quatro funcionalidades planejadas (catálogo de eventos, multiplicador aplicado em
`applyQuestCompletion`, propagação até a UI de recompensa, selo no HUD) foram concluídas e
verificadas.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Mais conteúdo, se o usuário continuar pedindo.
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
3. Do backlog P1/P2 restante (`prompt.md` §6) que não depende de backend: vale revisar de novo
   qual é o próximo item não-bloqueado depois deste (cooperação em sala já existe via multiplayer
   local; cosméticos/relatórios/multi-perfil dependem de conta).
4. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
