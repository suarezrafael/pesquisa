# Laboratório 258 — Suaviza o giro da câmera (não era bug de posicionamento)

Status: implementado
Início: 2026-10-05
Fim: 2026-10-05
Commit inicial: 3d4507164b92a39bdb5c1d542d766f177a605f78
Prioridade: P0 — usuário mandou um QUINTO print ("olha isso eu estou flutuando")

## Objetivo do laboratório

Depois do deploy do lab-257, o usuário mandou mais dois prints. O primeiro, escuro (chovendo no
jogo), ambíguo — pedi esclarecimento e o usuário confirmou "meu personagem" estava flutuando. O
segundo, mais claro, mostrava a escolinha "28" visivelmente TOMBADA na tela, perto da "Torre do
Tesouro". Diferente de TODOS os labs anteriores desta investigação (95/124/151/254/255/256/257),
desta vez a causa raiz não é um bug de posicionamento, cor ou malha — é um efeito real e esperado
da câmera num planeta pequeno, que pode (e deve) ser suavizado.

## Funcionalidades planejadas

- [x] Confirmar matematicamente que a escolinha "28" está corretamente orientada: aplicar o
  `rotationQuaternion` dela ao eixo Y local reproduz exatamente a direção radial da própria
  posição dela (erro de ponto flutuante apenas) — não há erro de rotação na escolinha.
- [x] Confirmar que `camera.upVector` acompanha a direção radial de ONDE O JOGADOR ESTÁ PARADO
  (não do objeto olhado) — medido ao vivo: `camera.upVector` bate com o `up` do personagem até a
  4ª casa decimal.
- [x] Medir o ângulo entre o `up` do personagem e o `up` da escolinha nessa situação: 24,7°, pra
  uma distância de ~6,5m entre os dois — consistente com a curvatura do planeta (raio 13:
  6,5/13 ≈ 0,5 rad ≈ 28,6°, bem próximo do medido).
- [x] Concluir: qualquer prédio/platô a poucos metros de distância vai girar a câmera o bastante
  pra parecer tombado na tela, mesmo perfeitamente vertical no próprio referencial — efeito de
  curvatura, não bug.
- [x] Perguntar ao usuário se queria suavizar esse comportamento (não decidir sozinho uma mudança
  de design/sensação de câmera) — usuário confirmou que sim.
- [x] Reduzir a velocidade do giro da câmera (`camera.upVector`, fator de lerp 0,15 → 0,025) só no
  modo de câmera a pé (não em carro/foguete/interior de casa — escopo deliberadamente restrito ao
  caso reportado).
- [x] Descartar misturar com uma referência "mundo" fixa (`Vector3.Up()`) depois de medir que ela
  fica a mais de 90° do `up` de verdade perto de vários platôs do hemisfério sul do planeta
  (índices 8-11 de `PLATEAU_CENTERS`) — misturar com ela pioraria a câmera ali, não melhoraria.
- [x] Medir ao vivo a nova velocidade de convergência: a 60 quadros (~1s a 60fps) parado, ~15° de
  giro ainda pendente (antes, convergia quase tudo em poucos quadros); convergência completa em
  ~180 quadros (~3s).
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit.

## Fora de escopo (explicitamente adiado)

- Eliminar completamente o giro se o jogador ficar parado tempo suficiente (continua convergindo,
  só mais devagar) — exigiria uma referência de câmera com atraso próprio e persistente entre
  quadros, reiniciada corretamente em cada ponto de teleporte/viagem entre planetas/carro/
  foguete/interior de casa. Risco alto de ficar com ângulo "grudado" errado depois de alguma
  viagem rápida sem eu conseguir testar ao vivo todos esses pontos nesta sessão.
- Mudar o comportamento de câmera em carro, foguete ou interior de casa — só a câmera normal a pé,
  que foi o caso relatado.
- Qualquer mudança de jogabilidade, recompensa ou regra de missão.
