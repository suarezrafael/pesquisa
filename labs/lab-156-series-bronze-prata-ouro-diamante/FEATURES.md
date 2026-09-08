# Laboratório 156 — Séries (Bronze/Prata/Ouro/Diamante)

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: 4a971079b7a0c778bcab27056c61846f7b93a4a8

## Objetivo do laboratório

Segundo item do Grupo A do backlog social (lab-154). Métrica escolhida pelo usuário via
`AskUserQuestion`: nível/XP total acumulado (não a sequência de login nem o combo de acertos, as
outras duas opções oferecidas).

## Investigado antes de planejar

- `getLevel(xp)`/`xpForLevel(level) = level * 40` já existem (`state/progression.ts`) — nível é
  derivado do XP total, fonte única de verdade, sem storage novo.
- XP total disponível só de conteúdo "de uma vez" (30 missões principais + 36 escolinhas de
  planeta, sem contar coleta de moeda repetível, que não dá XP): ~1300 XP, o que dá um nível
  máximo em torno de ~33-34 com a fórmula atual — usado pra calibrar os limiares abaixo em
  quartis aproximados, não um número arbitrário.

## Funcionalidades planejadas

- [x] `state/progression.ts`: `PlayerSeries` (`'bronze' | 'prata' | 'ouro' | 'diamante'`),
      `seriesForLevel(level)` — limiares: Bronze 1-8, Prata 9-16, Ouro 17-24, Diamante 25+.
      Testado (8 casos nos limiares exatos).
- [x] `HudHeader.tsx`: emblema da série (🥉🥈🥇💎) junto do nível já exibido no HUD.
- [x] `npx tsc -b` / `npm run test` sem erros (125/125, 1 novo).
- [x] Verificação visual ao vivo: perfil novo mostra "Nível 1 · 🥉 Bronze"; XP forçado pra 320
      (limiar exato de nível 9) mostra "Nível 9 · 🥈 Prata" corretamente.

## Fora de escopo (explicitamente adiado)

- Qualquer recompensa/desbloqueio atrelado à série (não pedido — é só um indicador visual de
  status por enquanto).
- Mudar a métrica pra outra coisa depois — decisão já tomada pelo usuário nesta sessão.
