# Laboratório 247 — Chave de tentativa nos QuestModal restantes

Status: implementado; PR pendente
Início: 2026-10-03
Fim: 2026-10-03 (implementação local)
Commit inicial: a698712abbbe4472ca00fb9b1179a920f8cce2cc
Prioridade: P1 — endurecimento preventivo, mesma classe de risco do Lab 246

## Objetivo do laboratório

Lab 246 corrigiu um achado de severidade alta do review automático do Copilot
(PR #135): o `QuestModal` do desafio ambiental não tinha `key`, então
substituir uma tentativa por outra em memória reaproveitava a mesma instância
React, deixando `feedback`/`selectedId`/`completionTimer` da tentativa antiga
presos na nova — travando-a sem possibilidade de resposta. A correção foi
`key={attemptId}`. O próprio Copilot recomendou estender o mesmo padrão aos
outros chamadores; `CONTEXT.md` do lab-246 deixou isso como item aberto
("revisar se algum caminho assim for encontrado").

Os quatro chamadores restantes (`activeQuest`, `activeSurpriseQuiz`,
`activePlanetQuest`, `activeCoopQuest`) têm o mesmo formato (quest trocada em
memória, sem desmontar o modal) e pelo menos dois deles (`activeSurpriseQuiz`,
`activePlanetQuest`) são abertos por gatilhos de proximidade no loop de física
de `World3D.tsx` — mesma família de gatilho automático do desafio ambiental,
ainda que hoje aparentem bloqueados por `suspendTriggers`/`hudInert` enquanto
um modal já está aberto. Este laboratório não afirma ter reproduzido uma
condição de corrida ao vivo — é endurecimento preventivo pela mesma técnica
já validada no lab-246, consistente com a recomendação do Copilot, sem mudar
nenhuma regra de pontuação/XP/moeda.

## Funcionalidades planejadas

- [x] `App.tsx`: adicionar `key` por identidade da tentativa aos 4
  `QuestModal` restantes — `activeQuest`/`activeSurpriseQuiz`/
  `activePlanetQuest` por `quest.id` (identidade já única e estável por
  missão); `activeCoopQuest` precisa de uma identidade própria (não tem
  `attemptId` hoje — avaliar se `quest.id` basta ou se precisa de um id de
  tentativa gerado em `handleOpenCoopChallenge`/`onOpenCoopChallenge`,
  mesmo raciocínio do `attemptId` ambiental).
- [x] `QuestModal.test.tsx`: teste de regressão reproduzindo a troca de
  tentativa com `key` nova para pelo menos um caso adicional representativo
  (mesmo padrão do `AttemptHarness` do lab-246), confirmando reset de estado.
- [x] Suite completa, lint e build/PWA sem regressão.

## Fora de escopo (explicitamente adiado)

- Provar/reproduzir ao vivo uma condição de corrida real nos gatilhos de
  proximidade de `World3D.tsx` — fica para um lab futuro se houver evidência
  concreta (relato de usuário ou reprodução automatizada).
- Qualquer mudança em XP/moeda/streak/persistência de progresso.
- Auditoria de outros `setTimeout`/callbacks temporizados fora de
  `QuestModal` (varredura feita neste lab só achou usos já endurecidos por
  labs anteriores, ex.: `HudHeader.tsx`, `World3D.tsx` linhas 3912+/16275+).
