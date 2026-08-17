# Laboratório 33 — Montanhas maiores, casas em cima delas com colisão, novo parkour, bichos novos

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: cdcfaefd930e64b94a4fa5e3ae8a755e32632a80

## Objetivo do laboratório
Vários pedidos do usuário chegados em sequência na mesma rodada de feedback:

1. "esses objetos de montanha ficaram muito bonitos, você pode fazer eles maiores e outros no
   mapa, e em vez de botar as casinhas em pontos flutuantes invisíveis no mapa pode colocar elas
   em cima deles, mas com um tamanho proporcional, elas precisam ter colisão" — com screenshots
   mostrando escolas (7, 1) claramente flutuando no ar, separadas do chão.
2. "faça mais desafios que o parkour de degraus ficou legal, coloque um desafio maior de blocos
   mais alto e bem lá em cima ganha mais moedas."
3. "pode colocar mais brincadeiras interativas no mapa 3D. e sons engraçados de conversa e pum,
   onças, cachorro, falcão."

Investigado: as escolas já eram posicionadas por `PLANET_RADIUS + terrainHeight(dir)` (só a
fórmula contínua), sem o mesmo tipo de correção por raycast já aplicada em rua/rio nos labs
anteriores — perto de uma borda de platô (relevo mais íngreme), o erro de discretização
malha-vs-fórmula (mesma causa raiz documentada em lab-29/30/31) fica maior, explicando escolas
flutuando visivelmente. Além disso, nenhum prédio de escola tinha colisão física — o jogador
atravessava a parede andando.

## Funcionalidades planejadas
- [x] `PLATEAU_CENTERS` (montanhas): as 4 originais tiveram `radius`/`height` aumentados (~+35%);
      mais 4 foram acrescentadas, posições escolhidas por varredura de distância angular contra
      todos os marcos existentes do mapa (lagoa, piscina, deserto, parkour, lojinha) pra não
      sobrepor nenhum.
- [x] Escolas posicionadas por raycast físico real (`schoolGroundRadial`, mesma técnica
      filtro-de-colisor do lab-31) em vez de só a fórmula contínua — elimina o flutuar/afundar
      perto de bordas de platô. Verificado: as 21 escolas ficam a ~1e-6 unidade do chão real
      (ruído de ponto flutuante, efetivamente zero) depois do fix.
- [x] Colisão física real nas paredes de cada escola (`PhysicsAggregate`, `BOX`, estático) — antes
      só visual, o jogador atravessava andando.
- [x] Segundo desafio de parkour: 14 degraus (o dobro do primeiro, 7), local achado por varredura
      de distância angular contra todos os marcos (~44° de folga do vizinho mais próximo);
      recompensa de 5 moedas agrupadas no topo em vez de 1.
- [x] Três bichos novos (cachorro, onça, falcão) — modelos baixo-poli no mesmo estilo dos
      existentes (coelho/esquilo/gato/passarinho), integrados na mesma IA de vagar (falcão voa
      como o passarinho; cachorro/onça vagam pelo chão como os outros terrestres).
- [x] Sons novos, todos sintetizados via Web Audio (sem arquivo baixado, mesmo padrão de todo
      áudio do projeto): rosnado de onça, latido de cachorro, grito de falcão (disparados por
      proximidade, mesmo mecanismo do canto do passarinho) + dois sons "engraçados" (conversa
      bobinha tipo "blablablá", "pum") disparados raramente por qualquer bicho perto do jogador.
- [x] Verificação: `npm run build` passa; raycast físico real confirmando as 21 escolas no chão
      certo; checagem de que as 21 paredes têm corpo físico; screenshot confirmando prédio sem
      gap visível e montanha maior visível nas proximidades. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- "Mais brincadeiras interativas no mapa" — pedido vago demais pra implementar sem mais contexto
  do usuário; não abordado neste laboratório.
- Prédios navegáveis (entrar, subir escada, achar moedas, mais desafios dentro) — pedido chegou
  numa mensagem separada do usuário (ver lab-32/CONTEXT.md, "O que o próximo laboratório deve
  desenvolver"); feature grande o bastante (interior navegável, não só malha decorativa por fora)
  pra merecer laboratório(s) próprio(s), não incluída aqui.
