# Contexto — Laboratório 29 — Correções: escolas afundadas + rua abaixo do chão

Preenchido em: 2026-08-17
Commit inicial → final: 8c705b3f8ac3d2797e204607dc6ec72d4aa45479..a7261a1d23d9fc36d49fa068956522cff7135951

## O que foi feito

1. **Proteção de escolas contra qualquer bacia** — `SCHOOL_DIRS` (novo, escopo de módulo, logo
   depois de `QUEST_FIXED_UP`) recalcula a direção de cada uma das 21 escolas com a MESMA fórmula
   usada no loop que as monta em `setup()` (ângulo áureo por índice, ou `QUEST_FIXED_UP` quando
   existe override). `nearAnySchool(dir)` checa se uma direção está a menos de
   `SCHOOL_PROTECTION_RADIUS` (0,12 rad) de qualquer uma delas. Aplicada em dois lugares dentro
   de `terrainHeight`/no loop de cor por vértice: nenhuma bacia (lagoa, piscina, rio) rebaixa
   altura OU pinta cor de margem perto de uma escola.
2. **Margem de altura da rua subiu de +0,08 pra +0,2** — baseada em dado medido (raycast físico
   real varrendo o laço inteiro), não em outra estimativa.

## Decisões técnicas tomadas

- **Raycast físico de verdade (`havokPlugin.raycast`), não comparação com vértice mais próximo**
  — a técnica de verificação usada no lab-28 (achar o vértice mais próximo da malha e comparar
  altura) não tinha precisão suficiente pra pegar o erro real de discretização entre dois
  vértices; só o raycast contra a malha física de verdade (a mesma que o jogador colide) revelou
  o problema real. Ferramenta obtida via `await import('/node_modules/.vite/deps/@babylonjs_core.js?v=...')`
  — o Vite serve os deps do Babylon como módulo ES separado; dava pra pegar `PhysicsRaycastResult`
  e `Vector3`/`Ray` direto de lá no console do navegador, sem precisar que o jogo exponha esses
  tipos em `window`.
- **`SCHOOL_DIRS` recalcula a fórmula, não importa posições já calculadas** — as posições reais
  das escolas só existem depois que `setup()` roda (dependem da cena); `terrainHeight` roda muito
  antes disso (inclusive durante a própria geração da malha do planeta, que as escolas vão usar
  depois). Recalcular a mesma fórmula em escopo de módulo é o único jeito de ter essa informação
  disponível cedo o bastante, sem reestruturar a ordem de inicialização da cena inteira.
- **Raio de proteção (0,12 rad) escolhido pra cobrir o prédio inteiro, não só o centro** — meia-
  diagonal de uma escola (paredes 1,6×1,4) é ~0,08 rad; 0,12 dá folga extra pra garantir que
  nenhuma bacia toque nem a borda do prédio, não só o ponto central.
- **Margem da rua aumentada de novo com base em MEDIÇÃO, não em mais um palpite** — o lab-28 já
  tinha aumentado a margem uma vez (0,02→0,08) sem confirmar o tamanho real do erro; dessa vez, a
  medição (pior caso = 0,031 de "chão acima da rua" mesmo já com +0,08, implicando um erro real
  de malha de ~0,11 naquele ponto) define o valor final (+0,2 dá folga de quase 2× o pior caso
  medido).
- **Não investigado o mecanismo exato do erro de malha de 0,11** — a ondulação de base tem um
  pico ali que a malha de 48 segmentos não segue bem entre dois vértices adjacentes; entender
  exatamente por que esse pico específico é mal aproximado (vs. outros pontos do planeta que
  ficam bem dentro de margens pequenas) ficou fora de escopo — a margem maior resolve o sintoma
  (rua sempre acima do chão renderizado, confirmado por raycast em TODO o laço) sem precisar
  disso.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, duas vezes — depois de cada mudança).
- Testado ao vivo no navegador:
  - **Escolas**: antes do fix, q06 (-0,31), q14 (-0,94) e q17 (-0,46) tinham altura muito abaixo
    da faixa normal (base noise vai só até ±0,27). Depois do fix, as 21 escolas (`q01`-`q21`)
    checadas de uma vez: todas entre -0,19 e +2,2 (q04, no platô de verdade) — nenhuma "cratera"
    restante. Confirmado visualmente também: screenshot de `school-q14` mostra o prédio assentado
    normalmente no chão, sem buraco ao redor.
  - **Piscina intacta**: depois do fix, a bacia/cor da piscina (centro: altura -0,444, cor
    `[0.36,0.26,0.16]`) continuam idênticas ao valor medido no lab-28 — confirma que o novo guard
    `nearAnySchool` não afetou nada que já funcionava (a piscina está longe de qualquer escola).
  - **Rua**: varredura de raycast físico real em TODOS os 96 pontos do laço (não uma amostra) —
    antes do fix (com margem +0,08), pior caso = -0,0308 (rua abaixo do chão renderizado, no
    mesmo ponto perto de `theta≈0°`); depois (margem +0,2), pior caso = +0,0892 (positivo em
    todos os 96 pontos, `noHits: 0`).

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas funcionalidades planejadas (proteção de escola contra bacias, margem de rua
maior) foram concluídas e verificadas com medição real, não só visual.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Considerar aumentar `PLANET_RADIUS` se o efeito de "telhado flutuando" (curvatura de
   horizonte, documentado em `labs/lab-19-colisao-npc-neblina/CONTEXT.md` e de novo em
   `labs/lab-28-relevo-agua-boneco/CONTEXT.md`) continuar sendo reportado.
2. Mais customização de avatar ou backend/conta, se o usuário pedir (itens já mapeados em labs
   anteriores).
3. Se QUALQUER bacia nova for adicionada no futuro (novo lago, nova depressão de terreno), lembrar
   de checar contra `SCHOOL_DIRS`/`nearAnySchool` desde o início — esse foi exatamente o tipo de
   bug introduzido no lab-28 por não fazer essa checagem.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
