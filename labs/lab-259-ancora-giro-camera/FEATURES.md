# Laboratório 259 — Âncora que limita o giro da câmera de vez

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

## Funcionalidades planejadas

- [x] Confirmar de novo que a escolinha "28" continua matematicamente correta (0,000° de erro) —
  reproduzido ao vivo, mesma checagem do lab-258.
- [x] Perguntar ao usuário explicitamente: suavizar mais (sem eliminar) ou implementar um limite
  de verdade (trade-off explicado: o chão perto dos PRÓPRIOS pés do jogador passaria a poder
  parecer levemente inclinado). Usuário escolheu o limite de verdade.
- [x] Implementar uma ÂNCORA de `camera.upVector` (`cameraUpAnchor`/`cameraUpAnchorPos`,
  `CAMERA_UP_ANCHOR_RADIUS = 2` metros): só reancora quando o jogador anda mais que o raio desde a
  última âncora. Parado dentro do raio, a âncora (e portanto a câmera depois de convergir) FICA
  PARADA — não persegue o `localUp` exato a cada quadro, mesmo depois de muito tempo parado.
- [x] Confirmar que reancorar é automático e seguro em qualquer transição (teleporte/portal/carro/
  foguete/interior de casa) sem precisar de tratamento especial em cada ponto — a própria checagem
  de distância do próximo quadro já dispara a reancoragem sozinha.
- [x] Resolver um obstáculo real de ambiente antes de poder testar: o navegador de automação ficou
  preso minutos na fase de BENCHMARK DE GPU (anterior à própria criação da `Scene`/`Engine` —
  achado novo nesta sessão, diferente do bloqueio de `waitForVisible()` já conhecido) por causa do
  throttle de `requestAnimationFrame` em aba em segundo plano. Contornado com o parâmetro de URL
  `?gpuTier=strong` (já existente no código, `developmentGpuTierOverride`, só em `import.meta.env.DEV`)
  — não precisou de nenhuma mudança de código pra isso, só descoberta da ferramenta já existente.
- [x] Medir ao vivo (não só por teleporte instantâneo, que sempre reancora em cima do alvo exato e
  mascara o teste — andando de verdade até um ponto e parando NO MEIO do raio de uma âncora): o
  ângulo de giro pendente agora PLATEIA num valor pequeno e NÃO continua convergindo pra zero
  mesmo depois de 5+ segundos parado (medido: 1,93° estável por vários segundos, antes convergia
  pra 0,00° em ~5-10s).
- [x] Confirmar visualmente (teleporte simulando andar até perto da escolinha + parar + esperar):
  a escolinha "28" e a "Torre do Tesouro" aparecem visivelmente mais retas na tela, sem o tombo
  dramático do print do usuário.
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit.

## Fora de escopo (explicitamente adiado)

- Mudar o comportamento de carro, foguete ou interior de casa — só a câmera normal a pé, mesmo
  escopo do lab-258.
- Eliminar por completo qualquer inclinação residual perto do jogador — é o preço consciente e
  combinado com o usuário pra eliminar o tombo de objetos distantes; não é um bug a corrigir.
- Investigar mais a fundo o pequeno drift de posição que às vezes reancora de novo depois de vários
  segundos parado "de verdade" (provavelmente animação de respiração/balanço do personagem parado,
  não física) — não afeta a conclusão principal (o giro não converge mais pro `localUp` exato), só
  faz o valor do platô variar um pouco ao longo do tempo em vez de ficar 100% fixo.
