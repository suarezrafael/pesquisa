# Contexto — Laboratório 132 — Combo de respostas certas seguidas

Preenchido em: 2026-08-30
Commit inicial → final: 3f965d5686b91618402fd945d721dfce3060cd2b..HEAD

## O que foi feito

Item do backlog de engajamento discutido em chat ("combo de respostas certas seguidas"), escolhido
pelo usuário via `AskUserQuestion` entre 4 opções. Responder missões corretamente uma atrás da
outra — sem fechar (desistir de) nenhuma no meio do caminho — rende moeda bônus crescente em
marcos de sequência: 3º acerto seguido = +5 moedas, 5º = +10, 10º e a cada 10 depois (20, 30...) =
+20.

- **`types.ts`/`state/storage.ts`**: `currentStreak: number` novo em `Progress`/`emptyProgress` —
  migração automática pra saves antigos, mesmo padrão de todos os campos novos anteriores.
- **`state/progression.ts`**:
  - `streakBonusFor(streak)` novo — função pura, marcos hardcoded (3→5, 5→10, 10+múltiplos de
    10→20).
  - `applyQuestCompletion`/`applyPlanetQuestCompletion` incrementam `currentStreak` e creditam
    `streakBonusFor(currentStreak)` — mas SÓ no ramo de completion GENUÍNA (a checagem de
    idempotência que já existia em cada função, retornando cedo sem creditar nada numa missão já
    respondida, também cobre o combo de graça).
  - `CompletionResult` ganha `currentStreak`/`streakBonusCoins` novos (sempre presentes, mesmo
    formato de `unlockedFurnitureItem` do lab-130 — a UI decide se mostra a linha de bônus
    conferindo se `streakBonusCoins > 0`).
  - `applyStreakReset(progress)` novo — idempotente, zera `currentStreak`.
- **`state/useProgress.ts`**: `resetStreak()` novo — wrapper padrão em volta de
  `applyStreakReset`.
- **`App.tsx`**: `handleCloseQuest`/`handleClosePlanetQuest` (antes inline) viraram funções
  nomeadas que chamam `resetStreak()` — mas SÓ se a missão sendo fechada AINDA NÃO estava
  completa (reabrir uma missão já respondida, só pra revisar, e fechar de novo não deveria punir).
  `handleQuestCorrect`/`handleCompletePlanetQuest` repassam `currentStreak`/`streakBonusCoins` pro
  estado `reward`, que alimenta o `RewardToast`.
- **`components/RewardToast.tsx`**: linha de bônus condicional nova ("🔥 Combo de N acertos
  seguidos! +X moedas bônus!"), mostrada só quando `streakBonusCoins > 0` — mesmo padrão das
  linhas de evento semanal/assinante/mobília já existentes.

## Decisões técnicas tomadas

Ver `FEATURES.md` (seção "Investigado antes de planejar"/"Decisões técnicas tomadas") pro racional
completo. Pontos centrais:
- **Redefinição necessária de "seguidas"**: o jogo nunca deixa uma pergunta ser respondida errada
  de forma definitiva (`QuestModal.tsx` só mostra "Quase! Tente outra opção." e deixa tentar de
  novo, sem avisar `App.tsx`) — não dá pra medir "sem nenhum erro". A interpretação implementada é
  "sem DESISTIR" (fechar o × antes de acertar quebra a sequência), que é o sinal real que o código
  já tinha disponível.
- **Quiz Surpresa fica FORA do combo de propósito** — não é idempotente por id (pode ser
  respondido repetidamente), incluir abriria um jeito óbvio de farmar marcos de sequência.
- **Um combo só, compartilhado** entre missões do planeta principal e escolinhas de planeta (não
  dois contadores paralelos) — testado explicitamente (uma missão de planeta continua a mesma
  sequência de duas missões principais).
- **Bônus creditado na mesma resposta que atinge o marco**, sem modal separado — mesma filosofia
  de `unlockedFurnitureItem` (lab-130).

## Verificação ao vivo (completa, sem achado de ferramenta novo desta vez)

Diferente dos labs 129-131 (que envolveram navegação em planetas-destino e esbarraram em
limitações reais do `__debugTeleport` fora do planeta principal), este laboratório inteiro
acontece no PLANETA PRINCIPAL — sem esse risco. Roteiro real:
1. `completedQuestIds`/`currentStreak` do perfil de teste local "Teste Missoes" zerados via
   `localStorage` (nota de transparência abaixo) pra ter 3+ missões genuinamente não respondidas
   pra testar.
2. Três escolinhas reais (`door-q01`/`q02`/`q03`) respondidas corretamente em sequência (perguntas
   e respostas lidas de verdade da tela, não adivinhadas) — a 3ª mostrou exatamente "🔥 Combo de 3
   acertos seguidos! +5 moedas bônus!" no `RewardToast`, com o saldo de moedas batendo certinho
   (251 → 266, +10 base da missão +5 do combo, dobrados pelo evento "Semana da Recompensa Dupla"
   já ativo — conferido somando manualmente).
3. Uma quarta escolinha (`door-q04`) aberta e fechada pelo botão × SEM responder — confirmado por
   leitura direta do `localStorage` que `currentStreak` voltou a `0` imediatamente.
Sem erro de console em nenhum passo.

## Nota de transparência

A verificação usou o perfil de dev local real "Teste Missoes" (usado em labs anteriores desta
sessão) — `completedQuestIds` e `currentStreak` foram sobrescritos direto no `localStorage` pra
zero antes do teste, pra garantir missões genuinamente não respondidas (sem isso, a maioria das 30
já estava completa de sessões passadas, e reabri-las não creditaria nada). `xp`/`coins`/nível
CONTINUARAM avançando de verdade a partir daí (nível 19→21, moedas 231→268) — não foram
adulterados, só resultado real de responder 3 missões de verdade. Save local de dev, sem dado de
produção/banco envolvido.

## Pendências / dívidas conhecidas

Nenhuma pendência de código. A única simplificação deliberada é o Quiz Surpresa ficar fora do
sistema de combo (ver "Decisões técnicas tomadas") — comportamento intencional, não uma lacuna.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas, incluindo a verificação ao
vivo completa (sem parte pendente, ao contrário dos 3 laboratórios anteriores).

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: bônus por limpar um planeta
inteiro (distinto deste — bônus na hora ao completar as 6 escolinhas de UM planeta, não uma
sequência entre missões diferentes), persistência de "Minha Casa" pra assinante (arquitetural, G6
do doc de escala, precisa de conversa de produto/privacidade antes), segundo "chefe" em Júpiter,
mini-desafios temáticos por planeta, corrida/parkour temático, vitrine de troféus mais visual,
emotes/danças, evento sazonal, mascote/pet colecionável, cartão-postal colecionável, boletim/
certificado do explorador, clima ativo por planeta, "distress call" de NPC perdido. Sem prioridade
única — perguntar ao usuário antes de escolher o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 70/70 passando (64→70, 6 testes novos em `progression.test.ts`).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo: COMPLETA — combo de 3 acertos confirmado com o bônus certo e a moeda batendo
  exatamente; reset ao desistir de uma missão confirmado via `localStorage`; sem erro de console.
- Como verificar de novo: `cd app && npm run dev`, responder 3 escolinhas reais em sequência
  (planeta principal ou de planeta-destino, tanto faz) sem fechar nenhuma no meio, confirmar o
  toast de combo na 3ª; abrir e fechar (×) uma escolinha sem responder e confirmar que a próxima
  sequência recomeça do zero (sem bônus até o 3º acerto de novo).
