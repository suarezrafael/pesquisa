# Laboratório 138 — Recompensa de login diário

Status: concluído
Início: 2026-09-02
Fim: 2026-09-02
Commit inicial: d7d607e81d156c3498b3d1eddd0e013a05a37d4f

## Objetivo do laboratório

Item do "backlog de engajamento" discutido em chat (mesma lista de onde saíram baús/combo/bônus de
planeta/mobília por planeta/cronômetro de sobrevivência, labs 129-133) — o único item da lista que
nunca chegou a ser escolhido num `AskUserQuestion`. Recompensa em moeda por abrir o jogo em dias
consecutivos, incentivando o hábito de voltar todo dia sem depender de responder pergunta nenhuma.

## Funcionalidades planejadas
- [x] `Progress.loginStreak` novo — conta dias consecutivos que o jogo foi aberto.
- [x] `applyDailyLoginReward` (`progression.ts`) — compara o `lastPlayedAt` da sessão ANTERIOR
  contra hoje (mesmo par `touchLastPlayed`/`loadLastPlayedAt` do lab-91, sem storage novo):
  mesmo dia = nada; dia seguinte = incrementa e premia; hiato de 2+ dias (ou primeira sessão de
  todas) = reinicia em 1 e premia.
- [x] Recompensa só em moeda (nunca XP) — mesmo padrão de baú/pote de Marte/combo: bônus sem
  responder pergunta não abre nível/conteúdo educacional.
- [x] Toast de aviso (`DailyLoginToast.tsx`, mesmo padrão visual de `MarsRewardToast.tsx`)
  anunciando o dia da sequência e a moeda ganha.
- [x] Testes em `progression.test.ts` cobrindo os 4 casos (mesmo dia / dia seguinte / hiato /
  primeira sessão) + ciclo de 7 dias + XP intocado.

## Achado real durante a sessão (fora do escopo planejado, corrigido no mesmo lab)

Usuário reportou, testando `missaoaprendizado.com`: "na casa o catalog aparece a cama foguete
marcada como habilitado mover sendo que nao tenho esse objeto colocado na casa, outros objetos
estao assim." Mobília exclusiva de assinante (lab-107) nunca entra em `unlockedFurnitureIds`
(compra normal rejeita item `subscriptionOnly` de propósito) — a sala 3D (`World3D.tsx`) só
verificava essa lista pra decidir o que construir/mostrar, então a peça nunca aparecia de verdade
pra NENHUM assinante, mesmo `MyHousePanel.tsx` já mostrando "✓ Tem"/"Mover" certo há labs (mesma
regra `usable` de lá nunca tinha chegado na sala 3D). Corrigido passando `entitlementActive` como
prop nova pra `World3D` e aplicando a mesma regra em `refreshHouseFurnitureVisuals`.

## Fora de escopo (explicitamente adiado)
- Mostrar o `loginStreak` no painel `/familia` — não pedido, decidir depois se fizer sentido.
- Calendário visual de recompensas futuras ("veja o que ganha no dia 7") — MVP só mostra o dia
  atual ao ganhar, sem prévia do que vem a seguir.
