# Laboratório 168 — bugs urgentes de avatar/pet + pet acompanha pelo lado

Status: concluído
Início: 2026-09-09
Fim: 2026-09-09
Commit inicial: 75049310cb69636c818063cbb9d71c3068234e64

## Objetivo do laboratório

Pedido urgente do usuário, com print anexado, marcado explicitamente "urgente arrumar isso. e
fazer deploy": 3 bugs visuais/comportamentais reportados ao vivo na lojinha e no jogo, mais uma
mudança de comportamento do pet pra ficar consistente com os bichinhos (`Critter`) que já vagam
pelo planeta.

## Funcionalidades planejadas

- [x] **Bug: peças do avatar somem ao selecionar o boné na lojinha** (`studentFigure.ts`,
      `applyHat`, `hat.shape === 'cap'`) — a aba da lojinha (`AvatarPreviewScene`) olha de cima; a
      borda do boné era um cilindro cheio (disco 360°) maior que o raio da cabeça e dentro da
      faixa vertical dela, cobrindo o rosto por baixo de vários ângulos.
- [x] **Bug: "espetos" cruzando o rosto do avatar** (`studentFigure.ts`, `applyBonecoFeatures`,
      `features.special === 'mane'`, afeta Leão e Fênix) — o anel de espetos da juba ficava numa
      profundidade rasa que cruzava a mesma região dos olhos/focinho de certos ângulos.
- [x] **Bug: pet enterrado no chão em rampas/platôs** (`World3D.tsx`, loop de física do pet) — a
      altura do pet usava só a fórmula analítica de relevo (`terrainHeight`), que diverge da malha
      real perto das rampas dos platôs (mesma classe de bug documentada nos labs 95/124/134/135/
      151); trocado por raycast físico real (`terrainGroundRadial`) quando no planeta principal.
- [x] **Comportamento: pet acompanha pelo lado, com pulo, virando na direção do movimento** —
      antes o pet perseguia o rastro exato de trás do jogador, parado, sem nunca se comportar como
      os bichinhos (`Critter`) que já vagam pelo planeta. Agora persegue um ponto ao lado do
      jogador (perpendicular à direção que ele olha), com o mesmo pulo (`Math.sin`) e giro pra
      direção do movimento (matriz right/up/forward) já usados pelos bichinhos — funciona virando
      pra qualquer direção, não só andando reto.
- [x] **Bug reportado no meio da sessão: "vulcão de Vênus" com botão Mover mas invisível na casa**
      (`World3D.tsx`, `FURNITURE_VISUAL_KIND`) — as 6 recompensas de planeta (lab-130,
      `data/furniture.ts`, `meteorito_mercurio`/`vulcao_venus`/`mancha_jupiter`/`anel_saturno`/
      `cristal_urano`/`redemoinho_netuno`) nunca tinham entrada no mapa que decide a geometria 3D
      de cada peça — `refreshHouseFurnitureVisuals` pulava a peça em silêncio
      (`if (!visual) return`) pras 6, não só Vênus, mesmo `MyHousePanel`/`unlockPlanetFurnitureReward`
      já tratando o item como possuído de verdade (habilitando "Mover"). Adicionadas as 6 geometrias
      novas (temáticas ao que já existe em cada planeta: crateras, vulcão, mancha, anel, cristal de
      gelo, redemoinho).

## Fora de escopo (explicitamente adiado)

- **Ciclo de vida do pet (crescer, envelhecer, morrer)** — pedido pelo usuário no mesmo turno, mas
  adiado de propósito: "morte de pet" é uma decisão de design sensível pra um jogo infantil (mesmo
  cuidado já registrado no repo pra nunca punir a criança — sequência de login nunca zera, pet
  nunca fica doente por negligência). Vai precisar de uma conversa de design dedicada com o
  usuário antes de qualquer código, não encaixado dentro de uma correção de bug urgente.
