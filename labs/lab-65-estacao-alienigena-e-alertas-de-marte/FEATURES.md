# Laboratório 65 — Estação alienígena, alertas de Marte e correção de PWA desatualizado

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 6aac19613adc8b076a55b074e77cdfb50da9323d

## Objetivo do laboratório
Usuário, numa mensagem só: "ao chegar em Marte teve ter uma informação de quantos marcianos tem
no planeta, e ao estar dentro de um raio de distância deles um alerta de perigo ser emitido. com
algum efeito em vermelho na tela. tem umas bolas gigantes em Marte que não se parecem rocha
marciana, parece só bolas esquisitas, mas sem física de colisão. ele deve ter alguns rochedos
pequenos, morros e uma estação extraterrestre avançada e moderna parecendo um disco voador em que
é possível entrar e ver um painel de nave espacial. No final faça o deploy do jogo em prod. Fui
instalar no celular e ainda estava a versão antiga."

Seis pedidos: (1) contador de marcianos vivos no HUD; (2) alerta visual vermelho de perigo por
proximidade; (3) trocar as "bolas esquisitas" (rochas que parecem bola) por rochas de verdade +
dar colisão a elas; (4) morros (relevo) em Marte; (5) uma estação alienígena em forma de disco
voador, entrável, com um painel de nave espacial visível por dentro; (6) investigar/corrigir por
que o PWA no celular do usuário ainda mostrava uma versão antiga do jogo, e redeployar ao final.

## Funcionalidades planejadas
- [x] Contador de marcianos vivos no HUD, visível em Marte. Verificado AO VIVO: "5 marcianos
      restantes" apareceu corretamente assim que pousei em Marte (referência: pedido 1).
- [x] Alerta de perigo por proximidade — vinheta vermelha na tela, intensidade cresce conforme o
      inimigo mais próximo se aproxima. Verificado AO VIVO: opacidade calculada bateu exatamente
      com a fórmula esperada (0.4055 a 1.64 unidades de um robô) e a vinheta apareceu visualmente
      no screenshot (referência: pedido 2).
- [x] Rochas de Marte sem o modelo "bola" (`stone_smallA`) + colisor esfera invisível (mesmo
      padrão do planeta principal). Verificado: nome do clone confirma `rock_smallA` (não mais
      `stone_smallA`), 12 colisores de rocha presentes na cena com `PhysicsAggregate` (referência:
      pedido 3).
- [x] Morros decorativos em Marte, com colisão. Verificado AO VIVO (screenshot: monte marrom
      arredondado) + 4 morros/4 colisores confirmados na cena (referência: pedido 4).
- [x] Estação alienígena entrável (disco voador) com painel de nave espacial visível por dentro.
      Estrutura (12 paredes com física + porta de 2 segmentos, casco/domo/cockpit visual, console
      decorativo) confirmada por inspeção de cena e visualmente (silhueta metálica com anel
      luminoso, de múltiplos ângulos). Entrar pela porta e ver o console de perto não foi
      confirmado com um screenshot literal — câmera em terceira pessoa fica desconfortavelmente
      perto do chão nesse planeta pequeno (raio 6) ao usar teleporte de QA, dificultando enquadrar
      o interior; ver "Pendências" (referência: pedido 5).
- [x] Corrigir registro do service worker (PWA) pra recarregar sozinho quando detectar uma versão
      nova. `injectRegister: false` + registro manual (`virtual:pwa-register`) com `onNeedRefresh`
      forçando `location.reload()`. Build/typecheck confirmam a integração; o efeito real (celular
      do usuário passar a receber updates sem reinstalar) só se confirma no próximo deploy que ele
      testar (referência: pedido 6).
- [x] Build (typecheck + produção) passa.
- [x] Deploy em produção ao final (pedido explícito do usuário) — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Relevo de terreno "de verdade" em Marte (deformação de vértice como o planeta principal,
  `terrainHeight`) — trocaria a física de chão de uma esfera perfeita (`PhysicsShapeType.SPHERE`)
  pra uma malha deformada, com risco de quebrar várias contas que assumem `SECOND_PLANET_RADIUS`
  como a altura do chão em qualquer ponto (posição dos inimigos, foguete, itens). "Morros" entregues
  como props decorativos (domos) sentados por cima da esfera lisa, com colisor próprio — visual e
  gameplay-mente equivalente sem esse risco.
- Interação especial ao ver o painel da nave (minigame, missão, etc.) — pedido do usuário foi só
  "ver", tratado como decoração, igual às outras estruturas do planeta principal.
