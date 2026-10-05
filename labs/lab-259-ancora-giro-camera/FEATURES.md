# Laboratório 259 — Correção direcional que reduz o giro da câmera de vez

Status: implementado
Início: 2026-10-05
Fim: 2026-10-05
Commit inicial: 2bfd0a975127b035b17c0e6239ff6bf44a4fb619
Prioridade: P0 — usuário circulou de novo a mesma escolinha do lab-258, depois do deploy

## Objetivo do laboratório

Minutos depois do deploy do lab-258 (suaviza o giro da câmera), o usuário mandou outro print
circulando a MESMA escolinha ("28", perto da "Torre do Tesouro") ainda tombada na tela. O lab-258
só atrasava a convergência da câmera pro `localUp` exato de onde o jogador está — documentado como
limite honesto: parado tempo suficiente, o tombo completo ainda aparecia. Foi exatamente esse caso.

**Este laboratório passou por duas versões.** A v1 (âncora por distância andada) foi implementada,
testada ao vivo e aberta em PR — mas o review automático do Copilot achou dois problemas reais
(não garantia o corte de tombo pretendido; raio em metros não escalava com o tamanho do planeta)
antes de mesclar. A v2 (correção angular em direção a `camFacing`, descrita abaixo) substituiu a
v1 por completo, resolvendo os dois achados pela raiz. Ver `CONTEXT.md` pro histórico completo.

## Funcionalidades planejadas

- [x] Confirmar de novo que a escolinha "28" continua matematicamente correta (0,000° de erro) —
  reproduzido ao vivo, mesma checagem do lab-258.
- [x] Perguntar ao usuário explicitamente: suavizar mais (sem eliminar) ou implementar um limite
  de verdade (trade-off explicado: o chão perto dos PRÓPRIOS pés do jogador passaria a poder
  parecer levemente inclinado). Usuário escolheu o limite de verdade.
- [x] (v1, substituída) Implementar uma âncora de `camera.upVector` por distância percorrida.
- [x] (v1, substituída) Resolver um obstáculo real de ambiente antes de poder testar: o navegador
  de automação ficou preso minutos na fase de BENCHMARK DE GPU (anterior à própria criação da
  `Scene`/`Engine` — achado novo nesta sessão, diferente do bloqueio de `waitForVisible()` já
  conhecido) por causa do throttle de `requestAnimationFrame` em aba em segundo plano. Contornado
  com o parâmetro de URL `?gpuTier=strong` (já existente no código, `developmentGpuTierOverride`,
  só em `import.meta.env.DEV`) — não precisou de nenhuma mudança de código pra isso, só descoberta
  da ferramenta já existente. (Permanece válido pra v2, mesmo obstáculo de ambiente.)
- [x] Review automático do Copilot na v1 achou 2 problemas reais antes de mesclar: (severidade
  alta) a âncora não garantia reduzir o tombo do prédio específico — se o jogador parasse bem na
  hora de reancorar, o gap zerava igual a antes; (severidade média) o raio de 2 metros
  correspondia a um raio angular bem maior em planetas menores (Mercúrio, raio 4).
- [x] Reprojetar do zero (v2): em vez de uma âncora por posição, inclinar `localUp` um ângulo fixo
  (`CAMERA_UP_LOOK_AHEAD_ANGLE = 0.2` rad) em direção a `camFacing` — puramente angular, sem
  metros nem raio de planeta, e sempre alinhado com o que o jogador está efetivamente olhando.
- [x] Medir ao vivo (com movimento de verdade via `keydown`/`keyup`, não teleporte instantâneo, que
  mascararia o teste) em 3 abordagens diferentes até parar perto da escolinha: o ângulo até o
  `localUp` real dela caiu de forma CONSISTENTE em todos os casos (25,3°→12,8°, 16,4°→4,3°,
  7,5°→4,0°) — nunca piorou.
- [x] Confirmar visualmente (andar até perto da escolinha + parar + esperar convergir): a
  escolinha "28" e a "Torre do Tesouro" aparecem visivelmente mais retas na tela, sem o tombo
  dramático do print do usuário.
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit.

## Fora de escopo (explicitamente adiado)

- Mudar o comportamento de carro, foguete ou interior de casa — só a câmera normal a pé, mesmo
  escopo do lab-258.
- Eliminar por completo qualquer inclinação residual perto do jogador — é o preço consciente e
  combinado com o usuário pra reduzir o tombo de objetos distantes; não é um bug a corrigir.
- Testar o efeito em seções de parkour (pulos) — `CAMERA_UP_LOOK_AHEAD_ANGLE = 0,2` escolhido
  como valor moderado por precaução, mas não validado especificamente nessa mecânica.
