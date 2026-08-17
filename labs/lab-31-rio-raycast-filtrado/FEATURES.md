# Laboratório 31 — Raycast do rio filtrado (colisor errado) + folga contra z-fighting

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 8019a0f8b6df573bfe1eb693c920f3e2779b5a44

## Objetivo do laboratório
Relato do usuário logo depois do lab-30: "o rio ainda esta bugado agora aparece uma tirinha dele,
mas o resto esta dentro do planeta." O fix do lab-30 (`realGroundRadial`, raycast físico contra a
malha do planeta) corrigiu a ALTURA da água na maior parte dos casos, mas dois problemas reais
continuavam:

1. **Raycast sem filtro** — `havokPlugin.raycast()` não distingue QUAL colisor acerta primeiro:
   pode acertar o avatar, um bicho, uma árvore/rocha com colisor esférico, em vez do planeta.
   Confirmado com diagnóstico ao vivo: um raycast no meio de um segmento do rio retornou
   `body.transformNode.name === "avatarCollider"` em vez de `"planet"` — a altura usada pra
   posicionar aquele ponto da água vinha do avatar, não do chão real.
2. **Folga insuficiente contra z-fighting** — mesmo com o raycast já certo (acertando só o
   planeta), a água ficava só 0,03 unidade acima do chão real. Testado ao vivo (material da água
   trocado pra emissivo/unlit magenta, eliminando qualquer efeito de iluminação/reflexo): só uma
   pequena tira da malha vencia o teste de profundidade contra o terreno por baixo — o resto
   ficava invisível mesmo com posição já correta. Isso bate exatamente com o relato do usuário
   ("aparece uma tirinha, o resto dentro do planeta").

## Funcionalidades planejadas
- [x] `realGroundRadial()` filtra acertos que não sejam o planeta — repete o raycast (até 6
      tentativas) passando `ignoreBody` com o corpo do acerto anterior, até acertar
      `transformNode.name === 'planet'` ou esgotar as tentativas (cai pra fórmula nesse caso).
- [x] Constante `RIVER_WATER_CLEARANCE` (0,15, era 0,03 implícito) — folga da água acima do chão
      real grande o bastante pra não depender de sorte no depth buffer.
- [x] Verificação: `npm run build` passa; raycast físico varrendo os vértices reais da malha do
      rio confirma folga constante de ~0,15 em todos os pontos amostrados, sem nenhum resultado
      contaminado por outro colisor. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Investigar por que a água continua difícil de enxergar de certos ângulos bem rentes ao chão
  mesmo com a malha comprovadamente presente, contínua e na altura certa (provável reflexo do
  material PBR bem espelhado com o céu claro, não um bug de posição/profundidade) — ver
  "Pendências" em `CONTEXT.md`.
