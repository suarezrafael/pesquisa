# Laboratório 132 — Combo de respostas certas seguidas

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 3f965d5686b91618402fd945d721dfce3060cd2b

## Objetivo do laboratório

Item do backlog de engajamento discutido em chat (*"combo de respostas certas seguidas"*),
escolhido pelo usuário via `AskUserQuestion` entre 4 opções. Responder missões corretamente uma
atrás da outra (sem desistir de nenhuma no meio do caminho) rende moeda bônus crescente em marcos
de sequência (3, 5, 10, 20...).

## Investigado antes de planejar

- **Este jogo nunca deixa uma pergunta ser respondida "errada" de forma definitiva**
  (`QuestModal.tsx`, `handleChoose`): escolher a opção errada só mostra "Quase! Tente outra opção."
  e deixa tentar de novo — não existe um evento de "errou" que chega até `App.tsx`/`progression.ts`.
  Isso descartou a interpretação literal de "sequência sem nenhum erro" (não dá pra medir) —
  a interpretação viável com o que o jogo realmente tem é **"sequência sem DESISTIR"**: fechar o
  modal (botão ×) de uma missão ainda não respondida quebra o combo; completar uma atrás da outra
  sem fechar nenhuma no meio mantém.
- **Quiz Surpresa (`surpriseQuizzes.ts`) fica FORA do combo** — ao contrário de
  `completeQuest`/`completePlanetQuest`, `handleSurpriseQuizCorrect` não é idempotente por id (pode
  ser respondido repetidamente de propósito, é só um bônus leve de moeda) — incluir no combo abriria
  um jeito óbvio de farmar marcos de sequência respondendo o mesmo quiz em loop.
- **A checagem de idempotência que já existe em `applyQuestCompletion`/`applyPlanetQuestCompletion`**
  (retorna cedo, sem creditar nada, se a missão já foi completada) já é suficiente pra impedir
  farmar o combo reabrindo uma missão JÁ respondida — o incremento do combo só acontece no mesmo
  ramo de código que credita XP/moeda de verdade.
- **Um combo só, compartilhado entre missões do planeta principal e escolinhas de planeta** (não um
  contador por tipo) — combina melhor com a ideia de "sequência de acertos", em vez de dois
  medidores paralelos que o jogador precisaria entender separadamente.

## Decisões técnicas tomadas

- **`Progress.currentStreak: number` novo** — cresce a cada resposta certa genuína, zera ao fechar
  (`×`) uma missão ainda não completada. Persistido (sobrevive recarregar a página), pra sentir como
  um desafio contínuo de verdade, não só uma sessão.
- **Marcos: 3→+5 moedas, 5→+10, 10 e a cada 10 depois (20, 30...)→+20** — crescente como pedido,
  simples de calcular (`streakBonusFor`), sem precisar de catálogo de dados novo.
- **Bônus creditado direto na mesma resposta que atinge o marco** (não um evento separado) — mesma
  filosofia de `unlockedFurnitureItem` (lab-130): o `CompletionResult` ganha `currentStreak`/
  `streakBonusCoins` novos, mostrados como mais uma linha condicional no `RewardToast` já existente
  (reaproveita o padrão das linhas de evento semanal/assinante/mobília), sem modal novo.
- **Reset fica em `App.tsx`, não dentro do `QuestModal`** — o modal não sabe (nem precisa saber)
  sobre combo; `App.tsx` decide chamar `resetStreak()` no `onClose` só se a missão fechada AINDA
  NÃO estava completa (reabrir uma missão já respondida e fechar de novo não deveria punir).

## Funcionalidades planejadas

- [x] `types.ts`/`state/storage.ts`: `currentStreak: number` novo em `Progress`/`emptyProgress`.
- [x] `state/progression.ts`: `streakBonusFor(streak)` novo; `applyQuestCompletion`/
      `applyPlanetQuestCompletion` incrementam `currentStreak` e creditam `streakBonusFor` só em
      completions genuínas; `CompletionResult` ganha `currentStreak`/`streakBonusCoins`;
      `applyStreakReset(progress)` novo.
- [x] `state/useProgress.ts`: `resetStreak()` novo.
- [x] `App.tsx`: `handleCloseQuest`/`handleClosePlanetQuest` nomeados (chamam `resetStreak()` só se
      a missão fechada ainda não estava completa); `reward` repassa `currentStreak`/
      `streakBonusCoins` pro `RewardToast`.
- [x] `components/RewardToast.tsx`: linha de bônus condicional nova quando `streakBonusCoins > 0`.
- [x] Testes novos em `progression.test.ts`: marcos de combo (3/5/10) creditam o bônus certo;
      combo NÃO incrementa em completion repetida (idempotente); `applyStreakReset` zera (e é
      idempotente); combo compartilhado entre `applyQuestCompletion`/`applyPlanetQuestCompletion`
      (6 testes novos, suite 64→70).
- [x] Verificação: `npm run build`/`npm run test` sem erros. **Verificação ao vivo COMPLETA** (ver
      `CONTEXT.md`) — 3 missões reais respondidas seguidas no planeta principal, toast mostrou "🔥
      Combo de 3 acertos seguidos! +5 moedas bônus!" com a moeda batendo exatamente (+10 base +5
      combo); missão aberta e fechada sem responder (×) confirmada zerando `currentStreak` no
      `localStorage` de verdade.
