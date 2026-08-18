# Laboratório 43 — Rochas e casas flutuando (raycast ricocheteando entre 2 colisores)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 9ba53f50417f1d192b60c6ccf57c03b73f4398ad

## Objetivo do laboratório
Pedido do usuário, com screenshot: "as rochas e algumas casa estão flutuando num chão invisível,
é como se a superfície tivesse uma montanha invisível sem textura. Agora tem várias montanhas
flutuantes... está bem bugado."

## Funcionalidades planejadas
- [x] **Causa raiz encontrada**: `terrainGroundRadial`/`schoolGroundRadial`/
      `mountainRockGroundRadial` (as versões do lab-42) usavam `ignoreBody` (que só guarda UM
      corpo) pra tentar pular colisores que não fossem o planeta durante o raycast. Se o raio
      alternasse entre EXATAMENTE DOIS colisores não-planeta (ex.: a parede de uma escola perto de
      uma rocha de montanha nova), cada tentativa ignorava só o ÚLTIMO acerto, deixando o raio
      "ricochetear" entre os mesmos dois colisores pra sempre, sem nunca alcançar o planeta —
      mesmo com várias tentativas. Confirmado ao vivo: `school-q06` alternava
      `walls-q06`/`mountainRockCollider-4-0` em todas as 20 tentativas testadas.
- [x] **Corrigido**: em vez de "ignorar" corpos (limitado a um só pela própria API do
      Havok/Babylon), cada tentativa agora AVANÇA o ponto de partida do raio pra logo depois do
      último acerto não-planeta, na mesma direção — geometricamente nunca pode acertar o MESMO
      colisor de novo, garantindo progresso real a cada tentativa não importa quantos/quais
      colisores estejam no caminho.
- [x] **Unificado**: as duas cópias quase idênticas (`schoolGroundRadial`,
      `mountainRockGroundRadial`) viraram uma função só (`terrainGroundRadial`), declarada logo
      depois do `havokPlugin` existir (bem no início de `setup()`) — evita repetir o bug do lab-42
      (chamar antes de uma `const` auxiliar rodar sua própria linha de declaração) e garante que
      o fix se aplica em todo lugar de uma vez, sem risco de esquecer uma cópia.
- [x] Verificação: ao vivo (não só build), as 21 escolas confirmadas com folga ~0,000 (zero
      flutuando); os 48 modelos visuais de rocha de montanha confirmados com folga ~0,000; a
      regressão do lab-42 (escolas/torre/bichos/parkours sumindo) re-testada, tudo presente;
      screenshot perto de `school-q06` (a que estava travada no bug) mostra personagem e "Lojinha"
      apoiados solidamente na montanha, sem gap visível — bem diferente do screenshot do bug.

## Fora de escopo (explicitamente adiado)
- Um prop geral (`prop-58`, árvore/flor/pedra pequena comum) mostrou um raycast de DIAGNÓSTICO
  sem resultado perto de uma montanha — mas isso é esperado: props gerais NUNCA usaram raycast
  pra se posicionar (só a fórmula, desde sempre, não mudou nesta sessão) — não é uma regressão
  deste laboratório, é uma limitação pré-existente do sistema de scatter geral. Ver `CONTEXT.md`.
