# Laboratório 126 — Moeda bônus por assinatura

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 5a1b6e4c63c0c096a6103855b3aee6ff7f2d2ba9

## Objetivo do laboratório

Item do backlog original nunca construído: `prompt.md` §6 (P2) lista "moeda bônus por assinatura"
entre os itens planejados. Confirmado por busca no código que não existe hoje nenhum multiplicador
de moeda ligado a `entitlementActive` — a única coisa parecida é o evento semanal (`weeklyEvents.ts`,
`event.coinMultiplier`), que é temporário e vale pra TODO jogador, não um benefício de assinatura.

## Investigado antes de planejar

- **Precedente exato já existe pro mecanismo de multiplicador**: `applyQuestCompletion`/
  `applyPlanetQuestCompletion` (`progression.ts`) já calculam `awardedCoins = Math.round(
  quest.coinReward * event.coinMultiplier)` pro evento semanal "Semana da Recompensa Dupla" —
  mesmo padrão de multiplicador aplicado na recompensa CREDITADA, nunca no valor base da quest
  (`quest.coinReward` em si nunca muda). A moeda bônus de assinante é o MESMO tipo de multiplicador,
  só que ligado a `entitlementActive` em vez de à data.
- **Moedas neste jogo só compram cosméticos** (avatar, roupas, mobília de "Minha Casa") — nunca
  missões, nível, ou progresso educacional. Um multiplicador de moeda pra assinante não viola a
  regra inegociável do plano comercial ("nunca gatear conteúdo educacional atrás de assinatura",
  `docs/plano-comercial-backend.md`) porque não afeta o que é educacional — só a velocidade de
  acumular pontos pra cosméticos, que já são o produto pago em si.
- **XP não deve ser afetado** — só moeda. Decisão de escopo (não tecnicamente necessária, mas
  alinhada ao espírito do projeto): boostar XP daria a impressão de "pagar pra subir de nível mais
  rápido", que é exatamente o tipo de percepção pay-to-win que o projeto evita mesmo fora de
  conteúdo estritamente educacional (XP também desbloqueia viagem a planetas, `requiredLevel` em
  `DESTINATION_PLANETS`, lab-115). Moeda não desbloqueia nada além de cosméticos, então é o lugar
  certo pro benefício.
- **`entitlement.active` já está disponível em `App.tsx`** (via `useEntitlement()`) exatamente onde
  `completeQuest`/`completePlanetQuest` são chamados — não precisa de nenhum estado novo, só passar
  o valor já existente adiante.
- **`RewardToast.tsx` já tem o padrão de exibir uma linha de bônus condicional** (`hasBonus`/
  `.reward-bonus-line`, pro evento semanal) — mesmo padrão visual reaproveitável pro bônus de
  assinante, como uma segunda linha independente (os dois podem estar ativos ao mesmo tempo:
  assinante numa semana de evento — as duas linhas aparecem, cada uma clara sobre sua própria
  origem).

## Decisões técnicas tomadas

- **Multiplicador fixo `SUBSCRIBER_COIN_MULTIPLIER = 1.5`** (novo em `progression.ts`) — decisão de
  produto razoável sem informação de mercado mais específica (nem "dobrar" como o evento semanal,
  que é uma promoção temporária mais agressiva de propósito, nem um bônus pequeno demais pra ser
  perceptível).
- **Multiplicadores se EMPILHAM** (evento semanal × bônus de assinante), não se substituem — um
  assinante numa semana de bônus dobrado ganha os dois efeitos juntos. Mais generoso, mais simples
  de implementar (só multiplicar os dois fatores), e nenhum dos dois foi desenhado pensando em
  exclusão mútua.
- **`entitlementActive` como novo parâmetro de `applyQuestCompletion`/`applyPlanetQuestCompletion`**,
  com default `false` — mesmo padrão do parâmetro `event` (já tem default `getCurrentWeeklyEvent()`),
  preserva compatibilidade com os testes/chamadas existentes que não passam esse argumento.
- **Só `awardedCoins` recebe o multiplicador — `awardedXp` fica como estava** (ver "Investigado"
  acima pro porquê).
- **Moedinhas espalhadas pelo terreno (`applyCoinCollected`) NÃO recebem o bônus** — são +1 moeda
  fixa por moedinha, sem multiplicador de evento semanal também (conferido: `applyCoinCollected`
  não usa `event` nem nunca usou); manter esse comportamento consistente (só recompensa de MISSÃO
  tem multiplicador, nunca as moedinhas soltas) evita uma inconsistência nova.

## Funcionalidades planejadas

- [x] `progression.ts`: `SUBSCRIBER_COIN_MULTIPLIER` novo; `applyQuestCompletion`/
      `applyPlanetQuestCompletion` ganham parâmetro `entitlementActive = false`, aplicado só em
      `awardedCoins`.
- [x] `useProgress.ts`: `completeQuest`/`completePlanetQuest` aceitam `entitlementActive` e
      repassam.
- [x] `App.tsx`: passar `entitlement.active` nas duas chamadas.
- [x] `RewardToast.tsx`: nova linha de bônus condicional pro assinante (`entitlementActive` como
      prop nova), independente da linha do evento semanal.
- [x] `progression.test.ts`: 5 testes novos cobrindo (a) sem assinatura, comportamento idêntico a
      antes; (b) com assinatura, multiplica só as moedas — XP intocado; (c) empilha com o
      multiplicador do evento semanal; (d) idempotente (sem crédito duplo ao completar de novo);
      (e) mesma cobertura pra `applyPlanetQuestCompletion`. Suite: 47→52.
- [x] Verificação: `npm run build`/`npm run test` sem erros; verificação ao vivo (dev server +
      browser automation) do caminho SEM assinatura — quest real respondida corretamente, +40
      moedas creditadas (20 base × 2 do evento semanal ativo, sem bônus de assinante — confirma
      que a nova lógica não quebrou nem afetou o caminho não-assinante), sem erro de console. O
      caminho COM assinatura ativa não foi simulado ao vivo (ver "Pendências") — confiança vem dos
      5 testes unitários dedicados + paridade de código com a linha de bônus do evento semanal, já
      comprovada ao vivo na mesma tela.
