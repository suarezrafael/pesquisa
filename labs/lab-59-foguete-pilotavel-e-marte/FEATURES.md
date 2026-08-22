# Laboratório 59 — Foguete pilotável + Marte

Status: concluído
Início: 2026-08-20
Fim: 2026-08-20
Commit inicial: 16087c7ca9e25b354a7038b85145b9dbf3236ab0

## Objetivo do laboratório
Usuário: "o foguete ficou legal, mas o lance da viagem do foguete é o boneco entrar no foguete,
deve ter como controlar como tem no carro, em que você consegue ir pra trás e pra frente com as
setas ou direcional, e viajar pelo espaço entre os dois planetas, e o outro planeta é Marte, não
tem árvores só rocha e ele é meio marrom, e o que tem lá são cavernas." — trocar o teleporte
instantâneo do lab-58 por uma viagem pilotada (like o carro) ao longo do espaço entre os dois
planetas, e reskinar o planetinha secundário como Marte.

## Funcionalidades planejadas
- [x] **Pilotagem do foguete** — ao apertar E perto do foguete, o boneco entra nele (mesmo padrão
      visual de "sentado" já usado no carro: pernas/joelhos/braços/cotovelos rotacionados) e o
      jogador controla o avanço com as mesmas teclas/direcional do carro (seta pra cima/baixo,
      reaproveitando o `y` combinado joystick+teclado já calculado por quadro).
- [x] **Viagem real pelo espaço** — em vez de teleporte instantâneo, o foguete percorre um arco de
      Bézier quadrático fixo entre a posição da plataforma de partida e a de chegada, com duração
      alvo de ~9s em aceleração máxima; câmera acompanha a nave (posição + `upVector` interpolados)
      durante o trajeto.
- [x] **Marte** — planetinha secundário reskinado: chão marrom (em vez de verde-oliva), sem
      árvores (só rochas reaproveitando os mesmos modelos glTF), decorações novas de entrada de
      caverna (`buildCaveEntrance`, dois montes de rocha + uma "boca" cilíndrica escura) espalhadas
      entre as rochas.
- [x] Build (typecheck + produção) passa.
- [x] Verificado ao vivo (dev server + teleporte de debug): ida completa (embarcar → pilotar →
      pousar em Marte, chão marrom/só rochas/cavernas visíveis) e volta completa (embarcar no
      foguete de volta → pilotar → pousar no planeta principal perto da plataforma original) via
      chamada direta de `__handleInteractPress()` + evento de teclado real. Sem erro no console.

## Fora de escopo (explicitamente adiado)
- Recolorir os modelos de rocha reaproveitados especificamente pra Marte (alguns mantêm a cor
  original do glTF, ligeiramente esverdeada/azulada em vez de marrom-avermelhada) — cosmético
  menor, não afeta a funcionalidade.
- Controle de pitch/yaw livre da nave (só avanço/recuo ao longo de um trajeto fixo, como o carro
  não vira livremente fora de sua pista) — pedido do usuário foi especificamente "ir pra trás e
  pra frente", não navegação livre em 3D.
- Sincronizar a viagem com o multiplayer — mesma decisão já tomada no lab-58, ainda fora de escopo.
