# Laboratório 27 — Ajustes do carro dirigível (rua maior, boneco visível)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
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
- [x] Rua maior: `STREET_PHI` sobe de 18° pra 25° (limite real de segurança recalculado durante
      este lab — o disco de água da piscina, não a bacia de terreno inteira, ~1,37× mais raio)
      sem cruzar fisicamente nenhum marco existente.
- [x] Rua com leve ondulação orgânica (wobble em `phi`, mesmo padrão já usado no rio) — não fica
      mais um círculo geometricamente perfeito visto de cima, lê mais como uma estrada de
      verdade contornando o relevo.
- [x] Boneco visível dirigindo: em vez de esconder a figura (`setEnabled(false)`), ela é
      parentada no carro (`studentFigure.root.parent = carro.root`) com um offset local sentado
      na cabine — anda e gira junto com o carro automaticamente (herda a transformação do pai),
      sem precisar sincronizar posição/rotação a cada quadro feito com o avatar a pé.
- [x] Verificação: `npm run build` passa; testado ao vivo — folga real (não estimada) contra o
      disco de água da piscina (0,69) e contra a escola mais próxima (1,64); boneco confirmado
      parentado e visível ao entrar, mantendo o offset local durante a condução, desparentado e
      visível ao sair. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Pose de "sentado" de verdade (pernas dobradas tipo dirigindo) — o boneco fica na pose parada
  padrão, só reposicionado em cima do carro; animação de sentar é polimento à parte.
