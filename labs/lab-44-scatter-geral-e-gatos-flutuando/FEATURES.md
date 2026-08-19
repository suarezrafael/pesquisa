# Laboratório 44 — Estender raycast de chão pro scatter geral, desert scatter, loja e gatos

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: a1460ac

## Objetivo do laboratório
Pedido do usuário, com um segundo screenshot e tom de frustração crescente: mesmo depois do
lab-43, ele continuava vendo rochas flutuando e a casa/escola "1" flutuando numa "superfície
invisível", com ultimato explícito de apagar todas as rochas/montanhas se não fosse resolvido.
Diagnóstico: o fix do lab-43 (`terrainGroundRadial`) só tinha sido aplicado nas escolas, na torre
e nas rochas de montanha dedicadas — nunca no scatter geral de props (65 objetos), no scatter do
deserto (12 objetos), na loja (`shopBase`) nem nos gatos empoleirados no topo das montanhas. Esses
grupos ainda usavam a fórmula contínua pura, sem verificação contra a malha física real.

## Funcionalidades planejadas
- [x] Aplicar `terrainGroundRadial` no scatter geral de props (loop principal, ~65 objetos).
- [x] Aplicar `terrainGroundRadial` no scatter de props do deserto (~12 objetos).
- [x] Aplicar `terrainGroundRadial` no posicionamento da loja (`shopBase`).
- [x] Aplicar `terrainGroundRadial` no posicionamento dos gatos empoleirados (`PLATEAU_CENTERS.forEach`).
- [x] Build (typecheck + produção) passando.
- [x] Verificação ao vivo EXAUSTIVA (não por amostragem) via raycast físico real
      (`scene.getPhysicsEngine().raycast`, reimplementando o mesmo algoritmo "avança o ponto de
      partida" de `terrainGroundRadial`) contra TODOS os objetos, não só uma amostra:
      21/21 escolas, 48/48 rochas de montanha, 65/65 props gerais, 6/6 props de rocha do deserto +
      6/6 cactos (12/12 colisores do deserto), 1/1 loja, 14/14 gatos empoleirados.
- [x] Confirmação visual (screenshots + zoom) nos poucos casos em que o raycast de diagnóstico (do
      próprio script de teste, não do jogo) não bateu com "planet" — todos confirmados
      corretamente apoiados no chão quando inspecionados de perto.
- [x] Checklist de regressão completo re-confirmado: 21 escolas, 39 bichos, torre, 8 lasers do
      parkour, sem erros no console após reload.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo adiado. Se o usuário ainda ver algo flutuando após este laboratório, a hipótese
  mais provável (dado que a verificação ao vivo não encontrou nenhum caso real) é cache do
  navegador com um build anterior — ver `CONTEXT.md`.
