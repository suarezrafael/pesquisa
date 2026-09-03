# Laboratório 140 — Câmera durante o posicionamento de mobília + colisão entre peças

Status: concluído
Início: 2026-09-02
Fim: 2026-09-02
Commit inicial: 9d753ea32a059bc22f976668987b5b7278ef7dc9

## Objetivo do laboratório

Dois refinamentos pedidos pelo usuário logo depois de testar o lab-139 em produção: "ao eu mover
os objetos na casa, eu tenho que conseguir girar a câmera com o mouse dar zoom out ainda não
consigo, senão não consigo acompanhar pra onde estou movendo o [móvel]" e "os objetos precisam ter
uma posição válida com teste de colisão nas paredes e outros objetos ou será uma posição inválida
pra posicionar o objeto."

## Funcionalidades planejadas
- [x] Câmera livre (arrastar/roda do mouse, lab-139) funcionando também DURANTE o modo de
  posicionar mobília — estava bloqueada de propósito por uma suposição de conflito com os botões
  ◀ ▶ que acabou sendo errada (refs diferentes, sem conflito de verdade).
- [x] Teste de colisão entre a peça sendo movida e outros obstáculos (balcão de compras + outras
  peças já colocadas) — posição inválida vira realce vermelho na peça + aviso na barra + botão
  "Confirmar posição" desabilitado. Colisão com parede já existia desde o lab-136 (clamp de
  movimento, não deixa nem chegar lá).

## Fora de escopo (explicitamente adiado)
- Bounding box exata por peça (usa raio aproximado por tipo — suficiente pro jogo, não pretende
  ser física de verdade).
- Empurrar/reorganizar automaticamente outra peça que já esteja no caminho.
