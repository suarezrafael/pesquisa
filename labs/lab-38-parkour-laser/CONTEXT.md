# Contexto — Laboratório 38 — Quarto parkour: plataformas retangulares com laser

Preenchido em: 2026-08-17

> **Correção registrada no lab-39**: o teste de física real descrito abaixo em "Verificação feita"
> (teleportar o jogador exatamente na posição de um laser e medir o empurrão) de fato confirmou
> que pisar no laser causa a queda — mas o lab-39 descobriu que esse teste específico não
> distinguia entre "detecção funcionando certo" e um bug real (limite inferior de altura
> faltando na checagem do laser, corrigido no lab-39) — as duas explicações davam o mesmo
> resultado observado aqui. A conclusão (laser causa queda de verdade) continua válida; só note
> que o teste não isolava a causa tão bem quanto pareceu na hora. Ver `labs/lab-39-.../CONTEXT.md`
> pro histórico completo e os testes que isolam os três cenários corretamente.

## O que foi feito

1. **`PARKOUR4_*`** (`src/world3d/World3D.tsx`, depois da recompensa do terceiro parkour) — 8
   plataformas retangulares (2,0 largura × 0,8 profundidade, `PhysicsAggregate` `BOX` estático,
   mesmo padrão dos outros três) em linha reta (sem ziguezague — `parkour4Forward` só, sem
   `parkour4Right`/deslocamento lateral), material cinza metálico (tema "instalação com laser",
   distinto dos outros três).
2. **`ParkourLaser[]` (`parkour4Lasers`)** — um feixe visual (`laserBeam-${i}`, caixa fina
   vermelha emissiva, `disableLighting=true`, sem física — é um gatilho, não um obstáculo sólido)
   por plataforma, posicionado a `LASER_HEIGHT = 0.5` acima da plataforma ANTERIOR (de onde o
   jogador pula), a `LASER_APPROACH_T = 0.6` do caminho entre as duas (mais perto da plataforma
   de destino — "pular ANTES o laser" significa sair do chão antes de chegar nesse ponto).
3. **Detecção de acerto** (no loop de movimento do jogador, `src/world3d/World3D.tsx`) — pra cada
   laser, decompõe `pos - laser.worldPos` em componente radial (`Vector3.Dot(toLaser, localUp)`)
   e lateral (o resto do vetor) — acerto = lateral < `LASER_HIT_RADIUS` (0,42, uma zona de perigo
   estreita, não a passagem toda) E radial < 0,05 (ainda não subiu o bastante pra limpar o feixe).
   Checado só quando `laserStunTimer <= 0` (evita redisparar o empurrão repetidamente enquanto o
   corpo ainda atravessa a zona durante a própria queda).
4. **`laserStunTimer`/`laserStunSeed`** (novo estado, junto de `jumpRequested` no topo do
   `setup()`) — ao acertar: 2,2s de controle suspenso, empurrão inicial (`facing` invertido +
   `localUp` invertido, magnitude 4 — pra fora da plataforma e pra baixo, sem isso a física
   manteria o personagem apoiado na mesma plataforma indefinidamente), som `playLaserZap()` (novo
   em `ambientAudio.ts`, um glissando dente-de-serra descendente + ruído filtrado, "bzzt"
   elétrico). Durante o timer: o código normal de movimento (throttle/pulo/`setLinearVelocity`) é
   pulado inteiramente — só a gravidade real (`body.applyForce`, já aplicada todo quadro,
   incondicional) continua agindo, então o personagem cai por física de verdade, não por
   teleporte ou animação fake.
5. **Visual de queda** — enquanto `laserStunTimer > 0`, a orientação do personagem visual usa uma
   cambalhota contínua (`Quaternion.RotationAxis(right, tumbleAngle)` combinada com o alinhamento
   de superfície) em vez da orientação normal alinhada com a direção de andar; o ciclo de
   caminhada (balanço de perna/braço) fica suspenso no mesmo período (`moving = laserStunTimer <=
   0 && ...`).
6. **Recompensa**: 6 moedas no topo (igual ao terceiro parkour) — o próprio laser já é o risco
   extra deste percurso, não precisou de mais degraus pra justificar a recompensa.

## Decisões técnicas tomadas

- **Percurso reto, não ziguezague** — os outros três já cobrem "desafio de plataformas simples"
  (1º) e "mais alto"/"espiral" (2º, 3º); adicionar ziguezague lateral EM CIMA do laser deixaria o
  quarto desafio acumulando duas fontes de dificuldade ao mesmo tempo (timing do pulo + posição
  lateral), arriscando ficar injusto/frustrante numa primeira versão. O laser já é a variação de
  verdade pedida.
- **Empurrão físico, não teleporte, pra "desgrudar" da plataforma** — gravidade sozinha
  (`body.applyForce`) não tira um corpo de cima de uma superfície sólida com contato ativo (o
  solver de física mantém o repouso); um empurrão inicial (velocidade decisiva pra trás e pra
  baixo) é o jeito fisicamente correto de garantir que o personagem realmente caia, em vez de só
  ficar "grudado" tremendo em cima da mesma plataforma. Depois desse empurrão inicial, a queda em
  si é 100% física real (nenhuma velocidade é mais definida manualmente até o timer acabar).
- **Timer fixo (2,2s) em vez de detectar "já pousou"** — mais simples e previsível que tentar
  achar o momento exato de pouso (que dependeria de outro raycast/checagem de `grounded`
  específica pra esse estado); 2,2s é tempo de sobra pra cair de qualquer altura das 4 plataformas
  de parkour existentes (a mais alta, a espiral do lab-36, sobe ~9,35 unidades) mais o tempo do
  empurrão inicial lateral, confirmado na prática (ver "Verificação").
- **Erro real encontrado e corrigido durante o build**: a primeira versão declarava
  `parkour4Right` (achando que precisaria pra algum cálculo de largura/orientação lateral) mas
  nunca chegou a usar (percurso reto não precisa de eixo lateral pra posicionar nada) —
  `noUnusedLocals` do TypeScript pegou isso no build, corrigido removendo a variável.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção; primeira tentativa falhou por variável
  não usada, corrigida, segunda tentativa exit code 0).
- Ao vivo: 8/8 `parkour4Platform-*` confirmadas com `physicsBody`; 8/8 `laserBeam-*` confirmadas
  presentes (sem física, como esperado — são gatilho, não obstáculo sólido); 6/6 moedas
  `coinPivot-parkour4Top-*` confirmadas; `window.__parkour4Lasers` (hook `dev`-only) confirma os
  8 lasers com posição mundial calculada.
- **Teste do mecanismo completo com física real** (não leitura de estado interno nem simulação
  isolada): `__debugTeleport` posicionou o colisor do jogador EXATAMENTE na posição mundial de um
  laser (índice 2), zerando a velocidade nesse instante. 200ms depois: velocidade medida
  diretamente do corpo físico (`getLinearVelocity()`) já não-zero (magnitude 2,03, com componente
  vertical/lateral consistente com o empurrão configurado) — confirma que a detecção de acerto
  disparou e aplicou o empurrão. 1,5s depois: distância radial do colisor caiu de 14,06 pra 13,40
  — confirma queda de verdade em andamento. Checagem final (~3,3s depois do acerto, com folga):
  raycast físico filtrado (mesma técnica comprovada do lab-31/33/34, ignora qualquer colisor que
  não seja `'planet'`) confirma o jogador pousado sobre o TERRENO REAL do planeta (gap de 0,32
  unidade, dentro do esperado pro raio do colisor), com velocidade quase zero (0,269) — o
  personagem realmente "caiu até o planeta novamente" e ficou parado lá, não preso em nenhuma
  plataforma nem flutuando.
- **Não testado**: pular sobre um laser de propósito (jogando de verdade, cronometrando o pulo) —
  só o "acerto" foi testado com física real; o caminho de sucesso (pular alto o bastante na hora
  certa) não foi simulado nesta sessão.

## Pendências / dívidas conhecidas

- O caminho de SUCESSO (pular por cima do laser na hora certa) não foi testado — só o caminho de
  falha (pisar nele). Recomenda-se o usuário confirmar jogando que dá pra completar o percurso.
- Sons/animações dos outros bichos/mecanismos não foram reafetados por este laboratório — mudança
  isolada ao quarto parkour.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Confirmar jogando que o caminho de SUCESSO do parkour do laser funciona (pular na hora certa
   sobre cada feixe) — só o caminho de falha foi verificado com física real nesta sessão.
2. Nenhum outro pedido novo pendente. Recomendação repetida dos labs 36/37: uma sessão de
   PLAYTESTING REAL (jogando de verdade) de tudo construído nos labs 31-38 continua sendo a maior
   prioridade antes de mais features novas — a lista de coisas nunca testadas com movimento
   humano real está crescendo (rio removido, montanhas, Torre do Tesouro, mini-game de bichos, os
   4 parkours, correr/caminhar, agora o laser).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
