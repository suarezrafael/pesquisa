# Contexto — Laboratório 126 — Moeda bônus por assinatura

Preenchido em: 2026-08-30
Commit inicial → final: 5a1b6e4c63c0c096a6103855b3aee6ff7f2d2ba9..HEAD

## O que foi feito

Construiu o único item do backlog original (`prompt.md` §6, P2) que ainda não existia: assinantes
ativos agora ganham um multiplicador de 1,5× nas moedas creditadas ao completar uma missão (nunca
no XP).

- `app/src/state/progression.ts`: novo `SUBSCRIBER_COIN_MULTIPLIER = 1.5`; `applyQuestCompletion`
  e `applyPlanetQuestCompletion` ganharam um 4º parâmetro `entitlementActive = false`, aplicado só
  em `awardedCoins` (`Math.round(coinReward * event.coinMultiplier * (entitlementActive ? 1.5 :
  1))`) — empilha com o multiplicador do evento semanal em vez de substituí-lo.
- `app/src/state/useProgress.ts`: `completeQuest`/`completePlanetQuest` aceitam e repassam
  `entitlementActive`.
- `app/src/App.tsx`: as duas chamadas passam `entitlement?.active` (já disponível via
  `useEntitlement()`, nenhum estado novo precisou ser criado).
- `app/src/components/RewardToast.tsx`: nova linha "👑 Bônus de moeda de assinante aplicado!",
  condicional a uma nova prop `entitlementActive`, independente da linha já existente do evento
  semanal (as duas podem aparecer juntas).

## Decisões técnicas tomadas

- **Só moeda, nunca XP** — moeda neste jogo só compra cosmético (avatar/roupas/mobília), nunca
  desbloqueia missão/nível/conteúdo educacional, então não viola a regra inegociável do plano
  comercial. XP também abre viagem a planetas (`requiredLevel`, lab-115) — boostar XP por
  assinatura teria um cheiro de pay-to-win que o projeto evita mesmo fora de conteúdo estritamente
  educacional.
- **Multiplicadores se empilham** (evento semanal × bônus de assinante) — mais generoso, mais
  simples, e nenhum dos dois foi desenhado pensando em exclusão mútua.
- **Moedinhas soltas pelo terreno (`applyCoinCollected`) ficam de fora** — nunca tiveram
  multiplicador de evento semanal também; manter essa consistência (só recompensa de MISSÃO recebe
  multiplicador) evita uma inconsistência nova.
- **Reaproveitou 100% o padrão já existente do evento semanal** (`event.coinMultiplier`) em vez de
  inventar um mecanismo novo — mesma função, mesmo lugar, mesmo jeito de expor na UI.

## Pendências / dívidas conhecidas

- **O caminho COM assinatura ativa não foi verificado ao vivo no navegador** — simular uma
  assinatura real neste ambiente de dev exigiria contornar a proteção anti-bypass do lab-90
  (editar `localStorage` manualmente é tratado como adulteração e pode ser revertido na
  revalidação). Confiança vem de 5 testes unitários dedicados (cobrindo o cálculo exato, o
  empilhamento com o evento semanal, XP intocado, e idempotência) mais paridade de código com a
  linha de bônus do evento semanal, já confirmada funcionando ao vivo na mesma tela
  (`RewardToast`). Mesmo padrão de confiança já usado no lab-107 pra uma situação equivalente.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Backlog do `prompt.md` §6 (P0/P1/P2) está agora **completo** — não há mais item nenhum ali sem
laboratório correspondente. Sem prioridade óbvia pro próximo laboratório; perguntar ao usuário.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 52/52 passando (5 novos, cobrindo o bônus de assinante).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation, perfil "Teste Missoes" já existente):
  quest real (`q23`, "Troca de Figurinhas") respondida corretamente sem assinatura ativa — +40
  moedas creditadas (20 base × 2 do evento semanal, sem bônus de assinante, como esperado), sem
  erro de console. Caminho com assinatura não simulado ao vivo (ver "Pendências").
- Como verificar de novo: `cd app && npm run test` roda os 5 testes de
  `progression.test.ts` cobrindo o bônus; ao vivo, responder uma missão real com uma conta que
  tenha assinatura ativa de verdade deve mostrar "👑 Bônus de moeda de assinante aplicado!" no
  `RewardToast` com 1,5× mais moedas.
