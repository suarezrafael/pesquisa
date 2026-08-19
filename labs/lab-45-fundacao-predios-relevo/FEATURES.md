# Laboratório 45 — Fundação funda em prédios (causa raiz real do "casa flutuando")

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: b9f8331

## Objetivo do laboratório
Usuário continuou vendo "casa flutuando" mesmo depois do lab-44 confirmar (via raycast no ponto
de ÂNCORA de cada escola) que todas tinham folga ~0. Pedido explícito: "examine a superfície do
planeta, como as coisas ficam sobre ela, ainda tem casa flutuando" — pista de que o problema não
era mais um objeto individual mal posicionado, e sim como os prédios se apoiam no relevo.

## Funcionalidades planejadas
- [x] **Causa raiz real encontrada**: escolas/loja/torre são caixas rígidas com UM único ponto de
      amostra do terreno (`surfacePos` via `terrainGroundRadial`) definindo posição E orientação
      (`alignmentQuaternion`). Verificação anterior (lab-44) só checava esse ponto — sempre dava
      folga ~0, porque o ponto em si está correto. O bug real: o terreno pode variar bastante
      dentro do footprint do próprio prédio (1,6 x 1,4 nas escolas) em relevo inclinado, deixando
      um canto da caixa flutuando (chão visível embaixo) enquanto o canto oposto afunda —
      confirmado ao vivo com raycast nos 4 cantos das 21 escolas: 9 delas com gap > 0,4 unidade,
      pior caso `school-q13` com +0,756 (canto claramente no ar).
- [x] **Corrigido**: fundação — uma caixa mais funda (altura 1,6) e um pouco mais larga que as
      paredes, parented ao mesmo `base`/`shopBase`/`towerBase`, cobrindo com folga qualquer
      variação local observada (máx. 0,756) sem precisar inclinar a caixa de paredes pra seguir o
      relevo. Aplicado nas 21 escolas, na loja e na torre.
- [x] Verificação: build limpo; ao vivo, screenshot de `school-q13` (pior caso, +0,756 no
      diagnóstico de canto) mostra o prédio solidamente apoiado, sem gap visível.
- [x] Incluído também: `settleMeshOnTerrain` — rochas de montanha (que já usavam
      `terrainGroundRadial` desde o lab-43) agora assentam por amostragem da própria malha (grid
      3x3 sobre os vértices) em vez de depender de uma esfera de colisão separada que
      ultrapassava a silhueta irregular da rocha — mesma classe de problema, correção mais geral.

## Fora de escopo (explicitamente adiado)
- Não foi estendida uma "fundação profunda" pra objetos menores (props/cactos/gatos) — o
  footprint deles é pequeno o bastante pra a variação de relevo dentro da própria base não ser
  visualmente perceptível (confirmado no lab-44).
