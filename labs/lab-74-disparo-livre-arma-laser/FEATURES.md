# Laboratório 74 — disparo livre da arma a laser

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 433ee104a83b16da4f9122193293ba1a30c81edf

## Objetivo do laboratório
Pedido do usuário (mensagem literal): "quando eu pego a arma laser mesmo nao estando em marte,
ao apertar E tem que disparar o laser e fazer som." Antes, a arma a laser só disparava dentro do
combate em Marte, perto de um robô vivo — apertar E com a arma equipada em qualquer outro lugar
(incluindo em Marte, mas longe de um inimigo) não fazia nada.

## Funcionalidades planejadas
- [x] Apertar E com a arma a laser equipada dispara o feixe visual, em qualquer lugar (não só em
  Marte perto de um robô)
- [x] O disparo toca som (reaproveitado `playLaserZap`, já usado pelo laser de parkour)

## Fora de escopo (explicitamente adiado)
- Disparo livre da espada (o usuário só pediu a arma a laser) — não implementado.
- Efeito de dano/gameplay do disparo livre fora de Marte (é só visual/sonoro, não afeta nada —
  o combate de verdade contra ET/robô continua exclusivo de Marte).
