# Contexto — Laboratório 95 — mais missões + escolinhas menores

Preenchido em: 2026-08-25
Commit inicial → final: a3c52a5b96ec6a13185caa1a7ccee7654e3e3aee..(este commit)

## O que foi feito
- **9 missões novas** (`data/quests.ts`, `q22`-`q30`), acrescentadas no FIM do array de propósito
  — desbloqueio é por posição no array (`isQuestUnlocked`), não pelo id, então inserir no meio
  quebraria o progresso salvo de quem já jogou. Mesmo ciclo lógica/matemática/leitura dos 21
  originais (agora 10/10/10), temas ainda não usados (subtração, horas, estimativa, classificação
  com veículos, causa-efeito na leitura, silogismo). Recompensa em degraus a partir de onde `q21`
  parou. Testado ao vivo: conteúdo, disparo do modal, cálculo de recompensa (incl. multiplicador de
  evento ativo) e recálculo automático do limiar do badge "Metade do Caminho" (`Math.ceil(30/2) =
  15`) — tudo confirmado funcionando. Deployado em produção com sucesso.

- **Bug de afundamento das escolinhas — timeline completa (3 rodadas: tentativa, revert, causa
  raiz real + correção definitiva):**

  **Rodada 1 — redução de ~20% no tamanho, causou o bug, revertida:**
  1. Encolhidas as dimensões/posições de paredes, fundação, porta, telhado e professor
     (`world3d/World3D.tsx`), direto nos números de cada `MeshBuilder` (não via `scaling` do nó
     pai — decisão deliberada pra evitar um `PhysicsAggregate` nascendo com dimensão diferente do
     visual).
  2. Testado no navegador de automação: modal abria, conteúdo correto, escolinhas visualmente "ok"
     em capturas de tela nos ângulos testados — dei o trabalho como concluído e fiz deploy em
     produção.
  3. **O usuário reportou ao vivo, em produção**: "TODAS AS CASA ESNTAO DENTRO DA TERRA, ATE OS
     NPC ESNTOA ENTERRADO NA TERRA TEM UM BUG BEM FEIO. AS CASINHAS SO APARECEM O TELHADO."
  4. Decisão (unilateral, por severidade/urgência): reverter imediatamente em vez de investigar ao
     vivo. Todas as dimensões/posições restauradas aos valores originais exatos de antes do
     lab-95. `tsc`/testes limpos, redeploy feito.

  **Rodada 2 — o usuário reportou o MESMO bug de novo, mesmo já revertido:**
  5. Usuário: "as escolas ainda continuam dentro da terra metade da casinha ta debaixo da
     sperficie ainda esta errado corrigir isso urgente. ate o npc esta dentro da terra." — ou
     seja, o revert da Rodada 1 **não resolveu nada**: o bug nunca teve relação com o tamanho da
     escolinha.
  6. **Verificação ao vivo, não só leitura de código**: baixado o bundle JS de produção
     (`assets/World3D-*.js`) e confirmado por grep que as dimensões deployadas eram de fato as
     originais (`width:1.6,height:1.1,depth:1.4` e `width:1.72,height:1.6,depth:1.52`) — descartou
     cache/deploy incompleto como explicação. Depois, com `npm run dev` local + navegador de
     automação + `window.__scene`/`window.__debugTeleport` (hooks DEV-only já existentes desde o
     lab-39), lida a posição REAL de paredes/telhado/professor via a MESMA API de física
     (`scene.getPhysicsEngine().raycast`) que o próprio jogo usa em `terrainGroundRadial` —
     comparando a altura real do terreno (raycast contra o corpo físico `'planet'`) com a posição
     das paredes em `school-q01` (uma escola das 21 ORIGINAIS, nada a ver com o lab-95): as paredes
     estavam com o topo abaixo do nível real do terreno, e os pés do professor até 1,8 unidade
     enterrados — confirmando que o bug é **anterior ao lab-95 e afeta escolas antigas também**.
  7. **Causa raiz real, isolada replicando o algoritmo de `settleMeshOnTerrain` fora do jogo**:
     `PLATEAU_CENTERS` (`World3D.tsx`) tem 12 platôs com altura de até 3,2 unidades numa rampa com
     `smoothstep` — a inclinação máxima da rampa passa de ~0,8 unidade de altura por METRO. Uma
     escola cujo centro (posição pela fórmula de ângulo áureo) caísse perto de uma dessas rampas
     via cantos com quase 2 unidades de diferença de altura entre si dentro do próprio "pé" do
     prédio (~1,3m de raio, contando o beiral do telhado até 1,05m do centro e o professor
     deslocado ~1,1m do centro). `settleMeshOnTerrain` desce o prédio inteiro até o canto MENOS
     alto (nesse caso, tipicamente uma ponta do telhado) encostar no chão — o que enterra TODOS os
     outros cantos (paredes, fundação, professor) na proporção da inclinação local. Nenhuma
     fundação "seguraria" isso sem virar uma caixa gigante — é um problema de ONDE a escola foi
     colocada, não de tamanho nem de bug na lógica de `settleMeshOnTerrain` em si (que faz
     exatamente o que foi desenhada pra fazer).
  8. **Correção de verdade**: nova constante `SCHOOL_UPS` (escopo de módulo, perto de
     `SCHOOL_DIRS`) — pra cada escola, mede a variação de relevo ao redor da posição candidata
     (`terrainVarianceNearby`, amostra `terrainHeight` em 6 pontos ao redor + o centro) e, se a
     variação passar de 0.6 unidade (margem segura considerando a fundação), busca um ponto
     próximo mais plano em anéis crescentes (`findFlatterSchoolUp`, nunca se afasta mais que
     ~4,5m do slot original do ângulo áureo, sempre devolve alguma direção — nunca trava). O laço
     que monta as escolas em `World3D` (`quests.forEach`) foi simplificado pra só ler
     `SCHOOL_UPS[index]` em vez de recalcular a fórmula de ângulo áureo de novo (eliminando a
     duplicação frágil "duas cópias da mesma fórmula mantidas em sincronia por convenção" que já
     tinha um comentário histórico avisando do risco).
  9. **Verificado ao vivo (não só código)**: mesmo método de leitura direta da cena/física em 14
     escolas (`q01` a `q30`, cobrindo antigas e novas, incluindo a `q21` de posição fixa no
     deserto) — **0 de 14 enterradas**, todas com o topo das paredes exatamente na altura
     `terreno + altura total da parede` (ou seja, base das paredes exatamente no nível do chão).
     Pés do professor testados em 4 escolas — folga de -0,06 a +0,08 unidade (poucos centímetros,
     dentro do normal pra um personagem em pé), contra até -1,8 unidade antes da correção.
     `tsc -b` limpo, `npm run test` com as 39 asserções passando, deploy em produção feito.

## Decisões técnicas tomadas
- **Reverter primeiro, investigar depois (Rodada 1)** — dado que a causa raiz não estava
  confirmada e produção estava ativamente quebrada, reverter uma mudança recente e bem testada é
  mais seguro/rápido que depurar ao vivo. Acabou não resolvendo o problema real, mas foi a decisão
  certa dado o que se sabia no momento (parar o dano visível o mais rápido possível).
- **Verificar posição REAL da geometria via física, não só screenshot** — a lição da Rodada 1 (um
  teste que só checa "o modal abre"/screenshot de ângulo favorável não pega afundamento) foi
  aplicada na Rodada 2: leitura direta de `scene.getPhysicsEngine().raycast` contra o corpo físico
  do planeta, comparado com a posição real dos vértices de cada malha, é o único jeito confiável
  de confirmar "isso está mesmo no chão" — screenshots no navegador de automação são adicionalmente
  pouco confiáveis aqui por causa do throttle de `requestAnimationFrame` em aba em segundo plano
  (fica cinza/estático até um evento real forçar um quadro nítido).
- **Corrigir reposicionando, não redesenhando `settleMeshOnTerrain`** — o algoritmo de assentar no
  terreno está correto pro que foi desenhado pra fazer (nenhum canto flutua); o problema real é
  colocar um objeto rígido de ~2m numa rampa que varia >1,8m nesse mesmo espaço. Mudar o algoritmo
  pra tolerar isso teria custo de complexidade bem maior (ex.: inclinar a escola pra seguir o
  relevo, ou trocar pra uma escala de "pior caso" mais conservadora que geraria flutuação visível
  do lado oposto) do que simplesmente não colocar a escola ali.
- **Busca de reposicionamento usa `terrainHeight` (fórmula), não `terrainGroundRadial` (raycast
  físico)** — a busca roda em escopo de módulo, antes do Babylon/Havok existirem (`havokPlugin` só
  existe dentro do `setup()` do componente); a fórmula é a mesma usada pra deformar a malha visual
  do planeta (`terrainHeight(dir)` desloca cada vértice da esfera), então é um proxy fiel da
  superfície real, só que sem depender de física já inicializada.
- **`SCHOOL_UPS` substitui a duplicação antiga da fórmula de ângulo áureo** — antes, a mesma fórmula
  existia em DOIS lugares (constante em escopo de módulo `SCHOOL_DIRS`, usada só pra bacias da
  lagoa/piscina não cavarem perto de escola, e uma cópia dentro do componente que de fato
  posicionava as escolas), mantidos em sincronia só por convenção/comentário. `SCHOOL_UPS` calcula
  a posição final UMA vez e o componente só lê o array — elimina o risco de as duas cópias
  divergirem no futuro. `SCHOOL_DIRS` (posições brutas, sem o ajuste de relevo) continua existindo
  e sendo usado só pela checagem de bacia (`nearAnySchool`), que não precisa da posição
  reposicionada pra funcionar corretamente.

## Pendências / dívidas conhecidas
- **Nenhuma checagem de colisão entre escolas depois do reposicionamento.** `findFlatterSchoolUp`
  pode mover uma escola até ~4,5m do slot original; em tese, duas escolas vizinhas poderiam ambas
  ser empurradas uma em direção à outra e ficarem mais perto do que o espaçamento normal do ângulo
  áureo garantiria. Risco considerado baixo (30 escolas espalhadas por uma faixa de latitude bem
  maior que 4,5m de raio de busca), mas não foi verificado explicitamente. Se algum dia um usuário
  reportar duas escolas "grudadas", começar por aqui.
- **`SCHOOL_SAFE_TERRAIN_VARIANCE = 0.6`** foi escolhido por raciocínio geométrico (bem menor que a
  profundidade útil da fundação, ~1,45 unidade) e confirmado empiricamente nas 14 escolas testadas,
  mas não é um valor "provado" formalmente — se o mapa ganhar platôs mais extremos no futuro
  (altura maior ou raio de rampa menor), pode precisar ser revisto.
- **A meta original do usuário ("escolinhas menores pra não sobrecarregar o planetinha") continua
  em aberto.** Este laboratório reverteu a tentativa de encolher pro tamanho original — o problema
  de "apertado"/"sobrecarregado" no `PLANET_RADIUS = 13` com agora 30 escolinhas (vs. 21 antes)
  ainda não tem solução dedicada (embora com o bug de afundamento corrigido, valha reavaliar se
  ainda parece "sobrecarregado" visualmente antes de reabrir esse pedido).

## Funcionalidades planejadas que NÃO foram concluídas
- Redução do tamanho da escolinha — tentada, causou um bug real (não relacionado à causa raiz
  verdadeira, que era terreno íngreme), revertida. Não descartada: o pedido do usuário continua
  válido, mas precisa reavaliação depois de ver o planeta com o bug de afundamento já corrigido.

## O que o próximo laboratório deve desenvolver
- **Se "sobrecarregado" ainda for um problema visual** depois desta correção: considerar aumentar
  levemente a faixa de `phi`/espaçamento em vez de encolher a geometria (evita reabrir qualquer
  risco de regressão em `settleMeshOnTerrain`/`SCHOOL_UPS`) — ou, se encolher for mesmo necessário,
  desta vez testar a posição vertical real via física (mesmo método usado pra achar a causa raiz
  aqui), não só screenshot.
- Continuar o backlog normal de `prompt.md` conforme prioridade, fora esse item específico.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório: `npm run dev` em `app/`, entrar no
  jogo, e usar `window.__scene.getPhysicsEngine().raycast(...)` contra o corpo `'planet'` pra
  comparar com a posição de qualquer `walls-qNN`/`school-qNN` — não deve haver folga negativa
  (paredes abaixo do nível real do terreno) em nenhuma escola. `npm run test` confirma as 39
  asserções de domínio inalteradas.
