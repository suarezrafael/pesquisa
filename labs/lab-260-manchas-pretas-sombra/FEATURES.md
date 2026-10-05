# Laboratório 260 — Manchas pretas no terreno em dispositivo fraco de verdade

Status: implementado
Início: 2026-10-05
Fim: 2026-10-05
Commit inicial: 50231d2e778abf396724388a659be652559a8efb
Prioridade: P0 — usuário mandou print de um celular real mostrando grandes manchas pretas no chão

## Objetivo do laboratório

Usuário mandou um print do próprio celular (10 FPS, Android/Chrome) mostrando uma grande mancha
preta sólida cobrindo boa parte do terreno perto do "Hub de Jogos". Diferente de todos os bugs
visuais investigados nesta sessão (labs 255-259, todos sobre posicionamento/cor/câmera), esta é a
PRIMEIRA vez que o usuário testa num dispositivo real genuinamente fraco (FPS baixo) em vez de
desktop — e o sintoma (mancha preta sólida, bordas bem definidas) bate com um bug HISTÓRICO já
documentado no código (`lab-87`, comentário no `shadowGenerator`: "manchas pretas ao caminhar"),
mas numa escala muito maior.

## Funcionalidades planejadas

- [x] Tentar reproduzir com `?gpuTier=weak` (parâmetro de URL já descoberto no lab-259) — não
  reproduziu. Nota: no tier fraco, `shadowCastersEnabled: false` desde o início (nenhum caster é
  registrado), então a teoria de "shadow acne" clássica do lab-87 não se aplica a esse tier
  especificamente.
- [x] Ler o código do sistema de qualidade adaptativa (`applyAdaptiveEffectTier`,
  `qualityProfile.ts`) — achado: quando o jogo mede FPS baixo DURANTE a partida (não só no
  benchmark inicial, que pode classificar errado um aparelho "forte" que na prática não aguenta o
  jogo completo), o código reduz a qualidade progressivamente; ao chegar no nível mais baixo
  (tier 2), chama `shadowGenerator.dispose()` — isso DESTRÓI a textura do shadow map, mas dezenas
  de meshes espalhadas pelo arquivo (incluindo o `planet`) já têm `receiveShadows = true` com
  shader já compilado esperando amostrar essa textura.
- [x] Adicionar um gatilho de QA (`window.__debugForceAdaptiveTier`, dev-only) pra forçar esse
  downgrade sem precisar esperar um aparelho real travar — não dá pra simular só forçando
  `engine._deltaTime`, porque isso engana a própria medição de FPS que decide quando o downgrade
  acontece.
- [x] Confirmar ao vivo com um CONTROLE NEGATIVO direto: descartar a textura do shadow map
  manualmente (mesmo efeito de `shadowGenerator.dispose()`) na cena já carregada — reproduziu
  manchas pretas sólidas imediatamente (num carro e trechos de estrada/grama), visualmente
  idênticas em caráter ao print do usuário.
- [x] Corrigir: em vez de `shadowGenerator.dispose()` (destrói o recurso), esvaziar a lista de
  renderização da própria textura do shadow map (`shadowGenerator.getShadowMap().renderList = []`)
  — desliga o custo do passe de sombra (nada pra renderizar) sem invalidar o recurso que os
  shaders já compilados esperam encontrar. Mantido `sunLight.shadowEnabled = false`.
- [x] Confirmar ao vivo que o downgrade forçado (`__debugForceAdaptiveTier(2)`) NÃO produz mais
  manchas pretas depois da correção, no mesmo cenário ("Hub de Jogos").
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit. Mantido
  `__debugForceAdaptiveTier` permanentemente (dev-only, mesmo padrão dos outros `__debug*`
  já existentes no arquivo) — útil pra QA futura desta mesma classe de bug.

## Fora de escopo (explicitamente adiado)

- Investigar se o benchmark inicial de GPU está classificando aparelhos errado (o caso do usuário
  pode ter sido classificado "forte" e ainda assim rodar a 10 FPS) — fora do escopo deste lab, que
  é sobre o que acontece DEPOIS que o jogo já mede desempenho ruim, não sobre a classificação
  inicial em si.
- Mudar quaisquer outros parâmetros de `qualityProfile.ts` (contagem de props, resolução de
  sombra, etc.) — a causa raiz era especificamente o `.dispose()` indevido, não os valores de
  configuração em si.
