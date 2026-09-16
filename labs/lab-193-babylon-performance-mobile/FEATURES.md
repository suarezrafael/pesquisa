# Laboratório 193 — Auditoria de performance Babylon.js em mobile

Status: concluído (PRs #73, #74 e #75, todas mescladas e implantadas em produção; ciclo de review encerrado por decisão do usuário na rodada 4)
Início: 2026-09-16
Fim: 2026-09-16
Commit inicial: 6993f0c08c79b0f0587e2f085586af690b582eaf

## Objetivo do laboratório

Medir de verdade (não estimar) onde o FPS está sendo gasto no mundo 3D em aparelhos Android
modestos — o jogo roda perto de 60 FPS em notebook Chrome, mas foi reportado rodando em torno de
apenas 15 FPS num Redmi Pad 2, com Poco C75/Redmi Note 2 também instáveis — e aplicar só as
otimizações pequenas e seguras que os dados realmente justificarem, deixando as maiores
documentadas como plano pra labs futuros.

Origem: pedido urgente do usuário, registrado em `docs/urgent-babylon-performance-lab.md` (P0,
preempta a ordem normal do backlog) e um adendo correspondente em
`docs/gameplay-market-expansion-backlog.md`. Confirmado com o usuário via `AskUserQuestion` que a
sequência correta era: terminar o lab-192 (preview de pets) já em andamento primeiro, depois
iniciar este como **lab-193** (o próprio documento urgente já previa esse ajuste de número: "usar
o próximo número real livre").

## Investigação prévia

A investigação de código já tinha sido feita pelo próprio usuário em
`docs/urgent-babylon-performance-lab.md` §3 — conferida aqui contra o código atual antes de
prosseguir (contagens têm pequena variação porque o documento foi escrito num commit ligeiramente
anterior, dentro do esperado):

- `World3D.tsx` é um monolito de milhares de linhas com render/física/HUD 3D/multiplayer/NPCs/
  pets/planeta/casa/loja/parque/foguete/efeitos tudo junto.
- Confirmado via `grep`: 238 chamadas `MeshBuilder.Create*` (doc citava 247), 132 criações de
  `PBRMaterial`/`ShaderMaterial`/`StandardMaterial` (doc citava 134), 75 chamadas
  `addShadowCaster` (doc citava 77) — números próximos, consistentes com o documento ter sido
  escrito pouco antes.
- **`window.__perf` já existe** (linha ~12270), mas só expõe `fps`/`drawCalls`/`physicsTimeMs`/
  `frameTimeMs`/`activeMeshes`/`totalMeshes` — faltam os contadores mais específicos que a
  `SceneInstrumentation`/`EngineInstrumentation` do Babylon.js já sabem calcular:
  `activeMeshesEvaluationTime`, `renderTime`, `particlesRenderTime`, `renderTargetsRenderTime`,
  `cameraRenderTime`, além de percentis (p5/p1, não só a média/instantâneo atual) e uma função de
  amostragem contínua (hoje só dá pra ler um valor de cada vez, manualmente, no console).
- `engine.setHardwareScalingLevel` já começa em 1.15 pra dispositivos fracos, com auto-tune
  contínuo por FPS em tiers `[1.0, 1.15, 1.4, 1.6]` — já existe uma malha de ajuste automático,
  mas sem dado estruturado de QUAL recurso está custando caro, o auto-tune só mexe em resolução.
- `DefaultRenderingPipeline` com FXAA sempre ligado, MSAA reduzido em low-end, SSAO2/GlowLayer
  desativados em low-end, sombras dinâmicas praticamente desligadas em low-end — já existem vários
  ramos de qualidade condicionados a `isLowEndDevice`, mas de forma dispersa pelo arquivo, não um
  perfil único documentado.
- Existem clones (não instances/thin instances) pra props visuais repetidos — o benchmark interno
  e a grama já usam `thinInstanceSetBuffer`, mas isso não foi generalizado pra outros props
  repetidos.

## Funcionalidades planejadas

- [x] Ampliar `window.__perf` com os contadores que faltam (`activeMeshesEvaluationTimeMs`,
  `renderTimeMs`, `particlesRenderTimeMs`, `renderTargetsRenderTimeMs`, `cameraRenderTimeMs` via
  `SceneInstrumentation`; `gpuFrameTimeMs` via `EngineInstrumentation`) e
  `hardwareScalingLevel`/`isLowEndDevice`/`isSmallScreen`/`quality` atuais.
- [x] Nova função `window.__perf.sample(durationMs)` — coleta amostras quadro a quadro por N
  milissegundos (padrão 15000) e devolve um JSON com médias e percentis (p5/p1) de FPS/frame time,
  pronto pra colar num relatório, sem precisar do DevTools Performance tab.
- [ ] Documentar baseline medido ao vivo — **não concluído**: a limitação de ferramental (ver
  "Verificação ao vivo" abaixo) impediu cobrir as 5 cenas planejadas com números confiáveis;
  baseline real contra um Android físico fica pendente pra quando houver aparelho disponível.
- [ ] Classificar, com base nos contadores reais, se o gargalo dominante em cada cena é CPU/draw
  calls/GPU/física/GUI — **não concluído pelo mesmo motivo do item anterior** (sem baseline
  confiável por cena, não há dado pra classificar gargalo nenhum; ver "Achados ao vivo" pros bugs
  reais encontrados testando a instrumentação, que é uma coisa diferente de uma classificação de
  gargalo por cena).
- [x] Aplicar a otimização pequena e seguramente justificável por leitura de código completa
  (`scene.skipPointerMovePicking`); as demais candidatas do documento urgente foram avaliadas e
  **não aplicadas nesta sessão** por falta de dado real que as justifique (ver "Otimizações
  candidatas avaliadas e não aplicadas").
- [x] Lista priorizada de otimizações MAIORES pra labs futuros (thin instances generalizado, perfil
  de qualidade mobile explícito, culling por planeta/área, pool de efeitos temporários,
  simplificação de NPCs distantes, LOD/impostor, revisão de materiais/texturas) — não implementadas
  aqui, só documentadas com prioridade/risco.

## Implementação

`window.__perf` (`World3D.tsx`, perto do fim de `setup()`) ganhou, além dos 6 campos que já
existiam (`fps`/`drawCalls`/`physicsTimeMs`/`frameTimeMs`/`activeMeshes`/`totalMeshes`):

- `activeMeshesEvaluationTimeMs`/`renderTimeMs`/`cameraRenderTimeMs`/`particlesRenderTimeMs`/
  `renderTargetsRenderTimeMs` — via `SceneInstrumentation` (contadores que já existem na engine, só
  não estavam ligados: `captureRenderTime`/`captureActiveMeshesEvaluationTime`/
  `captureParticlesRenderTime`/`captureRenderTargetsRenderTime`/`captureCameraRenderTime = true`).
- `gpuFrameTimeMs` — via `EngineInstrumentation.captureGPUFrameTime`; no-op (fica em 0) em
  navegadores sem a extensão de timer query da GPU (comum em WebGL1/Android mais antigo).
- `hardwareScalingLevel`/`isLowEndDevice`/`isSmallScreen`/`quality` — expõe o estado atual do
  auto-tune de resolução e da classificação de aparelho já existentes, sem os quais os números de
  FPS/draw calls não têm contexto (60 FPS a escala 1.6 é um aparelho sofrendo, não um aparelho bem).
- `sample(durationMs = 15000)` — nova função assíncrona: registra um observer em
  `scene.onAfterRenderObservable`, acumula uma amostra de TODOS os campos acima por quadro durante
  a janela pedida, e resolve com médias e (pra FPS) percentis baixos p5/p1 — a métrica que capta
  travadela perceptível que uma média sozinha esconde. Rejeita se chamada de novo enquanto uma
  amostragem anterior ainda está em andamento (evita dois observers concorrentes).

## Achados ao vivo (bugs reais, encontrados testando a própria instrumentação nova)

Testar a instrumentação contra o mundo 3D de verdade (não só ler o código) achou 3 problemas reais,
todos corrigidos antes desta lab ir a review:

1. **`window.__perf` podia apontar pra uma cena já destruída.** Em dev, a dupla montagem do
   `<StrictMode>` (mesma classe de problema já documentada no benchmark de GPU, comentário mais
   acima no arquivo) cria dois `Engine`/`Scene` por vez; a atribuição de `window.__perf` não tinha
   guarda de `disposed`, então se o `setup()` do mount JÁ DESMONTADO terminasse DEPOIS do mount real
   (GLBs vêm do cache do navegador na 2ª vez, ordem de conclusão não é garantida), `window.__perf`
   ficava preso numa engine morta — todo número lia zero/parado pra sempre, mesmo com o jogo
   rodando normalmente na tela. Só afeta dev (produção nunca monta duas vezes); corrigido com
   `if (disposed) return` antes da atribuição, mesmo padrão já usado em outros pontos deste efeito.
2. **`gpuFrameTimeMs` estava em nanossegundos, não milissegundos.** A extensão de timer query da
   GPU (`EXT_disjoint_timer_query` no WebGL, timestamp query no WebGPU) devolve o tempo bruto em
   nanossegundos — confirmado lendo o código-fonte real de
   `engine.query.pure.js`/`webgpuTimestampQuery.js` no `@babylonjs/core` instalado, nenhum dos dois
   caminhos converte. Sem a divisão por 1e6, um frame de GPU de ~10ms aparecia como "10336672.57 ms"
   (quase 3 horas) — óbvio na leitura ao vivo, mas teria passado batido numa inspeção só de código.
3. **Um único quadro com `deltaTime` zero (`engine.getFps() === Infinity`) contaminava a MÉDIA de
   FPS do `sample()` inteira** (virava `NaN`, que aparece como `null` no JSON) sem afetar p5/p1 (que
   olham só a ponta baixa do array ordenado — por isso o bug não apareceu ali, só na média).
   Corrigido filtrando amostras não-finitas antes de qualquer estatística (`Number.isFinite`), não
   só na soma da média.

Os três foram verificados corrigidos rodando `window.__perf.sample()` de verdade contra o mundo
carregado (não só lendo o código de novo) — ver seção seguinte pro método usado.

## Verificação ao vivo — método e limitação de ferramental

**Achado de ferramental, mesma classe já registrada em memória de sessões anteriores**: a aba
controlada pela automação do Chrome desta sessão fica "em segundo plano" pro compositor real do
navegador mesmo quando é a única aba visível — o que trava `requestAnimationFrame` quase por
completo (o `engine.runRenderLoop` do jogo depende inteiramente de rAF). Sobrescrever
`document.hidden`/`document.visibilityState` via `Object.defineProperty` só engana verificações que
o PRÓPRIO código faz contra essas propriedades (nenhuma existe neste jogo) — não desbloqueia o
throttling de rAF de verdade, que é decidido pelo compositor do Chrome, não pelo valor JS dessas
propriedades. Na prática, cada quadro só avançava quando uma ação de automação (screenshot, clique)
forçava uma repintura pontual — passivamente, o `sample()` ficava com `sampleCount: 0` mesmo depois
de dezenas de segundos reais de espera.

**Método usado pra validar mesmo assim**: iniciar `window.__perf.sample(N)` sem `await` (guardando a
promise em `window`), depois forçar de 3 a 4 repinturas manuais via screenshots espaçados, depois
ler o resultado — suficiente pra confirmar que a coleta/agregação/percentis funcionam ponta a ponta
(foi assim que os 3 bugs acima foram encontrados: `sampleCount` chegando a 7 amostras reais, valores
plausíveis e coerentes entre si depois das correções — ex.: `renderTimeMs` 46.31 e
`cameraRenderTimeMs` 55.36 na mesma janela, `gpuFrameTimeMs` 17.95 depois da correção de unidade).

**O que isso significa pro objetivo original do lab**: os NÚMEROS de FPS coletados nesta sessão (na
casa de 3-5 FPS mesmo no planeta principal) são um artefato do throttling de rAF da automação, não
uma medição real de desempenho — não servem de baseline. Baseline de verdade contra um Android físico
continua pendente (mesma limitação de ferramental já disclosed nos labs 177/178/179/187 — nenhum
dispositivo Android real disponível pra automação nesta sessão). O que ESTE lab entrega de sólido é
a ferramenta corrigida e verificada — o usuário (ou uma sessão futura com acesso a um aparelho real)
agora pode rodar `window.__perf.sample(15000)` num Android de verdade e colar o JSON resultante num
relatório, algo que não era possível antes com confiança (os bugs acima teriam corrompido o
resultado).

## Otimizações candidatas avaliadas e não aplicadas

Todas as candidatas abaixo vieram do próprio `docs/urgent-babylon-performance-lab.md`. Só
`scene.skipPointerMovePicking` foi aplicada — as outras foram avaliadas e descartadas PRA ESTA
SESSÃO, não porque são más ideias, mas porque aplicá-las direito exige ou dado real de dispositivo
(que não está disponível) ou uma auditoria grande demais pra "pequena e segura":

- **`isPickable = false` em decorativos**: avaliada e descartada — com `skipPointerMovePicking`
  ligado E nenhuma chamada a `scene.pick`/`onPointerObservable` em todo o arquivo (confirmado por
  busca), `isPickable` já não tem nenhum consumidor ativo; marcar meshes como não-pickable não
  mudaria custo nenhum agora. Documentado aqui só pra não ser sugerido de novo sem essa análise.
- **`material.freeze()` em materiais estáticos**: **não aplicada** — exige confirmar, PRA CADA um
  dos ~130 `PBRMaterial`/`ShaderMaterial` do arquivo, que nenhuma propriedade dele muda em tempo de
  execução (o glow pulsante dos portais de escola, o brilho do "idoso" dos pets, a cor do fog/céu
  na viagem espacial, e outros já mexem em material em tempo real) — auditoria grande, fica pro
  próximo lab de performance dedicado a isso.
- **`Vector3.Distance` → squared distance nos loops quentes**: **não aplicada** — das 45 ocorrências
  no arquivo, distinguir quais rodam por quadro (loop quente) das que rodam uma vez (setup/one-off)
  exige ler cada uma no contexto; sem tempo de CPU medido apontando qual delas pesa de verdade, não
  dá pra priorizar com segurança dentro do "pequeno" deste lab.
- **Raycast duplicado no mesmo quadro**: os 6 call sites de `havokPlugin.raycast` encontrados têm
  propósitos claramente distintos (chão do avatar, chão do pet em destino, obstrução de câmera,
  obstrução de caminho, "warmup", chão genérico) — nenhuma duplicação óbvia nova (a duplicação já
  conhecida foi corrigida no lab-188). Não investigado mais fundo por falta de tempo de CPU medido
  que justificasse.

## Otimizações candidatas aplicadas

- **`scene.skipPointerMovePicking = true`** (logo após `new Scene(engine)`): o Babylon roda por
  padrão uma varredura de picking na cena inteira a cada evento `pointermove` (mouse/touch), usada
  pra popular `scene.meshUnderPointer`/disparar hover de `ActionManager`. Confirmado por busca no
  arquivo inteiro que este jogo não usa NENHUM dos três (`scene.pick`, `onPointerObservable`,
  `meshUnderPointer`) — interação usa raycast físico direto (`havokPlugin.raycast`) e arrasto de
  câmera lê eventos de ponteiro crus do canvas. Verificado ao vivo que arrastar a câmera continua
  girando o mundo normalmente e a interação por proximidade (botão "E") continua aparecendo.

## Review automático do Copilot

**Rodada 1** (3 achados reais, corrigidos; mais 4 achados suprimidos de menor prioridade, 2 deles
também corrigidos por serem baratos):

- `sample()` nunca devolvia `totalMeshes` no relatório, só a leitura instantânea tinha esse campo —
  corrigido lendo `scene.meshes.length` no momento de resolver.
- Uma amostragem em andamento não era cancelada no desmonte do componente (`teardown`) — se a cena
  fosse destruída no meio da janela, o `setTimeout` ainda disparava depois contra uma cena morta e
  resolvia um relatório alegando ter coberto a janela `durationMs` pedida inteira, quando só tinha
  quadros de antes do desmonte. Corrigido compartilhando uma função `finish()` entre o caminho normal
  (timeout) e uma nova `(scene as any).__cancelPerfSample` chamada no `teardown` — cancelar agora
  resolve na hora com a duração REAL decorrida, não a pedida. Verificado ao vivo: cancelar no meio de
  uma janela de 20s resolve imediatamente com `durationMs: 0`/`sampleCount: 0`, e uma nova
  amostragem pode começar em seguida sem ficar presa em "já em andamento".
- Quando a janela não recebe nenhum quadro finito (o próprio caso de travamento em segundo plano já
  disclosed nesta lab), `fps.min` virava `Infinity`, que ao serializar em JSON vira `null` — corrigido
  com um fallback explícito em 0 (`minOrZero`), mesmo padrão já usado em `mean`.

Corrigidos por serem baratos e diretamente relacionados (dos 4 achados suprimidos de menor
prioridade):

- `quality()` derivava o rótulo só da classificação inicial (`isLowEndDevice`), então um aparelho
  "forte" reduzido pelo auto-tune pra escala 1.6 continuava relatando "alta" — corrigido derivando
  do `hardwareScalingLevel` ATUAL (`> 1` → "reduzida (auto-tune, escala X)").
- `gpuTier` (a classificação bruta do benchmark: `'weak'`/`'strong'`/`'pending'`) não estava exposta
  em lugar nenhum, só os campos derivados (`isLowEndDevice`/`quality`) — adicionado tanto no
  `window.__perf` ao vivo quanto no relatório de `sample()`.
- `frameTimeMs` só tinha `avg`/`max`, sem o percentil que a documentação desta própria lab prometia
  ("percentis de FPS/frame time") — adicionado `p95` (a cauda lenta, quadros de pior frame time),
  reaproveitando a mesma função de percentil genérica já usada pro FPS (renomeada de `lowPercentile`
  pra `percentileAt`, já que agora serve os dois sentidos).

Os 2 achados suprimidos restantes (`isPickable`/`material.freeze()` já cobertos na seção acima como
"avaliados e não aplicados") não se aplicam a este ponto — eram sobre o mesmo tema já documentado.

Todos os 3 achados reais + os 2 extras foram verificados ao vivo (não só corrigidos no código) via
`window.__perf.sample()`/`window.__perf.gpuTier()`/`window.__perf.quality()` rodando contra o mundo
carregado, incluindo forçar o cancelamento no meio de uma janela de 20s.

**Rodada 2**: solicitada normalmente após o push da rodada 1, mas o check-run
`copilot-pull-request-reviewer` ficou "in_progress" por mais de 65 minutos sem concluir — bem acima
do padrão desta sessão (2-10 min nas labs anteriores) e sem sinal de erro/timeout, só lento. Uma
segunda tentativa de solicitação foi deduplicada pelo GitHub (não gerou um novo evento
`review_requested` na timeline da PR, confirmado via API). Consultado o usuário via
`AskUserQuestion`; decisão: seguir pro merge sem esperar a rodada 2, tratando a rodada 1 (que já
achou e corrigiu 3 bugs reais na instrumentação nova) como suficiente. **A rodada 2 na verdade
terminou 7 minutos antes do merge** (`13:13:07`, merge em `13:20:58`) — só não apareceu a tempo na
consulta feita via `gh pr view --json reviews` (propagação da API, mesmo comando que segundos depois
já mostrava as 2 rodadas). Achados corrigidos numa PR de acompanhamento pós-merge, ver seção
seguinte.

## Achados pós-merge (rodada 2, chegou depois do merge de PR #73)

3 achados reais + 1 achado de documentação, todos corrigidos; 1 achado investigado e rejeitado como
falso positivo:

1. **Percentil com off-by-one em tamanhos de amostra comuns (real, o mais sério dos 3)**: a fórmula
   original (`floor(n * p)` como índice 0-based) errava o rank — com 20 quadros,
   `floor(20 * 0.95) = 19` cai no ÚLTIMO elemento (índice 19 de um array de 20, ou seja, o rank
   100%), não no p95. Corrigido com nearest-rank padrão (`rank = ceil(n * p)`, 1-indexado,
   `sorted[rank - 1]`). Verificado isoladamente: `percentileAt([1..20], 0.95)` agora devolve `19`
   (não `20`).
2. **`engine.getFps()` não é uma leitura por quadro (real)**: o próprio arquivo já documentava
   (comentário do benchmark de GPU, linhas ~2239-2245, de um lab anterior) que esse é um contador
   interno do Babylon atualizado periodicamente, não a cada `onAfterRender` — empilhar o mesmo valor
   repetido várias vezes numa janela mascara exatamente a travadela que p1/p5 deveriam capturar.
   Corrigido (nesta rodada) derivando o FPS de cada amostra a partir de `1000 / frameTimeCounter.current`
   (esse sim um valor genuinamente por quadro — confirmado lendo o código-fonte real do
   `@babylonjs/core` instalado: `beginMonitoring()`/`endMonitoring()` do `frameTimeCounter` rodam em
   `onBeforeAnimationsObservable`/`onAfterRenderObservable`, um par por quadro). Verificado ao vivo
   que `fps.avg` bate matematicamente com `1000 / frameTimeMs.avg` na mesma janela. **Achado do
   review automático do Copilot, numa rodada seguinte: esta nota ficou desatualizada** — a Rodada 3
   (abaixo) trocou a fonte de novo, de `frameTimeCounter` pra `engine.getDeltaTime()`, porque
   `frameTimeCounter` mede a duração do TRABALHO por quadro, não o intervalo de relógio real; depois
   dessa troca, `fps.avg` NÃO bate mais com `1000 / frameTimeMs.avg` (são fontes diferentes de
   propósito, ver Rodada 3). Este item fica registrado como estava no momento, só com esta nota de
   correção pra não confundir quem ler na ordem.
3. **`window.__perf` não era limpo no desmonte do componente (real, mas de baixo impacto prático)**:
   depois de desmontar a cena (fechar/trocar de tela), o global continuava vivo referenciando
   `scene`/`engine` já destruídos; chamar `sample()` nesse intervalo (antes da próxima montagem
   terminar seu próprio `setup()`, que demora segundos por causa dos GLBs/Havok) devolvia um
   relatório vazio sem aviso. Corrigido com `(scene as any).__cleanupPerf`, chamado no `teardown`,
   que só apaga `window.__perf` se ele ainda for o MESMO objeto publicado por esta instância — evita
   que o desmonte de um mount velho apague o `__perf` de um mount mais novo que já tenha terminado
   primeiro (mesma classe de corrida do `StrictMode` da rodada 1). Verificado por rastreamento do
   código (não há um jeito prático de forçar essa corrida específica via automação de navegador sem
   StrictMode real).
4. **Checklist marcando `[x]` num item que o próprio texto admite incompleto (documentação)**: os 2
   itens de "Documentar baseline"/"Classificar gargalo por cena" estavam marcados concluídos citando
   a limitação de ferramental como se fosse só uma nota de rodapé — corrigido pra `[ ]` com o texto
   deixando claro que não foram cumpridos, evitando um checklist mentiroso.
5. **`EngineInstrumentation`/`SceneInstrumentation` não são descartados explicitamente no
   `teardown` — investigado e REJEITADO como falso positivo**: confirmado lendo o código-fonte real
   do `@babylonjs/core` instalado que `scene.dispose()` já limpa TODOS os observables que
   `SceneInstrumentation` registra (`onAfterRenderObservable`, `onBeforeActiveMeshesEvaluationObservable`,
   etc. — `scene.pure.js` linhas ~4762-4780) e `engine.dispose()` já limpa
   `onBeginFrameObservable`/`onEndFrameObservable` (`abstractEngine.pure.js` linhas 1580-1581), que é
   exatamente onde `EngineInstrumentation.captureGPUFrameTime` se registra — mesma classe de
   verificação (código-fonte real, não só documentação) já usada no lab-192 pra um achado parecido.
   Sem chamada a `.dispose()` explícita, os objetos `SceneInstrumentation`/`EngineInstrumentation`
   em si só viram lixo de GC comum (sem listener pendurado, já que os observables donos foram
   limpos) — não uma "instrumentação acumulando entre remounts" como a rodada 2 descreveu.

`npx tsc -b` limpo; testes: app 213/213 (inalterado); `npm run build` sem regressão. Verificado ao
vivo via Chrome real (nova rodada de captura de `sample()`, incluindo o cálculo de percentil
isolado). PR de acompanhamento (#74) aberta separada da PR #73 (já mesclada), seguindo o mesmo ciclo
de review/CI/confirmação de merge.

**Rodada 3 (na PR #74, achou 2 problemas reais e mais fundamentais na própria correção da rodada
2)**: a correção anterior trocou `engine.getFps()` (contador periódico) por
`1000 / frameTimeCounter.current` — resolvia a "leitura repetida", mas `frameTimeCounter` mede a
duração do TRABALHO de Babylon por quadro (bracket entre `onBeforeAnimations`/`onAfterRender`), não
o intervalo de relógio real entre quadros; um quadro que renderiza em 4ms dentro de um orçamento de
16.67ms (60 FPS reais) reportaria 250 FPS, não 60 — errado sempre que o motor não está no limite da
GPU/CPU (a maioria do tempo de jogo real). Corrigido usando `engine.getDeltaTime()`
(`instantaneousFrameTime` do `PerformanceMonitor` interno, atualizado a cada `beginFrame()` de
verdade — confirmado no código-fonte do `@babylonjs/core`: `_measureFps()`, chamado de dentro de
`beginFrame()`, grava tanto o FPS médio quanto o delta instantâneo na MESMA chamada, mas só o delta
é por quadro de verdade). Um segundo achado, mais sutil: mesmo com o delta certo, calcular
`fps.avg` como a MÉDIA das razões `1000/delta[i]` de cada amostra superestima o FPS real quando o
tempo por quadro varia (dois quadros de 10ms+20ms: média das razões = (100+50)/2 = 75 FPS, mas o FPS
real da janela é 2 quadros / 0.030s = 66.67) — o mesmo erro clássico de tirar média aritmética de
taxas em vez de agregar primeiro e converter depois. Corrigido agregando (`mean`/`percentileAt`)
sobre os DELTAS em ms e só convertendo em FPS no fim (`msToFps`), com `min`/`p5`/`p1` de FPS
mapeados pro `max`/95º/99º percentil de DELTA (quadro mais longo = FPS mais baixo), não o mesmo
percentil aplicado direto num array já convertido. Verificado isoladamente contra o exemplo exato do
review (`mean([10, 20]) → msToFps → 66.67`, batendo com `2 / 0.030`) e ao vivo via `sample()` real.

**Rodada 4 (achou 2 problemas reais na PRÓPRIA correção da rodada 3, mais 2 achados de
documentação)**: de novo terminou minutos antes do merge da PR de acompanhamento (#74) e só apareceu
na API depois — mesmo padrão de atraso das rodadas anteriores.

1. **Delta 0 não era filtrado na coleta (real)**: `engine.getDeltaTime()` pode devolver 0 (primeiro
   quadro, ou duas leituras no mesmo tick) — um delta 0 não é "infinitamente rápido", é uma amostra
   inválida, mas `finite()` sozinho não filtra (0 é um número finito de verdade) e incluí-lo dilui
   `mean(deltaTimeSamples)` pra baixo, inflando o FPS médio reportado. Corrigido filtrando na
   PRÓPRIA coleta (`if (deltaTimeMs > 0) deltaTimeSamples.push(deltaTimeMs)`), não só depois.
2. **Percentil nearest-rank ainda errava o alvo pra "pior fração" com outlier raro (real, o mais
   sutil dos 4 achados desta lab)**: a correção da rodada 1 trocou `floor(n*p)` por nearest-rank
   (`ceil(n*p)`) pra resolver um off-by-one, mas nearest-rank ainda não é a ferramenta certa pra
   "pior 5%/1%" quando o outlier é raro — com 20 amostras e só 1 quadro ruim, `ceil(20*0.95) = 19`
   cai no ÚLTIMO quadro BOM (19 de 20 já satisfazem "95% dos quadros ≤ este valor" pela definição
   padrão de percentil), nunca apontando pro único quadro ruim que "pior 5%" deveria capturar.
   Corrigido substituindo por uma função dedicada (`worstAt`, não mais percentil padrão): conta
   `worstCount = ceil(n * fraction)` elementos A PARTIR DO TOPO do array ordenado — com 1 quadro
   ruim em 20, `worstCount = 1` sempre aponta pro próprio outlier, nunca pro vizinho bom mais
   próximo. Verificado isoladamente: `worstAt([10 × 19, 100], 0.05)` devolve `100` (o outlier),
   enquanto o nearest-rank anterior devolvia `10` (perdia o outlier completamente).
3. **Nota da Rodada 2 ficou desatualizada depois da Rodada 3 trocar a fonte do FPS de novo**:
   corrigida com uma nota explícita (ver item 2 da Rodada 2 acima) em vez de reescrever a história.
4. **Descrição da PR #74 citava a fonte antiga (`frameTimeCounter`) depois da Rodada 3 já ter
   trocado pra `engine.getDeltaTime()` dentro da mesma PR**: não corrigido (PR já mesclada quando o
   achado chegou; a documentação de verdade — este arquivo — já está correta).

`npx tsc -b` limpo; testes: app 213/213 (inalterado); `npm run build` sem regressão. Verificado ao
vivo via Chrome real e isoladamente (`worstAt`/filtro de delta 0) contra os exemplos do próprio
review.

**Rodada 5 (última desta lab — ver nota abaixo)**: 1 achado trivial corrigido (typo "desatardada" →
"desatualizada", já corrigido acima) e 1 achado de nomenclatura avaliado e mantido como está:
`frameTimeMs.p95` usa `worstAt` (limite do pior 5%, a mesma semântica de "1% low"/"5% low" já usada
em `fps.p1`/`fps.p5`), não o percentil padrão nearest-rank que o nome "p95" tecnicamente sugere —
com `[10×19, 100]`, devolve `100` (o outlier), não o 19º valor que um p95 padrão devolveria. Mantido
de propósito: pra detectar travadela real (o objetivo desta instrumentação), o limite do pior 5% é
mais útil que o percentil padrão, que pode esconder exatamente o outlier raro que se quer achar —
mesma razão que motivou trocar de percentil padrão pra `worstAt` na rodada 4. O nome do campo
(`p95`) ficou tecnicamente impreciso, mas renomear mudaria o formato do relatório sem ganho real.

**Encerrando o ciclo de review aqui**: esta é a 4ª rodada consecutiva de achados nesta mesma função
(`sample()`), cada uma mais sutil que a anterior. Consultado o usuário via `AskUserQuestion` sobre
continuar o ciclo até convergência plena (2 rodadas seguidas sem achado novo, o padrão desta sessão)
ou encerrar aqui — decisão: encerrar depois desta PR, tratando `window.__perf`/`sample()` como uma
ferramenta de debug/dev que não precisa de perfeição estatística, não lógica de negócio.

1. **Perfil de qualidade mobile explícito e único** (prioridade alta, risco baixo) — hoje os ramos
   `isLowEndDevice` (FXAA/MSAA/SSAO2/GlowLayer/sombra/shadow map size) estão espalhados por todo
   `World3D.tsx`; consolidar num objeto único de "perfil de qualidade" tornaria o auto-tune capaz de
   decidir com base nos contadores novos deste lab (`activeMeshesEvaluationTimeMs` alto → reduzir
   meshes ativos; `cameraRenderTimeMs`/`gpuFrameTimeMs` alto → reduzir pipeline de pós-processo),
   não só a resolução (`hardwareScalingLevel`) como hoje.
2. **Thin instances generalizado pra props repetidos** (prioridade alta, risco médio) — só o
   benchmark interno e a grama usam `thinInstanceSetBuffer` hoje; árvores/rochas/outros props
   repetidos ainda são clones completos (mesh + material próprios), cada um um draw call. Maior
   ganho potencial de todos, mas expandir o escopo exige testar sombra/colisão por instância.
   Requer medição real (`drawCalls`/`renderTimeMs` por cena) pra confirmar que draw calls (não
   active-mesh-evaluation ou GPU fill-rate) é de fato o gargalo antes de investir aqui.
3. **Auditoria de `material.freeze()`** (prioridade média, risco baixo por material, alto na soma)
   — mapear os ~130 materiais do arquivo em "estático" vs "muda em tempo real", congelar só o
   primeiro grupo. Trabalho mecânico mas grande.
4. **Culling por planeta/área** (prioridade média, risco médio) — hoje todo o planeta principal
   (~30 escolas + props) parece existir simultaneamente; desabilitar (`setEnabled(false)`) meshes de
   áreas distantes do avatar reduziria `activeMeshesEvaluationTimeMs` e draw calls ao mesmo tempo.
   Precisa de cuidado com o HUD de "descoberta"/quests que dependem de mesh visível.
5. **LOD/impostor pra NPCs e props distantes** (prioridade baixa-média, risco médio) — Babylon tem
   suporte nativo a LOD; NPCs/decoração distantes do avatar não precisam da malha completa.
6. **Revisão de materiais/texturas** (prioridade baixa, risco baixo) — não investigado nesta sessão;
   candidata a lab dedicado se os números de `gpuFrameTimeMs`/fill-rate um dia apontarem GPU como
   gargalo dominante (não CPU/draw-calls).
7. **Squared-distance nos loops quentes identificados** (depende do item 1 — precisa de dado de CPU
   por cena pra saber quais das 45 ocorrências valem a pena).

## Fora de escopo (conforme o próprio documento urgente)

- Reescrever `World3D.tsx` inteiro.
- Trocar Babylon.js por outro motor.
- Remover conteúdo jogável pra mascarar FPS, ou piorar leitura visual pra ganhar FPS artificial.
- Ligar `scene.performancePriority`/`scene.freezeActiveMeshes()` sem medir e documentar riscos
  primeiro (podem quebrar objetos dinâmicos/labels/teleporte/picking).
- Converter props pra thin instances nesta sessão, a menos que seja um caso pequeno e comprovado
  seguro — se for grande, fica documentado como próximo lab.
- Mexer em monetização, chat, nickname, assinatura ou backend.
