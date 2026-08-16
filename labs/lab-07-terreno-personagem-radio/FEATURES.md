# Laboratório 07 — Terreno com relevo, personagem articulado, trilha estilo rádio

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: d40da20c4e376d64fb2886d52b9b2085be821180

## Objetivo do laboratório
Pedido do usuário: planeta deixar de ser uma esfera perfeitamente lisa (deformações, planaltos);
personagem menos "robotizado" (mais articulação — joelho, mais juntas); trilha sonora estilo
rádio (várias faixas que se alternam, não uma só repetindo); mais elementos interativos no mundo.

## Funcionalidades planejadas
- [x] Terreno com relevo real: função de altura (`terrainHeight`) combinando ondulação suave de
      base + alguns platôs (topo achatado, rampa suave na borda via smoothstep) — deformação de
      verdade na geometria, não textura/normal map
- [x] Colisor físico do chão acompanha o relevo (`PhysicsShapeType.MESH`, não mais `SPHERE`)
- [x] Props, portais/escolas, rio e grama reposicionados pra sentar exatamente sobre a altura do
      relevo em cada ponto (mesma função de altura usada pra deformar a malha)
- [x] Personagem com joelho (perna em 2 segmentos articulados, braço com cotovelo) — menos
      rígido/robotizado
- [x] Trilha sonora "estilo rádio": múltiplas melodias curtas que se alternam ao terminar cada
      uma (não repete a mesma em loop infinito)
- [x] Moedinhas colecionáveis espalhadas pelo terreno (giram, tocam um som ao coletar, somam ao
      contador de moedas) — resposta concreta ao pedido de "mais coisa pra interagir"
- [x] Testado de ponta a ponta: terreno com relevo visível, personagem andando com joelho
      articulado, trilha trocando de faixa, moeda coletável funcionando

## Fora de escopo (explicitamente adiado)
- Deploy real (pendente do usuário criar conta)
- Moderação de chat (pendência já registrada no lab-06)
- Suporte ao polo sul do planeta
