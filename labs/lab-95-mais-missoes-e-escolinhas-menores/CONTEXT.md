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
  7. **Primeira hipótese de causa raiz (PARCIALMENTE certa, incompleta)**: `PLATEAU_CENTERS`
     (`World3D.tsx`) tem 12 platôs com altura de até 3,2 unidades numa rampa com `smoothstep` — a
     inclinação máxima da rampa passa de ~0,8 unidade de altura por METRO. Uma escola cujo centro
     caísse perto de uma dessas rampas via cantos com quase 2 unidades de diferença de altura entre
     si dentro do próprio "pé" do prédio. Corrigido (nesta hora) com `SCHOOL_UPS`/`findFlatterSchoolUp`
     em escopo de módulo, medindo variação de relevo via `terrainHeight` (a FÓRMULA analítica) e
     afastando a escola de rampa íngreme. **Verificado ao vivo com 0/30 escolas enterradas** — mas
     essa verificação, feita logo depois de implementar a correção, não se sustentou (ver Rodada 3).
  8. **Duas tentativas de "aquecer" o Havok (raycast síncrono repetido, depois `await` cedendo o
     event loop até acertar 'planet') REPORTADAS PELO USUÁRIO COMO INEFICAZES** — as mesmas escolas
     continuavam enterradas com os MESMOS valores exatos depois de cada tentativa, o que já era a
     pista de que a causa não era timing/inicialização do Havok (só confirmado com certeza na
     Rodada 3, abaixo).

  **Rodada 3 — causa raiz de verdade, confirmada e corrigida (SEM depender de timing):**
  9. **A hipótese de timing foi definitivamente descartada**: testado com três abordagens de
     "aquecimento" do Havok completamente diferentes (raycast síncrono em lote, `await` até uma
     direção acertar 'planet', `await` até 12 direções diferentes acertarem 'planet' juntas, com até
     ~3s de espera real) — as MESMAS escolas davam o MESMO valor de folga, byte a byte, em TODOS os
     casos. Prova de que o problema é 100% determinístico/geométrico, não uma corrida de
     inicialização.
  10. **Causa raiz real, encontrada replicando a amostragem de `settleMeshOnTerrain` malha por
      malha, ao vivo**: a função soma amostras de TODAS as malhas filhas da escola — inclusive o
      TELHADO (beiral largo, `diameterBottom: 2.1`, chega a ~1,05m do centro) e o PROFESSOR
      (deslocado ~1,1m do centro). Nenhum dos dois toca o chão de verdade (o telhado fica apoiado
      nas paredes; o professor fica de pé sobre seu próprio pedaço de chão). Medido ao vivo
      repetidas vezes: o TELHADO aparecia como a amostra "mais alta" (a que decide quanto descer o
      prédio inteiro) com folga de até +0,45 — mesmo já reposicionando a escola pra longe de rampa
      íngreme, o beiral do telhado e o professor alcançam relevo diferente o bastante, nessa borda
      mais larga que a pegada real das paredes, pra distorcer a decisão e enterrar tudo.
  11. **Correção de verdade, duas partes**:
      a) `settleMeshOnTerrain` ganhou um parâmetro `excludeFromSampling` — o telhado e o professor
         ainda se movem junto quando o prédio desce, mas não entram mais na conta de QUANTO descer
         (chamada: `settleMeshOnTerrain(base, localUp, [roof, teacher.root])`).
      b) A busca por posição mais plana (`findFlatterSchoolUp`/`SCHOOL_UPS`) foi movida de escopo de
         módulo pra dentro de `setup()` (`findFlatterSchoolUpReal`/`schoolUps`, variável local) e
         agora mede a variação de relevo com `terrainGroundRadial` (raycast físico real) em vez da
         fórmula `terrainHeight` — a malha de 48 segmentos do planeta se afasta demais da fórmula
         suave perto das rampas íngremes pra uma checagem só-fórmula ser confiável (só dava pra
         fazer isso depois de `havokPlugin` existir, por isso não é mais escopo de módulo).
  12. **Verificado ao vivo, exaustivamente, nas 30 escolas** (não só 14): folga média subiu de
      NEGATIVA (enterrado) pra **0,86** (de um máximo de 1,10), pior caso 0,52, **zero** escolas com
      afundamento severo (<0,3). Confirmado visualmente também — telhado por cima de paredes
      inteiras visíveis, não mais só um triângulo saindo do chão. `tsc -b` limpo, `npm run test`
      com as 39 asserções passando, deploy em produção feito. **Confirmado pelo próprio usuário**
      testando de novo depois deste deploy: "testei denovo agora ficou certo".
  13. **Diagnóstico temporário deixado no HUD** (`ENTERRADAS:...`, sempre visível, inclusive em
      produção) durante a investigação, pra conseguir dado real do aparelho do usuário sem
      ferramenta de desenvolvedor — ainda não removido (ver Pendências).

  **Bug relacionado, encontrado pelo usuário logo em seguida — morros/platôs invisíveis:**
  14. Usuário: "as casas que estão sobre o morro... aparecem flutuando no espaço, isso significa
      que a textura sólida das montanhas estão transparentes." A colisão física dos platôs sempre
      esteve correta (por isso a casa aterrissa na altura certa) — o problema era só visual: a
      malha do planeta desloca vértices até 3,2 unidades nas rampas mais íngremes, o suficiente pra
      dobrar alguns triângulos sobre si mesmos e inverter a ordem de enrolamento (winding) deles;
      com culling de face traseira ligado (padrão do `PBRMaterial`, e `planetMat` nunca desligava
      isso — diferente de `cloudMat`/`grassMaterial`, que já desligavam pro mesmo tipo de problema
      neste mesmo arquivo), esses triângulos ficam invisíveis, um buraco de verdade na malha.
      Corrigido com `planetMat.backFaceCulling = false`. Confirmado por A/B ao vivo (alternando a
      flag e recarregando, mesma posição) numa das escolas testadas — com a flag ligada (bug), o
      morro sumia numa neblina branca; desligada (correção), o morro aparecia sólido e colorido.
      Deploy em produção feito; **confirmação do usuário ainda pendente** no momento em que este
      `CONTEXT.md` foi escrito.

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
- **Corrigir excluindo telhado/professor da amostragem, não redesenhando o algoritmo de descida
  em si** — `settleMeshOnTerrain` (desce até o canto menos alto encostar) está correto pro que foi
  desenhado pra fazer; o problema real era incluir peças que NUNCA tocam o chão (telhado, apoiado
  nas paredes; professor, com seu próprio chão) na decisão de quanto descer TODA a rigidez do
  prédio. Excluí-las da amostragem (mas não do movimento — ainda descem junto) resolve isso sem
  precisar inclinar a escola ou reinventar o algoritmo de descida.
- **Busca de reposicionamento (`findFlatterSchoolUpReal`) usa `terrainGroundRadial` (raycast
  físico), NÃO `terrainHeight` (fórmula)** — a primeira versão usava só a fórmula (mais barata, dava
  pra rodar em escopo de módulo, antes de `havokPlugin` existir) e pareceu funcionar num teste
  rápido (0/30 enterradas), mas o usuário confirmou que o bug persistia. Causa: a malha real do
  planeta (só 48 segmentos) se afasta bastante da fórmula suave perto das rampas de
  `PLATEAU_CENTERS` — uma checagem "plano o bastante" pela fórmula podia discordar bastante do que
  o raycast real (o que `settleMeshOnTerrain` de fato usa) media no mesmo lugar. A versão corrigida
  roda DENTRO de `setup()` (não mais em escopo de módulo) especificamente pra poder usar
  `terrainGroundRadial` — mais cara por amostra (raycast físico, não conta analítica), por isso o
  orçamento de busca foi reduzido (4 amostras em vez de 6, 3 anéis em vez de 5) pra manter o custo
  de carregamento baixo.
- **`schoolUps` (variável local, não mais `SCHOOL_UPS` em escopo de módulo)** — como agora depende
  de `terrainGroundRadial`/`havokPlugin`, só pode ser calculada dentro de `setup()`. `SCHOOL_DIRS`
  (posições brutas, só fórmula, escopo de módulo) continua existindo e sendo usado só pela checagem
  de bacia (`nearAnySchool`), que não precisa da posição reposicionada pra funcionar corretamente —
  não tem o mesmo requisito de precisão que decidir onde uma escola realmente vai ficar.
- **Não confiar em "testei uma vez e deu 0/30" sem entender POR QUE deu certo** — a lição mais cara
  desta investigação. A primeira versão da correção passou num teste exaustivo de 30 escolas, foi
  deployada, e mesmo assim o usuário reportou o bug de novo — porque o teste media a MESMA coisa
  que a correção usava pra decidir (fórmula), então não podia pegar um erro DA PRÓPRIA fórmula
  (viés de confirmação por construção). A verificação que realmente valeu foi a que usou uma fonte
  de verdade INDEPENDENTE do mecanismo sendo corrigido (raycast físico direto, replicando
  `terrainGroundRadial` de fora do código de posicionamento).

## Pendências / dívidas conhecidas
- **Diagnóstico temporário ainda no HUD** (`buriedSchoolReport`/`ENTERRADAS:...` em
  `World3D.tsx`, sempre visível inclusive em produção) — foi essencial pra conseguir dado real do
  aparelho do usuário sem ferramenta de desenvolvedor, mas é ruído visual permanente que não devia
  ficar pra sempre. **Remover num próximo laboratório** depois de mais alguns dias de confirmação
  de que o bug não voltou (o usuário já confirmou uma vez: "testei denovo agora ficou certo").
- **Correção de morros invisíveis (`planetMat.backFaceCulling = false`) ainda sem confirmação do
  usuário** no momento em que este arquivo foi escrito — deployada, verificada por A/B ao vivo
  (alternando a flag) numa posição testada, mas não confirmada na posição exata que o usuário
  reportou originalmente.
- **Gap residual de ~0,14 a 0,58 unidade** (de um total de 1,10) mesmo depois da correção —
  média 0,86 nas 30 escolas, pior caso 0,52 (`q04`, perto do platô mais alto). Não é mais um bug
  visível (parede continua majoritariamente acima do chão, telhado não fica sozinho), mas é uma
  folga menor que o ideal — resquício da variação de relevo que `SCHOOL_SAFE_TERRAIN_VARIANCE =
  0.6` ainda permite. Se o usuário reportar alguma escola especificamente "meio afundada" (não
  "só o telhado", mas visivelmente mais baixa que as outras), começar por aqui, considerando
  reduzir esse limiar.
- **Nenhuma checagem de colisão entre escolas depois do reposicionamento.** `findFlatterSchoolUpReal`
  pode mover uma escola até ~3,4m do slot original; em tese, duas escolas vizinhas poderiam ambas
  ser empurradas uma em direção à outra. Risco considerado baixo, não verificado explicitamente.
- **A meta original do usuário ("escolinhas menores pra não sobrecarregar o planetinha") continua
  em aberto** — a tentativa de encolher foi revertida (não era a causa do afundamento, mas causou
  seu próprio bug isolado antes do revert). Vale reavaliar se ainda parece "sobrecarregado"
  visualmente agora que os bugs de afundamento/transparência estão corrigidos.

## Funcionalidades planejadas que NÃO foram concluídas
- Redução do tamanho da escolinha — tentada, causou um bug real (não relacionado à causa raiz
  verdadeira do afundamento), revertida. Não descartada: pedido do usuário continua válido, precisa
  reavaliação com o planeta já sem os bugs de afundamento/transparência.

## O que o próximo laboratório deve desenvolver
- Remover o diagnóstico temporário do HUD (`ENTERRADAS:...`) depois de confirmação continuada.
- Confirmar com o usuário se a correção de morros invisíveis resolveu no caso exato que ele viu.
- **Se "sobrecarregado" ainda for um problema visual**: considerar aumentar levemente a faixa de
  `phi`/espaçamento em vez de encolher a geometria — evita reabrir risco de regressão em
  `settleMeshOnTerrain`/`schoolUps`.
- Continuar o backlog normal de `prompt.md` conforme prioridade, fora esses itens específicos.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório: `npm run dev` em `app/`, entrar no
  jogo — o HUD de debug (sempre visível) mostra `ENTERRADAS:qNN(gap),...` pra cada escola; valores
  entre ~0,5 e ~0,95 são esperados (não mais negativos). Pra verificar morros: teleportar perto de
  uma escola próxima de `PLATEAU_CENTERS` (ex. `q04`, `q13`) e confirmar que a elevação aparece
  sólida, não transparente. `npm run test` confirma as 39 asserções de domínio inalteradas.
