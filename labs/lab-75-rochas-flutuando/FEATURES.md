# Laboratório 75 — rochas flutuando perto de platôs

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: c420465dec49d7124470f1079db84bf8567fb964

## Objetivo do laboratório
Pedido do usuário (mensagem + print): "os morros na escala 1.00 ficam invisiveis, na escala 1.40,
1.80 aparecem certinho no celular, so no computador que esta bugado." Depois de investigação ao
vivo (teleporte de QA, medição de física, comparação de escala) e um segundo print mostrando rochas
grandes claramente flutuando no ar perto do Prédio dos Enigmas ("aqui esta o print das coisas
flutuando. mas a fisica do chao funciona eu ando sobro o morro invisivel"), a causa raiz identificada
não foi a escala de renderização (`hardwareScalingLevel`) — foi confirmada como coincidência (o
computador nunca sai de escala 1.00 por não ser considerado `isLowEndDevice`, então qualquer bug
sempre "correlaciona" com esse valor ali) — e sim rochas do sorteio geral de decoração (`PROP_COUNT`)
flutuando de verdade perto de bordas íngremes de platô, sem a correção que rochas de montanha/
escolas/torre já recebem.

## Funcionalidades planejadas
- [x] Identificar a causa raiz real (não a escala de renderização) via investigação ao vivo
- [x] Rochas do sorteio geral de props (`PROP_COUNT`, 65 no computador vs 24 no celular — por isso
  mais visível no computador) param de flutuar perto de bordas de platô
- [x] Rochas/cactos do sorteio do deserto (`DESERT_PROP_COUNT`) recebem a mesma correção
- [x] Árvore/flor/cogumelo/tronco continuam INTOCADOS (não usam a correção — copa larga faria a
  lógica de "ponto mais baixo" afundar a árvore inteira no chão, bug novo encontrado e evitado
  durante este mesmo laboratório antes de ir pra produção)
- [x] Colisor invisível de cada prop realinhado com a posição corrigida (senão ficaria pra trás)

## Fora de escopo (explicitamente adiado)
- Nenhum sistema de props além do scatter geral + deserto foi tocado (escolas/torre/rochas de
  montanha já tinham a correção; carros/animais/NPCs não usam posicionamento por
  `terrainGroundRadial` da mesma forma, fora do escopo deste bug).
