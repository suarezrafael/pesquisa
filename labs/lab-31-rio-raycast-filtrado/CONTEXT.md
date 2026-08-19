# Contexto — Laboratório 31 — Raycast do rio filtrado + folga contra z-fighting

Preenchido em: 2026-08-17

## O que foi feito

1. **`realGroundRadial()` (`src/world3d/World3D.tsx`, perto de onde o rio é construído) — filtro
   de colisor**: antes, um único `havokPlugin.raycast()` sem filtro podia acertar QUALQUER
   colisor no caminho do raio (avatar, bicho, árvore/rocha), não só o planeta. Agora, um laço de
   até 6 tentativas: a cada raycast, se o acerto não for `transformNode.name === 'planet'`, o
   corpo acertado vira `ignoreBody` da próxima tentativa, até acertar o planeta de verdade (ou
   esgotar as tentativas — cai pra fórmula contínua como rede de segurança).
2. **`RIVER_WATER_CLEARANCE = 0.15`** (nova constante de módulo, perto de `RIVER_BASIN_RADIUS`) —
   substitui o `+0,03` fixo que estava espalhado em 3 lugares (linha central, margem esquerda,
   margem direita). Motivo: mesmo com a altura já certa (raycast batendo só no planeta), 0,03 era
   folga pequena demais pro depth buffer distinguir com confiança a água do terreno por baixo.

## Decisões técnicas tomadas

- **Por que um laço de retry em vez de configurar grupos de colisão** — Babylon/Havok permite
  bitmasks de `membership`/`collideWith` por corpo físico, o que seria a solução "correta" a
  longo prazo (rio nunca colidiria com avatar/bichos/árvores desde o início). Não configurado
  porque nenhum corpo físico existente no jogo tem grupos definidos ainda — introduzir isso agora
  seria uma mudança bem mais ampla (todo corpo físico do jogo) só pra resolver um raycast usado em
  um lugar só. O retry com `ignoreBody` resolve o problema real (raycast comendo o colisor errado)
  sem mexer em nada fora do próprio `realGroundRadial`.
- **Por que 0,15 e não outro valor** — testado ao vivo trocando o material da água por
  emissivo/unlit magenta (elimina qualquer efeito de iluminação, reflexo ou cor de fundo — só
  sobra "a malha vence o teste de profundidade ou não"). Com 0,03 (valor do lab-30), só uma tira
  pequena da malha aparecia magenta — o resto perdia o teste de profundidade contra o terreno,
  batendo com o relato do usuário. Com 0,15, o mesmo teste (raycast varrendo os vértices reais da
  malha) mostra folga constante de ~0,15 em todos os pontos amostrados — bem acima de qualquer
  imprecisão de depth buffer nas distâncias de câmera do jogo, sem a água parecer visivelmente
  flutuando (rua usa margem parecida, +0,2, sem reclamação de "flutuando").

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção).
- Raycast físico real varrendo os vértices da malha do rio DE VERDADE (mesma técnica do lab-30,
  agora com o filtro de colisor):
  - 196/196 vértices amostrados (malha inteira, não só os pontos de construção): folga constante
    entre 0,1500 e 0,1500 (variação na 5ª casa decimal, ruído de ponto flutuante) — nenhum vértice
    enterrado, nenhum contaminado por colisor errado.
- Teste do bug em si (antes do fix, reproduzido nesta sessão): raycast num ponto específico do
  meio de um segmento do rio retornou `body.transformNode.name === "avatarCollider"` — confirma
  que o bug reportado (raycast acertando o avatar em vez do planeta) era real e reproduzível, não
  suposição.
- Teste do segundo bug (folga insuficiente): material emissivo/unlit magenta aplicado ao vivo na
  malha do rio com clearance ainda em 0,03 — só uma tira pequena aparecia magenta visível, o resto
  invisível mesmo sem nenhum efeito de iluminação/reflexo interferindo. Depois de subir pra 0,15,
  o mesmo teste (raycast, não mais visual — ver pendência abaixo) confirma a malha inteira presente
  e contínua, sem nenhum vértice fora da curva esperada.
- Confirmação visual adicional: câmera reposicionada manualmente (fora do loop de render normal,
  perto da malha do rio de dois ângulos diferentes — vista de cima e vista de perto) mostra uma
  faixa CONTÍNUA, sem quebras, sem pedaços flutuando desconectados, seguindo a curva esperada do
  rio (passando perto das escolas 16/19/8/11/14, como esperado pro trajeto configurado).

## Pendências / dívidas conhecidas

- **Visibilidade em certos ângulos rentes ao chão ainda não confirmada visualmente em condições
  normais de jogo** — o teste com câmera manual (fora do loop normal) confirma que a malha existe,
  está contínua e na altura certa; mas as tentativas de confirmar visualmente com a câmera normal
  do jogo (terceira pessoa, seguindo o avatar) nesta sessão nem sempre mostraram água claramente
  visível ao nível do chão, mesmo em pontos longe de qualquer prédio. Hipótese mais provável: o
  material da água é bem espelhado (`metallic: 0.65, roughness: 0.04`) e reflete o céu claro quase
  sem cor própria em ângulos bem rentes (quase paralelos à superfície da água) — mistura
  visualmente com o fundo claro, sem ser um bug de posição/profundidade (que já está descartado
  pelas duas evidências acima). Não é o mesmo bug relatado pelo usuário (que era claramente sobre
  posição/enterro, já corrigido) — fica como possível próximo ajuste (menos roughness/metallic,
  ou uma cor de água mais saturada) SE o usuário confirmar que ainda está difícil de ver.
- Grupos de colisão (`membership`/`collideWith`) continuam não configurados em nenhum corpo físico
  do jogo — um raycast futuro em outro lugar do código pode reintroduzir o mesmo tipo de bug se
  não passar por um helper com o mesmo filtro. Considerar extrair `realGroundRadial` pra uma
  função compartilhada se mais um caso de uso aparecer (hoje é local ao bloco do rio, não
  exportada).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas funcionalidades planejadas (filtro de colisor no raycast, folga maior contra
z-fighting) foram concluídas e verificadas com medição real.

## O que o próximo laboratório deve desenvolver

Pedidos novos do usuário, chegados durante esta mesma sessão (fila, ainda não iniciados):
1. Montanhas maiores e mais espalhadas pelo mapa; casinhas que hoje flutuam em pontos invisíveis
   devem ficar EM CIMA das montanhas (tamanho proporcional, com colisão).
2. Mixagem de áudio: tirar a música principal, deixar só som de bicho/vento (uma versão mais calma
   da música pode ficar, bem baixinha).
3. Novo desafio de parkour maior/mais alto que o de degraus (que ficou bom) — bloco alto, recompensa
   de moedas maior lá em cima.

Se a folga de 0,15 ainda não bastar (usuário reportar de novo que não vê o rio), o próximo passo
não é aumentar a folga de novo — é revisitar a hipótese de reflexo/material (roughness/metallic)
em vez de posição, já que a posição está comprovada correta por duas evidências independentes
nesta sessão.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
