# Laboratório 27 — Ajustes do carro dirigível (rua maior, boneco visível)

Status: em andamento
Início: 2026-08-17
Commit inicial: 9700cdaeef2cc5cb7a4354f4017fd859425006f3

## Objetivo do laboratório
Dois relatos diretos do usuário jogando a build do lab-25:

1. "a estrada deve fazer a volta no planeta, nao em circulo" — a rua do lab-25 é um laço fechado
   real (não ping-pong), mas ficou uma volta pequena e apertada (raio de latitude ~18°, bem perto
   do polo norte) — lê mais como "uma rotatória pequena num canto" do que "uma estrada que dá a
   volta no planeta". Pedido: fazer maior, e não com cara de círculo geométrico perfeito.
2. "o boneco deve ficar em cima do carro ao apertar E" — hoje (lab-25) o personagem visual fica
   **escondido** (`setEnabled(false)`) enquanto dirige; o usuário quer o boneco visível, sentado/
   em cima do carro.

## Funcionalidades planejadas
- [ ] Rua maior: `STREET_PHI` sobe de 18° pra perto do limite seguro (~32°, ainda abaixo do
      marco mais próximo do polo — a piscina, a 36°) — quase dobra o raio/circunferência da
      volta, sem perder a garantia de não cruzar nenhum marco existente (mesmo cálculo de folga
      do lab-25, só com uma margem menor de segurança).
- [ ] Rua com leve ondulação orgânica (wobble em `phi`, mesmo padrão já usado no rio) — não fica
      mais um círculo geometricamente perfeito visto de cima, lê mais como uma estrada de
      verdade contornando o relevo.
- [ ] Boneco visível dirigindo: em vez de esconder a figura (`setEnabled(false)`), ela é
      parentada no carro (`studentFigure.root.parent = carro.root`) com um offset local sentado
      na cabine — anda e gira junto com o carro automaticamente (herda a transformação do pai),
      sem precisar sincronizar posição/rotação a cada quadro feito com o avatar a pé.
- [ ] Verificação: `npm run build` passa; testar ao vivo — comparar raio/posição da rua nova
      (maior, ~32° em vez de 18°) contra todos os marcos (ainda sem cruzar nenhum); confirmar que
      o boneco aparece visível em cima do carro ao entrar, e volta a andar normal ao sair.

## Fora de escopo (explicitamente adiado)
- Pose de "sentado" de verdade (pernas dobradas tipo dirigindo) — o boneco fica na pose parada
  padrão, só reposicionado em cima do carro; animação de sentar é polimento à parte.
