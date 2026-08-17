# Laboratório 29 — Correções: escolas afundadas na bacia do rio, rua abaixo do chão

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 8c705b3f8ac3d2797e204607dc6ec72d4aa45479

## Objetivo do laboratório
Dois relatos do usuário logo depois do lab-28 (mesma sessão): "a estrada continua abaixo do
solo" e "não vejo o rio nem a piscina" / "a casinha 14 está debaixo da terra". Investigado ao
vivo com ferramentas mais precisas que o lab-28 usou (raycast físico de verdade via
`havokPlugin.raycast`, não só comparação com o vértice mais próximo) — os dois são bugs reais
introduzidos pelo próprio lab-28, não relatos repetidos sem causa nova:

1. **Escolas afundadas** — a bacia do rio (nova no lab-28) foi adicionada sem checar se passava
   perto de alguma escola já existente. Confirmado: q06 (-0,31), q14 (-0,94, quase 1 unidade
   funda) e q17 (-0,46) estavam sentadas dentro da bacia do rio, muito abaixo do chão normal —
   q14 quase exatamente em cima da linha central do rio (0,9° de distância). Isso também explica
   o relato "não vejo o rio" — uma cratera dessas bem em cima da linha do rio provavelmente
   dominava a visão ali, escondendo a água/margem por trás do caos visual.
2. **Rua abaixo do chão** — confirmado por raycast físico de verdade (não só comparação de
   altura com o vértice mais próximo, que não é precisa o suficiente): um ponto específico do
   laço (perto de `theta≈0°`) tinha a malha RENDERIZADA do planeta até ~0,11 mais alta que o
   valor que a fórmula contínua de `terrainHeight` previa ali — um pico da ondulação de base que
   a malha grossa (48 segmentos) não consegue seguir bem entre dois vértices. A margem de
   +0,08 do lab-28 não cobria isso.

## Funcionalidades planejadas
- [x] Nenhuma bacia (lagoa/piscina/rio) carva perto de uma escola — `SCHOOL_DIRS` (nova
      constante de módulo, mesma fórmula usada pra montar as escolas) + `nearAnySchool()`,
      aplicada tanto na altura (`terrainHeight`) quanto na cor de margem (evita escola com chão
      normal mas cor de barro ao redor).
- [x] Margem de altura da rua aumentada de novo (de `+0,08` pra `+0,2`), baseada em dado real
      (pior caso medido por raycast em todo o laço), não em outro palpite.
- [x] Verificação: `npm run build` passa; varrido o laço inteiro da rua com raycast físico
      (96/96 pontos, folga positiva em todos, pior caso +0,089); confirmadas as 21 escolas com
      altura dentro da faixa normal (nenhuma "cratera"). Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Investigar a fundo POR QUE a malha grossa do planeta erra até 0,11 num pico específico da
  ondulação de base — a margem maior resolve o sintoma (rua sempre acima do chão renderizado)
  sem precisar entender o mecanismo exato do erro de discretização do Havok/Babylon.
