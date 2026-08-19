# Laboratório 34 — Torre do Tesouro (prédio navegável, protótipo) + moedas escondidas

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 83da113885bebd49c26e8b9f7a6234447d3f9617

## Objetivo do laboratório
Continuação da fila de pedidos do usuário (lab-32/33). Perguntado diretamente sobre escopo:

1. **Prédio navegável** — usuário escolheu "um prédio protótipo" (não os 21 de escola de uma vez):
   um prédio novo, separado do sistema de escolas/missões, com interior de verdade (chão físico,
   rampa até o andar de cima, moedas, um desafio pequeno lá dentro), pra validar o padrão antes de
   decidir se replica pras escolas.
2. **"Mais brincadeiras interativas"** — usuário escolheu (múltipla escolha): mini-games com
   bichos, colecionáveis escondidos/easter eggs, mais parkour. Só "colecionáveis escondidos" foi
   implementado neste laboratório (ver "Fora de escopo").

## Funcionalidades planejadas
- [x] Torre do Tesouro: prédio novo (não ligado a nenhuma missão), posição achada por busca de
      distância angular contra TODOS os marcos do mapa (~42,5° de folga do vizinho mais próximo).
      Reaproveita a técnica de parede-com-vão-de-porta já usada na lojinha, e o raycast físico
      real (`schoolGroundRadial`, já em escopo desde o lab-33) pra posicionar sem flutuar/afundar.
- [x] Interior real: chão físico no térreo, rampa inclinada (~32,6°) subindo até um mezanino no
      andar de cima, paredes/parapeito com colisão de verdade — tudo `PhysicsAggregate` estático,
      mesmo padrão de todo o resto do jogo.
- [x] Moedas: 2 no térreo, 3 no mezanino (mais valiosas — mesmo princípio "recompensa maior no
      topo" do segundo parkour), 1 numa plataforma-desafio flutuando acima do vão da rampa
      (precisa de um pulo pequeno pra alcançar — "mais desafios" dentro do prédio, não só subir).
- [x] **Bug real encontrado e corrigido durante a verificação**: a primeira versão da rampa tinha
      um percurso (3,6) maior que a própria profundidade do prédio (3,2) — a rampa atravessava as
      duas paredes (fundo e frente/porta), saindo do prédio pelos dois lados. Descoberto por
      raycast físico (o raio, em vez de acertar a rampa, acertava `towerFloor2` — a rampa estava
      por baixo do mezanino, não conectada a ele). Corrigido recalculando toda a geometria a
      partir de valores explícitos e verificados (profundidade do prédio aumentada pra 4,4,
      mezanino e rampa dimensionados pra se encontrarem exatamente na borda certa).
- [x] 8 moedas escondidas: uma no pico exato de cada montanha (`PLATEAU_CENTERS`) — só quem sobe
      até o topo de verdade encontra. Reaproveita o sistema de moedas já existente, sem mecânica
      nova.
- [x] Verificação: `npm run build` passa (3 rodadas); raycast físico real varrendo o percurso
      inteiro da rampa confirma que TODOS os pontos amostrados acertam `towerRamp` (não mais
      `towerFloor2`) com altura crescendo de forma monotônica (chão até o mezanino); posição do
      prédio comparada com o terreno real nas proximidades (diferença de 0,03 unidade, dentro da
      variação natural do relevo); 8/8 moedas de pico e 6/6 moedas da torre confirmadas presentes
      na cena. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Mini-games com bichos (escolhido pelo usuário, mas não implementado ainda — feature nova o
  bastante, sem mecânica existente pra reaproveitar) e um terceiro percurso de parkour (já tem
  dois nesta sessão) — deferidos pro próximo laboratório, ver `CONTEXT.md`.
- Replicar o padrão de prédio navegável pras 21 escolas — só depois de confirmar que o protótipo
  funciona bem jogando de verdade (não testado com movimento real nesta sessão, só raycast).
