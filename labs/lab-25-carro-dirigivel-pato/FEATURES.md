# Laboratório 25 — Pato no rio + carro dirigível + rua em volta do planeta

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 50d8f891a82d60333309669966cee4e3e0254140

## Objetivo do laboratório
Pedido direto do usuário (chegou no meio da sessão, durante o lab-24): "coloque pato no rio, e
faca com que o boneco que eu comando ocnsiga entrar no carro ao se aproximar eu pressioar alguma
tecla e entrar no carro e andar de carro na estrada atraves das setas, e a estrada deve fazer a
volta no planeta." Três pedidos:
1. Pato nadando no rio (já existe `buildPato()`, usado hoje só na lagoa).
2. Jogador consegue entrar/sair de um carro (tecla perto do carro) e dirigir pela rua com as
   setas.
3. A rua (hoje um trecho curto, lab-15) precisa fazer uma volta completa no planeta.

## Funcionalidades planejadas
- [x] Pato no rio: reaproveita `buildPato()`, nada pra frente/trás ao longo de `riverCenter`
      (mesmo padrão de `pathIndex` já usado pelos carros), sem trocar nada existente da lagoa.
- [x] Rua vira um laço fechado: em vez do arco curto atual (theta 280°-320°, phi variando junto),
      um círculo completo (phi fixo ~18°, theta 0°-360°) perto do polo norte (onde o jogador
      nasce) — escolhido por cálculo de folga (nenhum marco existente tem phi < 36°, então uma
      rua em phi=18° nunca cruza plataforma/lagoa/piscina/parkour/lojinha/deserto/escola nenhuma,
      e ainda fica bem perto do spawn, fácil de achar). `MeshBuilder.CreateRibbon` com
      `closePath: true`.
- [x] Carros de IA (`carros`, lab-15) passam a dar voltas contínuas no laço fechado (sem mais
      ricochetear nas pontas — um laço fechado não tem "ponta").
- [x] Entrar/sair do carro: tecla nova (`e`) perto de um carro (distância curta) alterna estado
      "dirigindo" — jogador visual/físico fica escondido/parado, câmera passa a seguir o carro.
      Dica visual (rótulo GUI flutuante, mesmo padrão de bolha de fala dos NPCs) aparece só
      quando o jogador está perto o bastante de um carro parado (sem estar dirigindo já).
- [x] Dirigir: setas/WASD cima/baixo avançam/recuam o carro ao longo da rua (`pathIndex`), mesmo
      mecanismo de movimento dos carros de IA, só que controlado pelo jogador. Ao sair, o jogador
      reaparece do lado do carro, não dentro dele.
- [x] Verificação: `npm run build` passa; testado ao vivo com `KeyboardEvent` real — entrar
      trava/esconde o avatar, segurar seta move o carro, sair reaparece perto do carro (bug real
      de teleporte encontrado e corrigido durante a verificação, ver `CONTEXT.md`).

## Fora de escopo (explicitamente adiado)
- Física de colisão carro-carro ou carro-jogador (os carros de IA já não tinham isso antes deste
  lab; carro dirigido pelo jogador também não ganha agora — é movimento ao longo de um trilho,
  não física livre).
- Multiplayer: outros jogadores não veem o carro que alguém está dirigindo em tempo real (exigiria
  estender `RemoteState` de novo). Cosmético/local só, como os chapéus (lab-24).
- Esconder a lojinha/outros marcos que ficavam perto da rua antiga — conferido que a lojinha já
  estava a ~68° de distância da rua antiga (nunca esteve perto de verdade), então mover a rua não
  quebra nenhuma relação existente.
