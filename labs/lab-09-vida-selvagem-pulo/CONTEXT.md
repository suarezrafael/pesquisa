# Contexto — Laboratório 09 — Animais selvagens, pulo, lagoa/piscina, terreno com variação de cor

Preenchido em: 2026-08-16
Commit inicial → final: 5e6193c (fim do lab-08) .. HEAD (commit deste wrap)

## O que foi feito

1. **Pulo** (`JUMP_SPEED`, tecla espaço): edge-triggered (só dispara na transição solta→pressionada,
   não repete segurando) e só funciona "no chão" — checado comparando a distância do personagem
   ao centro do planeta contra `PLANET_RADIUS + terrainHeight(localUp) + AVATAR_RADIUS + 0.05`
   (a mesma fórmula usada pra "altura de repouso" em todo o resto do código) com uma tolerância
   pequena. Aplica a velocidade radial (`localUp.scale(JUMP_SPEED)`) por cima da velocidade
   tangencial normal — a gravidade radial que já existia cuida do resto (sobe, desacelera, desce).
2. **Animais selvagens** (`Critter`, `buildCoelho`/`buildEsquilo`/`buildPassarinho`): 20 bichos
   (8 coelhos, 6 esquilos, 6 passarinhos — pedido "mais animais" depois do primeiro round),
   construídos só de primitivas. IA de vagar: anda até um alvo *perto* do ponto atual (não em
   qualquer lugar da faixa caminhável — isso foi ajustado depois que a primeira versão fazia o
   bicho andar em linha reta por boa parte do planeta, parecendo um robô "teleportando" de vagar
   em vagar), descansa um tempo aleatório, escolhe outro alvo perto. Terrestres pulam enquanto
   andam; o passarinho voa numa altura fixa acima do terreno com bater de asa senoidal.
3. **Lagoa** (`pond`, `pondCritters`): peixinhos, pato e tartaruga nadando em círculos concêntricos
   num plano local tangente à esfera (aproximação razoável pro raio pequeno da lagoa).
4. **Piscina** (`poolWater`/`poolRim`/`poolPeople`): 5 pessoas (era 3 — pedido "mais pessoas"),
   reaproveitando `buildStudentFigure` com cores de camisa variadas, boiando com deriva lenta em
   círculo + balanço de braço (nadadinha) + bolha de fala decorativa (`POOL_CHAT_LINES`, texto
   piscando por cima da cabeça via `TextBlock` linkado ao mesh — pedido "fasa as pessoas se
   mecherem e falando").
5. **Mochila redesenhada**: de uma caixa única (lia como "cubo nas costas") pra um corpo mais
   alto/estreito + aba no topo + duas bolsas laterais + pontas de alça aparecendo por cima dos
   ombros — otimizado pra ler bem *de costas*, já que a câmera do jogo é sempre em 3ª pessoa
   atrás do personagem (pedido "fasa uma mochila que der para entender").
6. **Variação de cor no terreno**: cor por vértice (`VertexBuffer.ColorKind`), não textura de
   arquivo — mistura verde/verde-seco por um ruído barato (mesmo estilo de seno/cosseno já usado
   em `terrainHeight`) e mistura pedra/terra nas partes íngremes (inclinação medida via
   `dot(normal, direção radial)`). `planetMat.albedoColor` virou branco pra não multiplicar com a
   cor do vértice e escurecer tudo (pedido "arrume os morros eles estao sem textura").

## Bugs reais encontrados e corrigidos (não invenção — cada um confirmado por evidência)

- **Personagem deitado de bruços** (`studentFigure.root.rotationQuaternion = tmpQuat` sem
  `.clone()`): o jogador local era a ÚNICA coisa na cena que reaproveitava o objeto `Quaternion`
  de escrataroundch compartilhado (`tmpQuat`) por referência direta, sem clonar — funcionava
  porque, antes deste laboratório, nada mais na mesma volta de quadro escrevia em `tmpQuat` depois
  do jogador. Os novos loops de bichos/lagoa passaram a reescrever `tmpQuat` no mesmo quadro,
  sobrescrevendo silenciosamente a rotação do personagem pela orientação do ÚLTIMO bicho
  processado. Corrigido clonando também no jogador local (`tmpQuat.clone()`), igual já era feito
  pros jogadores remotos.
- **Lagoa/piscina "de pé como parede"**: `MeshBuilder.CreateDisc` nasce com a normal no eixo Z
  (como um disco/moeda encarando a câmera), não no eixo Y — `alignmentQuaternion` assume que a
  face "de cima" da malha é o eixo Y (é assim que todo o resto do código já usa essa função).
  Aplicar `alignmentQuaternion` num `CreateDisc` deixava a água em pé, não deitada. Trocado por
  `MeshBuilder.CreateCylinder` bem baixo (mesmo truque já usado na moeda, que também precisa
  nascer "deitada" no eixo Y).
- **Chão furando a água** (o "mapa bugado"): o disco de água é plano numa altura só, mas o
  ruído de base do terreno varia o suficiente dentro da área da lagoa/piscina pra, em alguns
  pontos, ficar mais alto que esse plano — o chão "furava" pra fora d'água. Corrigido carvando
  uma bacia de verdade em `terrainHeight()` (`applyBasin`, mesma função reaproveitada por tudo
  que já usa altura de terreno) nos pontos da lagoa/piscina, sempre vencendo (não é um "máximo"
  tipo platô — é sempre mais baixo ali) com raio generoso o bastante pra cobrir toda a área do
  disco de água com folga, verificado numericamente (não só visualmente) simulando a mesma
  fórmula em JavaScript no console do navegador antes de aplicar no código de verdade.
- **Piscina "quebrando o mapa" de verdade**: a localização original da piscina ficava perto
  demais do platô 3 (só ~0.32 rad de distância angular contra um raio de influência de 0,28) —
  a altura do platô (até 2,1) simplesmente atropelava qualquer bacia razoável, deixando um
  desnível de quase 2 unidades entre a "água" e o chão de verdade ali. Resolvido escolhendo um
  ponto novo pra piscina, verificado por busca (varredura de candidatos, medindo distância
  angular contra todos os platôs e contra a lagoa) antes de aplicar.
- **Lição de metodologia de teste** (a mais importante pra próxima sessão): boa parte do tempo
  deste laboratório foi gasto perseguindo um "bug" nos animais (posição sempre `(0,0,0)`, nunca
  se moviam) que **não existia no código** — era a aba do Chrome controlada por automação, em
  segundo plano, com `requestAnimationFrame` suspenso pelo próprio Chrome. Esperar por tempo real
  (`setTimeout`) nunca avança o jogo nessa situação; só chamadas manuais a `scene.render()` (ou
  uma ação de `screenshot`, que força pelo menos um quadro) realmente avançam a simulação.
  **Daqui pra frente: ao testar comportamento que muda com o tempo (IA de bicho, animação,
  física), sempre forçar `window.__scene.render()` várias vezes em vez de só esperar — senão
  qualquer coisa vai *parecer* travada mesmo estando certa.**

## Decisões técnicas tomadas

- **Bacias carvadas em `terrainHeight()`, não offset arbitrário de altura da água** — mantém a
  função como fonte única de verdade pra "altura do chão em qualquer ponto" (mesmo padrão dos
  platôs), garante que o colisor físico (que usa a mesma função) também tenha o rebaixo — o
  jogador realmente desce um degrau pra entrar na lagoa/piscina, não é só um efeito visual.
- **Cor por vértice em vez de textura de arquivo** pro pedido de "morros sem textura" — evita
  reabrir o ciclo de licença/asset (mesmo raciocínio já usado pro áudio sintetizado desde o
  lab-04), e o resultado (quebra o verde liso, real inclinação = mais pedra) atende o pedido sem
  precisar de um arquivo de imagem.
- **Bichos da lagoa em IA de "círculo local"**, não a mesma IA de "vagar pela esfera" dos bichos
  de terra — são presos a uma área pequena, um caminho circular fixo é natural e muito mais
  simples/barato que adaptar a IA de vagar pra um espaço confinado.

## Pendências / dívidas conhecidas

- **Pedidos recebidos mas NÃO implementados nesta rodada** (ver `FEATURES.md` §"Fora de
  escopo"): ruas + carros, loja que dá pra entrar, clima dinâmico (chuva/trovão/raio), parkour.
  Chegaram em sequência rápida enquanto bugs reais ainda precisavam de correção — decisão
  consciente de estabilizar o que já estava em andamento antes de empilhar mais escopo.
- **Pedido de trilha do Michael Jackson recusado** — direito autoral de terceiro, não é algo que
  dá pra implementar. Vale conversar com o usuário sobre o que ele gostaria que a trilha "estilo
  rádio" sintetizada (lab-07) tivesse pra chegar perto do clima que ele imaginava.
- **Ainda sem teste de "ouvir de verdade"** a trilha rádio (herdado do lab-07, sem mudança aqui).
- Continuam de pé: chat sem moderação (lab-06), deploy real pendente, servidor de relay precisa
  ser iniciado manualmente.

## O que o próximo laboratório deve desenvolver

Pedidos já registrados pelo usuário nesta sessão, ainda não implementados, em ordem aproximada
de quando foram pedidos:
1. Ruas e carros andando no mundo.
2. Uma loja que dá pra entrar (interior navegável).
3. Clima dinâmico: chuva em horário aleatório, trovões e raios.
4. Parkour — plataformas/obstáculos pra pular (o pulo deste laboratório já dá a base mecânica).

Antes de começar, vale confirmar com o usuário a prioridade entre esses quatro — são bem
diferentes em tamanho (ruas+carros e loja-navegável são bem mais trabalhosos que clima ou
parkour).

## Estado do repositório ao final

- Branch: `main`
- Como rodar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev` (em
  outro).
