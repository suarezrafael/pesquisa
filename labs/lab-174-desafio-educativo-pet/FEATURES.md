# Laboratório 174 — desafio educativo leve na rotina diária do pet

Status: concluído
Início: 2026-09-10
Fim: 2026-09-10
Commit inicial: ea36511d5f6bb10dda3bb4b2d2b356da684a29a8

## Objetivo do laboratório

`docs/market-metrics-engagement-backlog.md` §10 (ordem sugerida), item 6: "Lab 168 - Rotina diária
saudável com pet" (renumerado pra lab-174 real). Confirmado com o usuário via `AskUserQuestion`
que o resto do backlog top-8 já está implementado (checado item a item nesta sessão — inclusive o
item 8, "vitrine ética de assinatura", já coberto por completo pelos labs 166/173) e que o único
pedaço que falta deste item é o "desafio educativo leve" citado no documento: alimentar o pet hoje
é só um clique, sem nenhum momento de aprendizado junto.

## Estado atual levantado antes de planejar o escopo

- `feedPet`/`PetPanel.tsx` (lab-155/169) já cobrem: nunca pune ausência (pet não adoece, sem
  streak punitiva), alimentar é limitado a 1x/dia real (mesmo padrão anti-farm de sempre), pet
  cresce só com cuidado real, "envelhece mas nunca morre de verdade" (decisão do usuário no
  lab-169). `DailyLoginToast` já usa mensagem sempre positiva ("Você voltou!"), nunca acusatória,
  mesmo depois de dias sem abrir o jogo.
- **Falta**: nenhum momento de aprendizado (a parte "educativa" da hipótese do documento) está
  ligado à rotina do pet — é só cuidado visual, sem desafio.
- `data/quests.ts` já tem o banco de perguntas de múltipla escolha (lógica/matemática/leitura)
  reaproveitado por `QuestModal`/desafio cooperativo (lab-172) — mesma fonte, sem catálogo novo.

## Funcionalidades planejadas

- [x] Nova função pura `applyPetDailyChallengeCompleted` (`state/progression.ts`) — recompensa
      modesta em moedas, 1x por dia real por perfil (mesmo padrão anti-farm de
      `feedPet`/`applyCoopChallengeCompleted`), só quando há um pet equipado.
- [x] `PetPanel.tsx` ganha um botão "🎓 Desafio rápido do dia" ao lado de "Alimentar" — abre um
      cartão inline (sem modal novo empilhado) com 1 pergunta sorteada do banco existente.
      Responder errado nunca bloqueia nem pune — só convite pra tentar de novo, sem limite de
      tentativas; responder certo dá a recompensa e desabilita o botão até o dia seguinte (mesmo
      texto de "já feito hoje" do botão de alimentar).
- [x] `Progress.lastPetChallengeAt` novo (mesmo formato de `lastPetFeedAt`/`lastCoopChallengeAt`).

## Fora de escopo (explicitamente adiado)

- Qualquer penalidade por não fazer o desafio (documento proíbe explicitamente: "streak punitivo,
  cobrança para recuperar sequência").
- Catálogo de perguntas novo/exclusivo do pet — reaproveita `data/quests.ts` de propósito.
- Evento de analytics dedicado — `feedPet` (mesma categoria de ação) nunca teve um evento próprio;
  mantém a mesma simetria.
