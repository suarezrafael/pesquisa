# Laboratório 47 — Conserta escada do Prédio dos Enigmas + transparência de piso/nuvem

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: 8038064

## Objetivo do laboratório
Usuário testou o Prédio dos Enigmas do lab-46 e reportou 3 problemas: "as escadas ficaram do
mesmo lado, não consigo subir nas escadas, você tem que testar isso antes" (bug real, não só
preferência) — e depois, enquanto o conserto estava em andamento, mais dois pedidos: "o piso dos
andares tem que ficar um pouco transparente pra não atrapalhar a visão da câmera em 3ª pessoa. o
mesmo vale pras nuvens quando cruzam a câmera." Um terceiro pedido (posicionamento do prédio,
"não em cima da estrada") e um quarto (nuvens/rochas do deserto) já tinham sido resolvidos no
lab-46 antes deste.

## Funcionalidades planejadas
- [x] **Causa raiz real do "não consigo subir"**: as paredes de trás e de frente de CADA andar
      cobriam a largura TODA do prédio (`QT_WIDTH`), incluindo o poço da escada — cada lance
      ficava fechado numa caixa, sem conseguir alcançar nenhuma das duas pontas
      (z=±`QT_HALF_D`) pra completar a subida. Confirmado ao vivo com um raycast pra frente que
      bateu bem em cima do degrau seguinte, a poucos centímetros da cápsula do avatar. Corrigido:
      parede de trás/frente de cada andar cobre só a largura do PISO (`QT_FLOOR_WIDTH`), o poço
      da escada fica sempre aberto nas duas pontas em todo andar.
- [x] **Segundo bug real, encontrado testando o conserto acima**: mesmo com o poço aberto, um
      colisor BOX por degrau (a implementação original) prendia fisicamente a cápsula do avatar
      no meio da subida — confirmado com outro raycast que bateu exatamente no degrau seguinte.
      Degraus discretos empilhados não são confiáveis pra um character controller de cápsula sem
      step-offset dedicado (por isso a Torre do Tesouro já usa rampa lisa, não degraus). Corrigido
      trocando a colisão dos degraus por uma RAMPA INVISÍVEL por lance (mesma técnica já
      comprovada da torre) — os degraus viram só visual (`collide: false`), a rampa dá a subida
      de verdade por baixo deles.
- [x] **Escada em zigue-zague** (pedido do usuário: "as escadas ficaram do mesmo lado") — lances
      pares sobem z=-`QT_HALF_D`→+`QT_HALF_D`, ímpares no sentido contrário, terminando um bem
      perto do início do próximo (mesmo canto) — como uma escada de prédio de verdade, sem
      precisar atravessar o andar inteiro pra trocar de lance.
- [x] **Piso "um pouco transparente"** perto do jogador (pedido do usuário, pra não atrapalhar a
      câmera em 3ª pessoa) — mesma técnica de fade das paredes (distância tangencial do jogador
      até o eixo do prédio), mas com opacidade mínima mais alta (0,55, não 0,12 como as paredes —
      ainda reconhecível como chão).
- [x] **Nuvens quase transparentes perto da câmera** (pedido do usuário: "o mesmo vale pras
      nuvens quando cruzam a câmera") — cada tufo de nuvem mede a distância até a CÂMERA (não o
      jogador, diferente do prédio — aqui o efeito é sobre o que a câmera enxerga) e fica
      quase transparente (mín. 0,2) quando ela está perto/atravessando.
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo EXAUSTIVA (pedido explícito do usuário: "você tem que testar isso
      antes"): raycast estrutural confirmando o poço aberto nas duas pontas de cada andar;
      caminhada de verdade via evento de teclado (`w`) confirmada avançando pela cápsula real
      (posição local subindo de 0,24 pra quase 1,0 dentro da subida); teleporte + assentamento
      por gravidade em pontos ao longo dos 3 lances, cada um disparando o marcador de quiz do
      andar CORRETO esperado (1º/2º/3º andar), confirmando as 3 rampas conectadas nas alturas
      certas; visibilidade numérica de piso (~0,61, entre o mínimo 0,55 e o normal 1) e parede
      (~0,25, entre o mínimo 0,12 e o normal 1) confirmadas mudando perto do jogador. Checklist de
      regressão completo: 21 escolas, 39 bichos, torre, 8 lasers, 48 rochas de montanha, 65 props
      gerais, 7 props do deserto — tudo presente, sem erros no console.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo adiado.
