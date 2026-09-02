# Laboratório 133 — Bônus por limpar um planeta inteiro

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 6fc6ce4c7c0a0ad6de96c0fbcb7adf5b44fff998

## Objetivo do laboratório

Item do backlog de engajamento discutido em chat, escolhido pelo usuário via `AskUserQuestion`
entre 4 opções. Responder a 6ª (última) escolinha de um planeta-destino credita, na mesma resposta,
um bônus IMEDIATO de XP/moeda — distinto do item de mobília exclusivo do lab-130 (recompensa
cosmética, não moeda/XP) e do combo do lab-132 (sequência entre missões DIFERENTES, não ligado a um
planeta específico).

## Investigado antes de planejar

- **O gatilho "planeta acabou de ficar 100% completo" já existe** em `applyPlanetQuestCompletion`
  (`isPlanetFullyCompleted`, usado desde o lab-130 pra conceder a mobília) — o bônus deste
  laboratório entra no MESMO bloco `if`, sem precisar de um gatilho novo.
- **Efeitos colaterais de completar a última escolinha JÁ empilham dois** (recompensa da própria
  pergunta + bônus de combo do lab-132, se for o caso) — este é o TERCEIRO efeito na mesma resposta.
  Confirma que o padrão de "cada bônus com seu próprio campo em `CompletionResult`, cada um com sua
  própria linha condicional no `RewardToast`" (já usado por `unlockedFurnitureItem`/
  `streakBonusCoins`) escala bem sem precisar reestruturar nada.
- **O bônus deve seguir os MESMOS multiplicadores da recompensa da pergunta** (evento semanal +
  assinante) — ao contrário do pote de Marte/baú de tesouro (moeda flat, recompensa de exploração
  pura), este bônus está diretamente ligado a RESPONDER perguntas de verdade, então faz sentido
  ficar na mesma "economia" de recompensa de missão, não na de achado de exploração.

## Decisões técnicas tomadas

- **+50 XP / +30 moedas base** (antes dos multiplicadores) — decisão de produto sem dado de
  mercado mais específico: proporcional a ~2x a recompensa média de uma única pergunta do planeta,
  grande o bastante pra parecer um marco de verdade ("limpou o planeta inteiro"), sem desequilibrar
  a progressão geral.
- **Campos novos opcionais em `CompletionResult`** (`planetClearBonusXp?`/`planetClearBonusCoins?`),
  mesmo padrão de `unlockedFurnitureItem` — só populados por `applyPlanetQuestCompletion`, e só na
  resposta que completa o planeta; `applyQuestCompletion` (missões do planeta principal) nunca os
  seta, ficam `undefined`.
- **Linha de bônus própria no `RewardToast`**, separada da linha de mobília (lab-130) e da de combo
  (lab-132) — cada bônus é conceitualmente diferente (item vs. moeda/XP vs. moeda de sequência),
  melhor não misturar tudo numa frase só.

## Funcionalidades planejadas

- [x] `state/progression.ts`: `PLANET_CLEAR_BONUS_XP`/`PLANET_CLEAR_BONUS_COINS` novos;
      `applyPlanetQuestCompletion` credita o bônus (com multiplicadores) no mesmo bloco que já
      concede a mobília; `CompletionResult` ganha `planetClearBonusXp?`/`planetClearBonusCoins?`.
- [x] `App.tsx`: `handleCompletePlanetQuest`/estado `reward` repassam os campos novos.
- [x] `components/RewardToast.tsx`: linha de bônus condicional nova.
- [x] Testes novos em `progression.test.ts`: bônus só na resposta que completa o planeta; aplica
      multiplicador de evento semanal/assinante corretamente; não é concedido de novo numa revisita
      idempotente; `applyQuestCompletion` nunca popula os campos novos (5 testes novos, suite
      70→75).
- [x] Verificação: `npm run build`/`npm run test` sem erros. **Verificação ao vivo PARCIAL** — ver
      `CONTEXT.md`: a mesma limitação do `__debugTeleport` fora do planeta principal (achado do
      lab-131, reconfirmada aqui até pra deslocamentos pequenos) impediu alcançar a 6ª escolinha de
      um planeta pra ver o toast ao vivo. Confiança vem de reaproveitar literalmente o mesmo bloco
      `if (isPlanetFullyCompleted(...))` já usado pela mobília do lab-130 (essa sim verificada ao
      vivo) + 5 testes unitários cobrindo a matemática exata.
