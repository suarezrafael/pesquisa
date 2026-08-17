# Contexto — Laboratório 28 — Relevo de água, rua com folga maior, boneco sentado

Preenchido em: 2026-08-17
Commit inicial → final: 5ec0678294ba1eb0dfb2f3a53e11d4a19a05b688..f7814c0249065bc0f88d18b5f45fda4fe69f3782

## O que foi feito

1. **Piscina com leitura de buraco de verdade** — a bacia de terreno (`applyBasin`) já existia
   desde sempre; só não tinha cor distinta, então visualmente "sumia" atrás da mesma cor de grama
   do resto do planeta. Adicionado `bankColor` (marrom terra úmida) misturado na cor por vértice
   dentro do mesmo raio da bacia (`POND_CENTER_DIR`/`POOL_CENTER_DIR`), com o mesmo smoothstep já
   usado pra profundidade — não é geometria nova, é a geometria que já existia finalmente ficando
   visível.
2. **Rio com relevo de verdade** — reescrito como uma bacia ao longo do trajeto, não mais uma
   faixa azul chata rente ao chão. Novo `riverPerpDistance()` (função de módulo) calcula distância
   perpendicular aproximada de qualquer direção até a curva do rio (válido porque o theta do rio
   cresce sempre com `t`, nunca inverte — um arco, não um caminho torto) e é reaproveitada tanto
   por `terrainHeight` (cava a bacia) quanto pela malha da água em `setup()` (fonte única, sem
   duplicar a fórmula da curva). `riverHalfWidth` caiu de 1.1 pra 0.55 — a água ocupa só o fundo
   da bacia, expondo a rampa carvada (+ a cor de margem) como banco de verdade entre a grama e a
   água. Material da água mais reflexivo (`metallic` 0,05→0,65, `roughness` 0,12→0,04),
   aproveitando o `environmentTexture` HDRI já carregado na cena.
3. **Margem de altura da rua aumentada** — de `+0.02` pra `+0.08`. Testado em 3 pontos diferentes
   do laço novo (lab-27) e a rua renderizou normalmente nos três — não reproduzi "invisível" —
   mas a margem antiga era fina o bastante pra arriscar coincidir com a malha coarse (48
   segmentos) do planeta em algum ponto não testado; aumentada por segurança mesmo sem bug
   confirmado.
4. **Grama excluída do topo/rampa dos platôs** — mesmo padrão de reamostragem já usado pro bioma
   de deserto (lab-23): ao gerar cada tufo de grama, se a altura do terreno ali (`terrainHeight`)
   passar de 0,35, resorteia até achar um ponto mais baixo (até 8 tentativas). Isso NÃO mudou a
   cor de morro (já estava certa desde o lab-18) — mudou o que estava escondendo essa cor.
5. **Boneco sentado no carro** — pose estática (não animada) aplicada uma vez ao entrar: coxa
   levantada pra frente (`legPivot.rotation.x = -1.3`), joelho dobrado de volta
   (`kneePivot.rotation.x = 1.3`), braço levemente pra frente como se estivesse no volante.

## Decisões técnicas tomadas

- **Investigar ao vivo (teleporte + screenshot + consulta de dados da cena) ANTES de escrever
  qualquer código** — os cinco relatos vieram todos numa densidade alta, no meio de uma sessão já
  longa; a tentação seria "consertar" cada um baseado só na descrição. Em vez disso, cada item foi
  confirmado (ou não) diretamente na cena rodando: a piscina realmente lia como chão plano; o rio
  realmente não tinha margem; a cor do morro (item 4) já estava CORRETA (confirmado lendo o vértice
  mais próximo da escola: `[0.2, 0.38, 0.2]`, exatamente `hillGreenColor`), então o problema real
  não era cor — era grama escondendo uma cor que já existia. Sem essa investigação, o conserto do
  item 4 teria sido no lugar errado (mexer em cor de novo, que já estava certa).
- **`riverPerpDistance` como fonte única entre `terrainHeight` e a malha visual da água** — a
  curva do rio (constantes `RIVER_START_PHI`/`RIVER_END_PHI`/`RIVER_START_THETA`/
  `RIVER_END_THETA`, movidas pra escopo de módulo) só existe declarada uma vez; antes desta lab, a
  fórmula da curva estava duplicada (uma cópia local em `setup()` pra desenhar a malha, e a bacia
  nem existia). Evita o mesmo tipo de bug de dessincronização já visto antes neste projeto (rio/
  rua com `.normalize()` mutando no lugar, lab-15).
- **Água do rio mais estreita que a bacia, não do mesmo tamanho** — se a água ocupasse a bacia
  inteira, não sobraria banco nenhum pra aparecer; reduzir `riverHalfWidth` bem abaixo do raio da
  bacia (`RIVER_BASIN_RADIUS`) é o que cria a faixa de terreno exposto (rampa + cor de margem)
  entre a grama e a água — a mesma relação que já existe naturalmente na piscina (disco de água
  pequeno dentro de uma bacia de terreno bem maior).
- **Grama reamostrada por ALTURA, não por raio geométrico do platô** — deixa uma franja fina de
  grama na base da rampa (onde a altura ainda é baixa, abaixo de 0,35) em vez de um corte abrupto
  logo na borda nominal do platô; só exclui de fato onde a cor de morro (`hillBlend`, que começa
  em 0,5 de altura) já domina, mantendo os dois efeitos coerentes um com o outro.
- **Pose sentada é uma aproximação estática, não animação nova** — dado o rig de baixo-poli
  (poucos pivôs: quadril/joelho/ombro/cotovelo), uma pose fixa aplicada uma vez ao entrar já
  resolve o pedido ("o boneco deve ir sentado") sem precisar de um sistema de animação novo;
  verificado de perfil que lê como sentado (joelhos dobrados pra frente), não uma pose "quebrada".
- **Efeito de "telhado flutuando a distância" (item 4) permanece, documentado como limite
  conhecido, não reaberto como bug** — ao verificar visualmente o platô da escola 4 de um ângulo
  mais distante, o mesmo efeito de curvatura de horizonte já diagnosticado no lab-19 (a ~28° de
  distância, o corpo do morro "afunda" abaixo do horizonte local, só o telhado aparece por cima)
  continua acontecendo. Isso é uma limitação geométrica do raio pequeno do planeta, não afetada
  por cor de vértice ou densidade de grama — já estava fora de escopo antes desta lab
  (`labs/lab-19-colisao-npc-neblina/CONTEXT.md`) e continua assim.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, ~8,6s).
- Testado ao vivo no navegador, misturando consulta direta a dados da cena e screenshot:
  - **Piscina**: amostrados 8 pontos radiais (0° a 21° do centro) — gradiente limpo de altura
    (-0,44 no centro até +0,15 na borda, cruzando zero) e cor (marrom `[0.36,0.26,0.16]` no
    centro até verde-grama `[0.43,0.68,0.40]` na borda), confirmando bacia + margem coerentes.
  - **Rio**: no ponto central do trajeto (`t=0,5`), altura mínima confirmada negativa (-0,38) com
    cor de margem quase exata (`[0.36,0.28,0.17]`); visualmente (screenshot com zoom, `t=0,2`),
    uma faixa marrom claramente curva e distinta cruzando o terreno, nada parecido com o "chão
    plano com disco azul" de antes.
  - **Grama nos platôs**: `grassBlade.thinInstanceGetWorldMatrices()` — 0 de 2600 tufos com
    altura acima de 0,4 (o teto teórico exato: limite de 0,35 + 0,02 do offset de posicionamento
    da lâmina) — confirma a exclusão funcionando com precisão, não uma aproximação solta.
  - **Morro/escola 4**: screenshot próximo (28° do centro do platô) mostra a escola claramente
    elevada acima do nível da rua/lojinha ao lado, com uma curva de elevação visível — melhoria
    real sobre as capturas anteriores (onde tudo parecia no mesmo nível). Zoom mais de perto ainda
    mostra o efeito de "telhado flutuando" da curvatura de horizonte (ver decisões técnicas acima)
    — não corrigido, documentado como limite conhecido.
  - **Boneco sentado**: screenshot de perfil (câmera lateral, ~2,2 unidades da figura) mostra
    coxas levantadas pra frente e joelhos dobrados — lê como sentado, diferente da pose parada
    padrão.

## Pendências / dívidas conhecidas

- O efeito de "telhado flutuando a distância" em morros/platôs (curvatura de horizonte do
  planeta pequeno) continua sem correção definitiva — só o `PLANET_RADIUS` maior resolveria de
  vez, mudança grande adiada desde o lab-19. Documentado de novo aqui pra não se perder.
- Pose sentada é só uma aproximação estática; não foi verificada em EVERY ângulo de câmera
  possível (só de perfil) — pode ter algum ângulo específico onde a leitura fique menos clara
  (a vista de cima, por exemplo, mostrou os braços com uma leitura mais ambígua que a vista de
  perfil, embora não pareça "quebrada").

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as cinco funcionalidades planejadas (rio, piscina, rua, grama nos platôs, boneco
sentado) foram concluídas e verificadas.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Considerar aumentar `PLANET_RADIUS` se o efeito de "telhado flutuando" continuar sendo
   reportado — é a única correção definitiva conhecida pra esse efeito específico (curvatura de
   horizonte), adiada em pelo menos três labs agora (19, 26 indiretamente, 28).
2. Mais customização de avatar ou backend/conta, se o usuário pedir (itens já mapeados em labs
   anteriores).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
