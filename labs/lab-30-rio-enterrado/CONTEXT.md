# Contexto — Laboratório 30 — Rio enterrado na malha do planeta

Preenchido em: 2026-08-17
Commit inicial → final: a832750935072094f718cc62c2bd68172a1099a7..7acaf9a285be9e4e70b52ce9940d836bf0ed03f7

## O que foi feito

1. **`realGroundRadial()`** (novo helper, local ao bloco de construção do rio) — em vez de
   posicionar a água só pela fórmula contínua de `terrainHeight(dir)`, faz um raycast físico real
   (`havokPlugin.raycast`, contra a MESMA malha que o jogador colide) e usa a distância radial do
   ponto de impacto de verdade, com fallback pra fórmula só se o raycast não acertar nada (não
   deveria acontecer, mas evita quebrar a criação do rio inteiro por uma exceção).
2. **Aplicado na linha central E nas duas margens** — a primeira tentativa só corrigiu a linha
   central (`riverCenter`); verificando o resultado, o gap ainda chegava a 0,41 (só uma leve
   melhora do 0,46 original). Causa: as margens eram computadas deslocando lateralmente o ponto
   central JÁ corrigido por um vetor tangente plano (`side.scale(riverHalfWidth)`), sem
   recomputar a altura real nesse novo ponto lateral — um deslocamento que fazia sentido quando a
   altura vinha de uma fórmula suave, mas quebrava depois que o centro passou a "pular" pra
   acompanhar a malha real (bem menos suave). Corrigido: cada margem agora faz o próprio raycast
   independente, na direção do ponto deslocado — o deslocamento tangente só decide a direção
   lateral, a altura final vem sempre do raycast.

## Decisões técnicas tomadas

- **Raycast em tempo de construção da cena, não só verificação** — diferente do lab-29 (que usou
  raycast só pra MEDIR o erro e depois ajustou uma margem fixa), aqui o raycast virou parte do
  próprio código de produção: a água é posicionada perguntando à física real "qual é a altura do
  chão aqui?", em vez de confiar numa fórmula que a malha grossa só aproxima. Decisão motivada
  pelo tamanho do erro (até 0,46 unidade, bem maior que o ~0,11 da rua) — uma margem fixa grande o
  bastante pra cobrir isso faria a água parecer visivelmente flutuando nos pontos onde o erro é
  pequeno ou negativo.
- **Por que o rio tem um erro tão maior que a rua** — a rua cobre uma faixa de latitude estreita
  (~±1,2° de ondulação ao redor de phi=25°); o rio cruza 216° de longitude (theta), passando por
  uma variedade bem maior de relevo (a ondulação de base tem picos e vales em vários lugares
  diferentes ao longo desse trajeto todo). Mais chance de cruzar um trecho onde a malha de 48
  segmentos aproxima mal a curva contínua.
- **Fallback pra fórmula só como rede de segurança, não como caminho normal** — em teoria o
  raycast contra a malha física do planeta (já criada antes do rio, com `PhysicsAggregate` do
  tipo `MESH`) deveria sempre acertar; o fallback existe só pra não travar a criação do rio numa
  situação inesperada (ex.: física ainda não inicializada por algum motivo), não é esperado
  disparar em uso normal.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, duas vezes — uma por tentativa).
- Testado ao vivo no navegador, com raycast físico real contra os VÉRTICES DA MALHA DE ÁGUA DE
  VERDADE (não só os pontos usados pra construir, que poderiam mascarar erro introduzido na
  triangulação do ribbon):
  - Antes do fix: pior caso = 0,4562 (água enterrada quase meio metro dentro da malha do
    planeta).
  - Depois de corrigir só a linha central: pior caso ainda 0,4098 — confirma que a linha central
    sozinha não bastava.
  - Depois de corrigir linha central + margens: pior caso = **-0,0300**, igual (constante) em
    todos os 66 pontos amostrados — a água agora fica exatamente 0,03 acima do chão real em
    qualquer lugar do trajeto, não só nos pontos que dava pra medir por sorte.
  - Confirmado visualmente também (teleporte + zoom): água claramente visível como uma
    depressão azul distinta, com bordas escurecidas (sombra/margem), nada parecido com "chão
    plano sem água" de antes do lab-28 ou "buraco sem nada visível" do lab-28/29.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas funcionalidades planejadas (linha central por raycast, margens por raycast
independente) foram concluídas e verificadas com medição real (vértices da malha de água, não só
os pontos de construção).

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Se o mesmo tipo de problema aparecer em outro elemento que segue `terrainHeight` de perto
   (mais provável em algo que cubra uma faixa ampla de theta/phi, como o rio) — considerar a
   mesma técnica de raycast em vez de mais uma rodada de margem-por-palpite.
2. Considerar aumentar `PLANET_RADIUS` se o efeito de "telhado flutuando" (curvatura de
   horizonte, documentado em `labs/lab-19-colisao-npc-neblina/CONTEXT.md` e
   `labs/lab-28-relevo-agua-boneco/CONTEXT.md`) continuar sendo reportado.
3. Mais customização de avatar ou backend/conta, se o usuário pedir.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
