# Laboratório 157 — Ranking local entre perfis do aparelho

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: 643d123c352ac419800d6bd5659b582e8a18d49f

## Objetivo do laboratório

Último item do Grupo A do backlog social (lab-154): ranking só entre os PERFIS deste mesmo
aparelho (irmãos, lab-108), somando XP ganho NA SEMANA — sem backend, sem conta, comparando os
`Progress` já salvos localmente.

## Investigado antes de planejar

- `RankingPanel` já existe, mas mostra só quem está CONECTADO AGORA no relay global
  (`app/server-cf-relay`) — sem histórico, sem conceito de "semana". A pesquisa de mercado desta
  sessão apontou justamente que multiplayer anônimo global retém menos que "jogar com quem você
  conhece" — o ranking local entre irmãos do mesmo aparelho é exatamente esse caso.
- `Progress` não guarda "XP ganho nesta semana", só o total acumulado — precisa de um snapshot
  (valor do XP no INÍCIO da semana atual) pra calcular a diferença.
- `data/weeklyEvents.ts` já tem a definição de "semana" (número ISO 8601) usada pra girar o evento
  semanal — reaproveitada (`isoWeekKey`, exportada nesta sessão) pra que "essa semana" signifique
  a mesma coisa nos dois lugares.
- `state/storage.ts` só sabe ler o `Progress` do perfil ATIVO (`loadProgress`) — ranking entre
  perfis precisa ler os OUTROS perfis do roster (lab-108) direto do `localStorage`, sem trocar de
  perfil ativo.

## Funcionalidades planejadas

- [x] `data/weeklyEvents.ts`: `isoWeekKey(date)` exportada (chave "AAAA-Www" estável).
- [x] `types.ts`/`storage.ts`: `weeklyXpWeekKey`/`weeklyXpSnapshot` em `Progress`; `storage.ts`
      ganha `loadProgressForProfileId(id)` (lê qualquer perfil, não só o ativo) e exporta
      `getActiveProfileId`.
- [x] `state/progression.ts`: `syncWeeklyXpSnapshot(progress, nowIso)` (reseta o snapshot quando a
      semana muda) + `weeklyXpEarned(progress, nowIso)` (leitura pura, sem mutar). Testado (6 casos
      novos).
- [x] `state/useProgress.ts`/`App.tsx`: sincroniza o snapshot uma vez por sessão (mesmo gatilho de
      `touchLastPlayed`/login diário).
- [x] `world3d/RankingPanel.tsx`: abas "🌐 Online agora" (comportamento atual, intocado) / "📱
      Neste aparelho" (novo — só aparece com 2+ perfis no aparelho, mesmo espírito de
      `listProfiles`/`ProfilePicker` só aparecer com múltiplos perfis).
- [x] `npx tsc -b` / `npm run test` sem erros (131/131, 6 novos).
- [x] Verificação ao vivo: perfil de teste criado direto no `localStorage` (irmão fictício) com XP
      semanal maior que o perfil ativo — aba local mostrou "1º IrmaTeste — 250 XP esta semana" /
      "2º EspertoFoguete81 (você) — 30 XP esta semana", ordenado corretamente por XP da semana
      (não por XP total, onde o perfil ativo estaria na frente).

## Fora de escopo (explicitamente adiado)

- Ranking global de verdade (todos os jogadores, com histórico persistente) — exige backend com
  identidade de jogador, é o Grupo B do backlog (lab-154), bloqueado nas perguntas de arquitetura/
  segurança já registradas.
- Zerar o snapshot de perfis que não são abertos há muitas semanas (o cálculo já trata isso
  corretamente como "0 XP nesta semana" sem precisar de limpeza ativa).
