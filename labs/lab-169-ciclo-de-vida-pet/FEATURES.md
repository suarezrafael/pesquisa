# Laboratório 169 — ciclo de vida do pet (idade por dias, sem morte)

Status: concluído
Início: 2026-09-09
Fim: 2026-09-09
Commit inicial: ce153b869fcca4ad40a460a44c01f32335f425f0

## Objetivo do laboratório

Pedido do usuário, adiado de propósito no lab-168 ("o pet tem que ter ciclo de vida ele deve
crescer envelhecer e morrer") pra uma conversa de design dedicada, dado o cuidado já existente
neste jogo com nunca punir a criança de forma irreversível. Retomado nesta sessão: "pode fazer um
ciclo de vida normal, incrementado os anos por dias". Perguntado via `AskUserQuestion` como a
"morte" deveria funcionar — o usuário escolheu explicitamente **"envelhece mas nunca morre de
verdade"**, a opção mais segura das três oferecidas.

## Funcionalidades planejadas

- [x] `Progress.petAdoptedAt: Record<string, string>` novo — data/hora da adoção de cada pet,
      gravada por `adoptPet` e nunca sobrescrita depois.
- [x] `petAgeYears(progress, petId, nowIso)` (`state/progression.ts`) — 1 dia real corrido = 1
      "ano" do pet, contado desde a adoção (reaproveita o mesmo `utcDayNumber` já usado por
      `feedPet`/`applyDailyLoginReward`).
- [x] `petLifecycleStage(careStage, ageYears)` — só promove um pet JÁ ADULTO (por cuidado real,
      `petStageFor`) pra "idoso" depois de tempo de convivência suficiente; nunca deixa um
      filhote/jovem pular fase por idade sozinha (preserva a regra original de "só cuidado faz
      crescer", ver comentário em `petStageFor`).
- [x] `backfillPetAdoptedAt(progress, nowIso)` — perfis com pet adotado antes desta funcionalidade
      existir começam a contar idade a partir de HOJE (nunca ficam travados sem data pra sempre).
- [x] `PetStage` ganha o valor `'idoso'`; `petStageScale('idoso')` usa a mesma escala de adulto (o
      corpo não encolhe de velho).
- [x] `World3D.tsx` (`rebuildPet`) aplica um tingimento grisalho no pelo (`Color3.Lerp`) só como
      sinal visual de "idoso" — nunca remove, esconde ou reduz o pet.
- [x] `PetPanel.tsx` mostra "🧓 Idoso" e "N anos de convivência" pra cada pet possuído.

## Fora de escopo (explicitamente decidido pelo usuário)

- **Morte/remoção do pet** — descartada de propósito depois da pergunta ao usuário. Um pet "idoso"
  fica nesta fase para sempre, sem regressão nem perda.
- **Idade acelerar o crescimento de filhote pra adulto** — a idade só decide "idoso" (cosmético,
  em cima de um adulto já crescido por cuidado real); nunca substitui `petCareCounts` como motor
  de crescimento (decisão original do lab-155, preservada de propósito).
