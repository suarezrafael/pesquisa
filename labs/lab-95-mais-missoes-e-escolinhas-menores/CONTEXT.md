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
- **Redução de ~20% no tamanho da escolinha — TENTADA, DEPLOYADA, CAUSOU BUG EM PRODUÇÃO,
  REVERTIDA.** Timeline:
  1. Encolhidas as dimensões/posições de paredes, fundação, porta, telhado e professor
     (`world3d/World3D.tsx`, loop `quests.forEach` ~linha 4482-4590), direto nos números de cada
     `MeshBuilder` (não via `scaling` do nó pai — decisão deliberada pra evitar um
     `PhysicsAggregate` nascendo com dimensão diferente do visual).
  2. Testado no navegador de automação: modal abria, conteúdo correto, escolinhas visualmente
     "ok" em capturas de tela nos ângulos testados — dei o trabalho como concluído e fiz deploy em
     produção via `npx vercel --prod --yes`.
  3. **O usuário reportou ao vivo, em produção**: "TODAS AS CASA ESNTAO DENTRO DA TERRA, ATE OS
     NPC ESNTOA ENTERRADO NA TERRA TEM UM BUG BEM FEIO. AS CASINHAS SO APARECEM O TELHADO." — ou
     seja, o teste que rodei antes do deploy não pegou o bug real: as escolinhas (com as
     dimensões menores) estavam afundando quase por completo no terreno, restando só o telhado
     visível, e o professor (NPC) também enterrado.
  4. Decisão tomada (unilateral, por severidade/urgência — produção ativamente quebrada para
     todo mundo): reverter imediatamente em vez de tentar consertar ao vivo. Todas as
     dimensões/posições (paredes, fundação, porta, telhado, professor, `label.linkOffsetY`) foram
     restauradas aos valores originais exatos de antes do lab-95.
  5. `npx tsc -b` limpo, `npm run test` com as 39 asserções passando, redeploy via
     `npx vercel --prod --yes` (bem-sucedido de primeira) — produção confirmada de volta ao
     tamanho original das escolinhas.

## Decisões técnicas tomadas
- **Reverter em vez de tentar consertar ao vivo** — a suspeita de causa raiz (interação entre as
  dimensões menores e `settleMeshOnTerrain`) não estava confirmada, e depurar isso ao vivo com o
  bug já em produção arriscava manter o problema visível por mais tempo. Reverter é uma operação
  mecânica e de baixo risco (voltar a números já validados por dezenas de laboratórios
  anteriores); consertar-em-frente exigiria entender a causa raiz primeiro, o que não tinha como
  garantir rápido.
- **Por que o teste anterior ao deploy não pegou o bug**: o teste no navegador de automação
  checou "o modal abre com o conteúdo certo" e "a escolinha parece OK em screenshots de alguns
  ângulos" — não checou a posição vertical real da geometria nem enterrou a câmera pra ver se a
  base estava visível acima do solo. `settleMeshOnTerrain` só entra em ação depois que a cena
  carrega e o cálculo de "abaixar até encostar no pior ponto" roda — um screenshot rápido de
  ângulo favorável pode não expor um afundamento severo se a câmera não olhar de perto/de lado.

## Pendências / dívidas conhecidas
- **Causa raiz do bug de afundamento NÃO confirmada.** `settleMeshOnTerrain` (World3D.tsx
  ~2650-2706) amostra vértices de cada mesh filho do `root` da escolinha, bucketiza numa grade
  3×3 por mesh (independente por mesh), acha a pior folga (maior distância positiva entre uma
  amostra e o terreno real na própria direção radial dela) entre TODAS as amostras de TODOS os
  meshes, e abaixa o `root` inteiro por `piorFolga + 0.12` — mas só abaixa, nunca levanta
  (`if (largestGap > 0)`, sem ramo correspondente pra folga negativa). Hipóteses não confirmadas
  levantadas mas não testadas isoladamente: (a) o telhado (pirâmide de base larga,
  `diameterBottom: 2.1` — bem maior que as paredes reduzidas) ter vértices de borda amostrados
  longe do centro, inflando a "pior folga" calculada de forma desproporcional à nova escala
  menor; (b) a bucketização 3×3 por mesh, sendo independente entre meshes de tamanhos
  proporcionalmente diferentes agora (parede menor, telhado do mesmo tamanho de antes), pode gerar
  uma leitura de folga inconsistente entre as partes; (c) alguma interação com a escala do
  professor (`teacher.root.scaling`) e o raio de amostragem do NPC. Nenhuma dessas foi isolada
  com um teste controlado (ex.: alterar só o telhado e testar, ou só as paredes).
- **A meta original do usuário ("escolinhas menores pra não sobrecarregar o planetinha") continua
  em aberto.** Este laboratório reverteu para o tamanho original, então o problema de
  "apertado"/"sobrecarregado" no `PLANET_RADIUS = 13` com agora 30 escolinhas (vs. 21 antes)
  ainda não tem solução.

## Funcionalidades planejadas que NÃO foram concluídas
- Redução do tamanho da escolinha — tentada e revertida (ver acima). Não descartada: o pedido do
  usuário continua válido, só precisa de uma abordagem mais cuidadosa num laboratório futuro.

## O que o próximo laboratório deve desenvolver
- **Encolher a escolinha com segurança**, se o usuário ainda quiser isso. Abordagem sugerida:
  1. Antes de mexer em dimensões, isolar o comportamento de `settleMeshOnTerrain` com um teste
     controlado (reduzir só uma peça por vez — paredes, depois fundação, depois telhado — e medir
     a posição Y final do `root` a cada mudança) pra confirmar qual peça especificamente causa o
     afundamento excessivo.
  2. Testar localmente verificando a POSIÇÃO VERTICAL REAL da geometria (ex.: ler
     `base.position.length()` ou a distância radial ao centro do planeta e comparar com o raio de
     terreno esperado no ponto), não só "abre o modal" / captura de tela em ângulo favorável —
     essa foi a lacuna que deixou o bug passar pro deploy anterior.
  3. Alternativa mais segura a considerar: em vez de encolher a geometria da escolinha em si,
     aumentar o espaçamento/distribuição das escolinhas na faixa de latitude (ou usar uma faixa de
     `phi` um pouco mais ampla) pra resolver "sobrecarregado" sem mexer no tamanho de cada peça
     individual — evita reabrir a superfície de risco do `settleMeshOnTerrain` por completo.
- Continuar o backlog normal de `prompt.md` conforme prioridade, fora esse item específico.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório: `npm run dev` em `app/`, entrar no
  jogo, completar missões até a 21 (ou usar `window.__debugTeleportExact` em modo DEV) pra ver as
  escolinhas `q22`-`q30` e seu conteúdo; as escolinhas devem estar no tamanho ORIGINAL (paredes
  1.6×1.1×1.4, fundação 1.72×1.6×1.52, professor escala 0.92) — não reduzidas. `npm run test`
  confirma as 39 asserções de domínio inalteradas.
