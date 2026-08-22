# Laboratório 62 — Feedback visual de combate em Marte

Status: concluído
Início: 2026-08-21
Fim: 2026-08-21
Commit inicial: 837660a59a0b1c300d6f7538f0faca01df743ff5

## Objetivo do laboratório
Usuário, em duas mensagens seguidas:
1. "como eu sei que peguei o item tem animacao que eu estou segurando o item e ao aperta E ele
   sacode o braco, ou atira o laser?" — a espada/arma do lab-61 não tinham NENHUM feedback visual:
   sem indicação de "equipado" e sem animação nenhuma ao nocautear um inimigo.
2. "os et e o robo tbm tem que ter colisao, e animacao de ataque o robo tem que ser choque
   eletrico e o et com fumaca verde e mostrar uma animacoa de nado e so de soco. e um anel de
   onda sonomra em volta do boneco e le nao pode entrar dentro no meu corpo." — os inimigos também
   não tinham nenhum feedback visual ao atacar, e podiam sobrepor o avatar (sem "colisão" nenhuma,
   já que não usam física de verdade, decisão do lab-60).

## Funcionalidades planejadas
- [x] **Espada/arma equipadas visíveis** — cópias pequenas presas na mão do boneco, aparecem
      assim que o item é coletado, ficam ali pra sempre (uma na mão direita, outra na esquerda).
- [x] **Animação de ataque do jogador** — braço direito faz um arco de corte (espada) ou braço
      esquerdo levanta com recuo (arma), sobrescrevendo o ciclo de caminhada por um instante.
- [x] **Feixe de laser** — cilindro visual do jogador até o robô ao nocauteá-lo com a arma.
- [x] **"Colisão" com os inimigos** — sem física de verdade (decisão de performance do lab-60):
      empurra o inimigo de volta pra fora de um raio mínimo sempre que a perseguição o traria pra
      mais perto do jogador do que isso.
- [x] **Anel de onda sonora** ao redor do boneco, pulsando, só em Marte — reforço visual do raio
      de "colisão".
- [x] **Efeitos de ataque dos inimigos** — choque elétrico (segmentos em ziguezague, amarelo
      emissivo) do robô até o jogador; fumaça verde (esferas translúcidas) ao redor do jogador
      quando atacado pelo ET.
- [x] **"Solavanco" visual do inimigo** ao atacar — pulso de escala rápido (ET/robô não têm braço
      articulado pra animar um soco de verdade).
- [x] Build (typecheck + produção) passa.
- [~] Verificação ao vivo PARCIAL — ver "Pendências" no `CONTEXT.md`: o ambiente de automação do
      navegador ficou instável nesta sessão (timeouts de injeção de script, grupo de abas
      resetando sozinho) antes de eu conseguir testar essas funcionalidades especificamente ao
      vivo. Verificado com confiança alta via revisão de código linha a linha + typecheck limpo +
      build de produção bem-sucedido + consistência com padrões já comprovados nesta mesma sessão
      (criação de malha, matemática de distância, timers, descarte de efeito via `setTimeout`).

## Fora de escopo (explicitamente adiado)
- Física de verdade (colisor físico) nos inimigos de Marte — decisão de performance já tomada no
  lab-60 (cada inimigo já roda IA por quadro; física de verdade por unidade seria mais um custo
  por quadro, num contexto onde o Redmi Pad 2 já precisou de vários cortes de performance). O
  "empurrão" por matemática de distância cobre o pedido ("ele não pode entrar dentro no meu
  corpo") sem esse custo extra.
- Rig articulado nos braços do ET/robô (pra um "soco" de verdade em vez do pulso de escala) — os
  dois foram construídos só com primitivas estáticas (lab-60); dar braço articulado pra cada um
  exigiria reconstruir os dois do zero, fora de escopo desta rodada de polish visual.
