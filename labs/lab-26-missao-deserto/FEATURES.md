# Laboratório 26 — Missão no bioma do deserto

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 61c961812a68d9247a9cbc75a811ee3e97d55318

## Objetivo do laboratório
Item deixado explicitamente pendente em `labs/lab-23-bioma-deserto/CONTEXT.md` ("O que o próximo
laboratório deve desenvolver", item 1): o bioma de deserto (lab-23) ficou só decorativo — areia,
cactos, rochas — sem nenhuma razão de gameplay pra visitar (nenhuma missão/escola por perto). Na
época, não dava pra simplesmente adicionar uma escola lá porque a posição de TODAS as escolas é
calculada algoritmicamente (ângulo áureo por índice, em `quests.forEach`), e mudar esse algoritmo
mudaria a posição das 20 escolas já existentes.

## Funcionalidades planejadas
- [x] Nova missão `q21` (`src/data/quests.ts`) — tema de exploração no deserto (leitura, no
      estilo dos outros textos curtos já existentes no catálogo), desbloqueada só depois da
      antiga "Missão Final" (q20), como um "bônus" de quem já terminou a trilha principal.
- [x] Posição fixa só pra esta missão (`World3D.tsx`) — um pequeno mapa `QUEST_FIXED_UP` (id →
      direção) consultado no loop que monta as escolas; se a missão tiver uma entrada nesse mapa,
      usa essa posição fixa (perto do centro do bioma de deserto, `DESERT_CENTER_DIR`) em vez da
      fórmula de ângulo áureo — as outras 20 escolas continuam exatamente onde estavam, sem
      recalcular nada pra elas.
- [x] Verificação: `npm run build` passa; confirmado ao vivo que a escola de `q21` nasce a
      ~0° de `DESERT_CENTER_DIR` (essencialmente exata) e que as escolas q01/q20 continuam em
      posições normais. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Mudar o algoritmo de posicionamento pra aceitar posição fixa em qualquer missão de forma geral
  — só a `q21` precisa disso agora; generalizar sem um segundo caso de uso real seria
  especulativo.
- Mais customização de avatar (a outra sugestão pendente de lab-23/lab-24) — fica pro próximo
  pedido do usuário sobre customização, se vier.
