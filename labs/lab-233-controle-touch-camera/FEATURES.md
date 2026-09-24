# Laboratorio 233 - Direcao pelo touch direito

Status: implementado localmente, validacao fisica pendente
Inicio: 2026-09-23
Fim: -
Commit inicial: 1417859cce701dcb72fed8a5b526b41aed87c8a1

## Problema

As criancas preferem apontar o boneco arrastando o dedo na area direita.
Antes, esse gesto girava sobretudo a camera: o avatar recebia so 35% do
angulo, com limite de 1,1 rad/s, contra 2,6 rad/s do joystick esquerdo.

## Escopo e aceite

- [x] Fazer o avatar acompanhar todo o angulo do arraste touch direito, com
  suavizacao e velocidade maxima iguais as do direcional esquerdo.
- [x] Preservar joystick esquerdo, mouse no desktop, recenter e multitoque.
- [x] Manter pinça para zoom in/out, com limites distintos dentro/fora de casa.
- [x] Cobrir giro, FPS baixo e zoom com testes; rodar build e lint.
- [ ] Testar no Redmi Pad 2: arraste direito enquanto anda, giro inverso,
  pinça, joystick + camera simultaneos, entrada/saida de casa e modal aberto.

## Fora de escopo

- Alterar velocidade de corrida ou sistema de fisica.
- Mudar HUD, monetizacao ou analytics infantil.

## Risco

Arraste rapido pode deixar uma pequena defasagem enquanto o avatar respeita
o limite de 2,6 rad/s. Ajustar so apos observacao no tablet real.
