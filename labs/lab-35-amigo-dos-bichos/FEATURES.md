# Laboratório 35 — Mini-game "Amigo dos Bichos"

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 43980d160b357bfe5e2c7419a61f44588af0a201

## Objetivo do laboratório
Continuação da fila do lab-34: usuário escolheu "mini-games com bichos" como uma das direções
pra "mais brincadeiras interativas", ainda sem forma concreta. Proposta feita em
`lab-34/CONTEXT.md` (interação de proximidade simples, tipo "colecionar" as espécies, reaproveitando
o padrão de som-por-proximidade já usado pra pássaro/onça/cachorro/falcão) — implementada aqui.

## Funcionalidades planejadas
- [x] A primeira vez que o jogador chega bem perto (`FRIEND_RADIUS = 1.4`, bem mais perto que o
      raio de som de 3.5 — precisa "ir até" o bicho, não só passar do lado) de CADA espécie
      (coelho, esquilo, gato, passarinho, cachorro, onça, falcão — 7 no total, uma vez cada, não
      um bicho específico), toca o som de moeda e dá uma moeda de verdade
      (`onCollectCoinRef.current()`). Rastreado por um `Set<CritterKind>` (`metSpecies`),
      checado todo quadro no mesmo loop de IA de vagar dos bichos (não por timer, já que só
      dispara uma vez por espécie no total — não precisa economizar checagem).
- [x] Verificação: `npm run build` passa; recarregado ao vivo, confirmado os 39 bichos (7
      espécies) presentes na cena sem erro no console. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Terceiro percurso de parkour (outra escolha do usuário na mesma pergunta de escopo do lab-34)
  — fica pro próximo laboratório (lab-36), separado deste por foco único (convenção do projeto:
  cada laboratório pequeno o bastante pra caber num `CONTEXT.md` legível — os dois pedidos, embora
  escolhidos juntos, são features independentes o bastante pra não precisar do mesmo lab).
