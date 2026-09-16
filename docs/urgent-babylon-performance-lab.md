# Missao Aprender - Lab urgente de performance Babylon.js

Data: 2026-09-16
Branch base: `main`
Prioridade: P0 urgente

Este documento cria um lab emergencial para revisar o uso do motor 3D Babylon.js no jogo. O objetivo
nao e simplesmente "baixar grafico", e sim encontrar o melhor equilibrio possivel entre qualidade
visual e FPS real em navegador, principalmente em aparelhos Android modestos.

## 1. Sintoma reportado

- Notebooks com Chrome rodam perto de 60 FPS.
- Poco C75 e Redmi Note 2 tem FPS baixo ou instavel.
- Redmi Pad 2 foi reportado em torno de 15 FPS.
- A qualidade visual precisa melhorar em textura/leitura, mas sem perder fluidez.

Conclusao inicial: se desktop esta em 60 FPS e mobile/tablet cai muito, o gargalo pode estar em
fill-rate/resolucao, mas tambem pode estar em CPU/JS/fisica/draw calls/post-process. O historico do
proprio `World3D.tsx` ja registra que reduzir `hardwareScalingLevel` nem sempre melhora o Poco C75,
entao o lab deve medir antes de otimizar.

## 2. Literatura Babylon.js que deve guiar o lab

Fontes oficiais/primarias consultadas:

- Babylon.js - Optimizing Your Scene:
  https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/scene/optimize_your_scene.md
- Babylon.js docs - Scene Optimizer:
  https://doc.babylonjs.com/features/featuresDeepDive/scene/sceneOptimizer
- Babylon.js docs - Optimize scene with octrees:
  https://doc.babylonjs.com/features/featuresDeepDive/scene/optimizeOctrees
- Babylon.js docs - Inspector / instrumentation:
  https://doc.babylonjs.com/toolsAndResources/inspector

Pontos da documentacao que se aplicam diretamente ao Missao Aprender:

- Usar `SceneInstrumentation` e, quando suportado, `EngineInstrumentation` para descobrir se o
  gargalo e CPU, GPU, fisica, active meshes, particles, render targets ou draw calls.
- Usar `TransformNode` quando o no nao renderiza nada; malhas vazias entram em avaliacao de frustum.
- Congelar materiais estaticos com `material.freeze()` quando nao serao alterados.
- Congelar matriz de mundo de objetos estaticos com `mesh.freezeWorldMatrix()`.
- Reduzir draw calls com instances/thin instances para objetos repetidos.
- Evitar picking em movimento quando nao usado: `scene.skipPointerMovePicking = true`.
- Considerar `isPickable = false` em props decorativos, labels, particulas, colisor invisivel e
  qualquer objeto que nunca precise de picking.
- Usar culling strategy adequada para muitos meshes pequenos/low-poly quando CPU-bound.
- Revisar `scene.performancePriority` com cuidado; modos `Intermediate`/`Aggressive` mudam
  comportamento e nao devem ser ligados cegamente.
- Revisar post-process/sombras/particles em mobile; eles podem custar caro mesmo quando a cena
  parece simples.
- Medir draw calls: a propria doc diz que a direcao geral e manter esse numero o menor possivel.

## 3. Analise inicial do codigo na main

Arquivos principais:

- `app/src/world3d/World3D.tsx`
- `app/src/world3d/studentFigure.ts`
- `app/src/world3d/AvatarPreview3D.tsx`
- `app/package.json`

Stack atual:

- `@babylonjs/core` `^9.21.2`
- `@babylonjs/gui` `^9.21.2`
- `@babylonjs/havok` `^1.3.14`

Achados objetivos no codigo:

- `World3D.tsx` e um monolito com milhares de linhas e muitas responsabilidades de render, fisica,
  HUD 3D, multiplayer, NPCs, pets, planeta, casa, loja, parque, foguete e efeitos.
- A cena principal usa `new Engine(canvas, !isLowEndDevice, { preserveDrawingBuffer: true, stencil:
  true })`.
- Dispositivos fracos comecam em `engine.setHardwareScalingLevel(1.15)`, depois ha auto-tune
  continuo por FPS com tiers `[1.0, 1.15, 1.4, 1.6]`.
- Existe `DefaultRenderingPipeline` com FXAA sempre ligado, MSAA reduzido em low-end, SSAO2
  desativado em low-end, GlowLayer desativado em low-end e sombras dinamicas praticamente
  desligadas em low-end por override de `shadowGenerator.addShadowCaster`.
- Ja existe `SceneInstrumentation`, mas hoje captura principalmente `physicsTime` e `frameTime`;
  faltam contadores de `activeMeshesEvaluationTime`, `renderTime`, `particlesRenderTime`,
  `cameraRenderTime`, `renderTargetsRenderTime` e possivelmente `EngineInstrumentation` quando
  suportado.
- Contagem estatica aproximada em `World3D.tsx`: 247 chamadas `MeshBuilder.Create*`, 134 criacoes
  de material PBR/Shader, 77 chamadas `addShadowCaster`, 109 usos de GUI 2D/labels/linkWithMesh.
- Ha props glTF clonados e congelados com `freezeWorldMatrix`, mas clone nao reduz draw calls como
  instancing/thin instancing. O benchmark interno ja usa `thinInstanceSetBuffer`, e a grama tambem,
  mas muitos props visuais repetidos ainda usam clone.
- O jogo usa muitos `buildStudentFigure` para avatar, NPCs, professores, pessoas da piscina e
  jogadores remotos. Cada figura tem varias malhas PBR e entra em sombras quando habilitadas.
- Existem varios loops por frame com `Vector3.Distance`, atualizacao de moedas, critters, NPCs,
  labels, portais, carros, inimigos, camera, pet, raycasts Havok, particulas e GUI vinculada a
  meshes.
- Existe cenario dinamico com Havok e raycasts por frame: chao/pulo, camera obstruction, camera
  path, pet ground em alguns contextos e logica de colisao/interacao.
- A cúpula de estrelas ja foi otimizada com `DynamicTexture` e `setEnabled(false)` quando invisivel,
  um bom padrao a preservar.
- O codigo ja tem decisoes especificas por `isLowEndDevice`; o lab deve evoluir isso para um perfil
  de qualidade mais explicito, medido e documentado, sem depender de tentativa manual por aparelho.

Hipoteses de gargalo a validar, nesta ordem:

1. CPU-bound por avaliacao de active meshes, loops JS por frame, raycasts e atualizacao de muitos
   objetos pequenos.
2. Draw-call-bound por muitos clones/meshes/materials separados.
3. GPU/fill-rate-bound por post-process, FXAA, resolucao efetiva, particulas e materiais PBR.
4. Fisica-bound por Havok/raycasts/PhysicsAggregate desnecessarios em objetos decorativos.
5. GUI-bound por muitos `TextBlock.linkWithMesh`/labels ativos mesmo longe do jogador.

## 4. Lab recomendado

### Lab urgente - Auditoria Babylon.js mobile performance e plano de otimizacao

- Numero sugerido: usar o proximo numero real livre. Em 2026-09-16, `lab-192` ja estava em
  andamento (preview 3D de pets) quando este documento foi lido — usar
  `labs/lab-193-babylon-performance-mobile/`. Este lab preempta a ordem normal do backlog. Nao
  implementar "locomocao sem moonwalk" neste lab mesmo que o documento antigo chame outro item de
  Lab 192.
- Problema / hipotese: tablets/celulares modestos estao caindo para ~15 FPS porque a cena atual
  pode estar gastando CPU/GPU em malhas, draw calls, fisica, labels, raycasts, materiais e
  post-process acima do necessario. Se o uso do Babylon.js for alinhado as recomendacoes oficiais,
  o jogo pode ganhar FPS mantendo ou ate melhorando a qualidade visual percebida.
- Usuario beneficiado: crianca em Android de entrada/intermediario e responsavel que avalia a
  qualidade do produto.
- Escopo:
  - Criar um perfil de medicao repetivel usando a instrumentacao existente, sem overlay paralelo.
  - Ampliar `window.__perf` para expor FPS medio/p5/p1, draw calls, meshes ativos/total, frame time,
    physics time, active meshes evaluation, render time, particles render time, render targets time,
    camera render time, hardware scaling, GPU tier, low-end flag e qualidade atual.
  - Adicionar um modo de amostragem por console ou flag, por exemplo `window.__perf.sample(15000)`,
    que coleta 15s e retorna JSON copiavel para teste em Redmi Pad 2, Poco C75, Redmi Note 2 e
    notebook Chrome.
  - Documentar baseline em pelo menos 5 cenas/rotas: spawn planeta principal, area com props/arvores,
    parkour/moedas, Marte com inimigos/morros, casa/lojinha ou preview.
  - Classificar gargalo por dispositivo: CPU active meshes, CPU fisica/raycast, draw calls, particles,
    post-process, fill-rate/resolucao, GUI/labels.
  - Implementar apenas otimizacoes seguras e pequenas no mesmo lab, se a medicao apontar baixo risco:
    `scene.skipPointerMovePicking = true`, `isPickable=false` em objetos decorativos, freeze de
    materiais estaticos, freeze de matrizes faltantes, desligar labels distantes, reduzir loops por
    frame com squared distance, e evitar raycasts repetidos quando resultado pode ser cacheado por
    quadro.
  - Criar uma lista priorizada de otimizacoes maiores para labs seguintes: thin instances para props
    repetidos, pools para efeitos temporarios, LOD/impostor em planeta/props distantes, perfil
    mobile quality, culling/enablement por planeta/area, simplificacao de NPCs distantes e revisao
    de materiais/texturas.
- Fora de escopo:
  - Reescrever `World3D.tsx` inteiro.
  - Trocar Babylon.js por outro motor.
  - Remover conteudo jogavel para mascarar FPS.
  - Piorar leitura visual para ganhar FPS artificial.
  - Implementar chat livre, mini-jogos ou moonwalk neste lab.
- Criterios de aceite:
  - Existe `labs/lab-193-babylon-performance-mobile/FEATURES.md` com baseline e conclusoes.
  - `window.__perf` consegue coletar amostras em producao/publicacao sem DevTools avancado.
  - Relatorio separa CPU, GPU, draw calls, fisica, particles, post-process e GUI.
  - Nenhuma otimizacao e aplicada sem antes explicar qual contador ou achado justifica.
  - Em notebook Chrome, o jogo continua proximo de 60 FPS.
  - Em dispositivo Android testado pelo usuario, o FPS deve melhorar ou, se nao melhorar, o lab deve
    provar com dados qual gargalo restou e qual e o proximo lab tecnico correto.
  - Qualidade visual nao pode cair a ponto de deixar texto/legenda/avatar/objetos ilegíveis.
  - `npx tsc -b`, `npm run build` e testes relevantes passam.
- Metricas esperadas:
  - `fps_avg`, `fps_p5`, `fps_p1`.
  - `frame_time_avg_ms`, `frame_time_p95_ms`.
  - `draw_calls_avg`, `active_meshes_avg`, `total_meshes`.
  - `physics_time_avg_ms`, `active_meshes_eval_avg_ms`, `render_time_avg_ms`,
    `particles_render_time_avg_ms`, `render_targets_time_avg_ms`.
  - `hardware_scaling_level`, `quality_profile`, `gpu_tier`, `is_low_end_device`.
- Riscos:
  - Ligar `scene.performancePriority` ou `freezeActiveMeshes` cegamente pode quebrar objetos
    dinamicos, labels, teleport, planeta, casa, loja, pet, multiplayer ou picking.
  - Thin instances podem quebrar props que precisam de collider, estado individual, sombra ou
    material diferente.
  - Reduzir labels/GUI pode prejudicar UX infantil se esconder instrucoes importantes.
  - Desligar post-process pode melhorar FPS mas piorar leitura visual; precisa de comparacao por
    screenshot.
  - Medir so desktop forte pode dar conclusao falsa; o lab precisa do JSON de aparelhos reais.
- Prioridade: P0 urgente.

## 5. Prompt pronto para o Claude

Use este prompt quando for mandar o Claude executar o lab:

```text
Voce esta no repositorio Missao Aprender. Atue como engenheiro senior de performance 3D Babylon.js,
com foco em browser mobile Android de entrada/intermediario. Este e um lab urgente, prioridade P0,
porque o jogo roda ~60 FPS em notebook Chrome, mas aparelhos como Redmi Pad 2 chegam a ~15 FPS e
Poco C75/Redmi Note 2 tem FPS baixo.

Antes de mexer, leia:

- README.md
- CLAUDE.md
- labs/CURRENT.md
- docs/urgent-babylon-performance-lab.md
- docs/gameplay-market-expansion-backlog.md
- app/src/world3d/World3D.tsx
- app/src/world3d/studentFigure.ts
- app/src/world3d/AvatarPreview3D.tsx
- app/package.json

Crie um lab novo usando o proximo numero real livre. Em 2026-09-16, `lab-192` ja estava em
andamento — use `labs/lab-193-babylon-performance-mobile/`. Este lab preempta a ordem normal; NAO
implemente locomocao sem moonwalk agora.

Objetivo do lab:

Revisar o uso do Babylon.js na cena principal e criar uma auditoria de performance repetivel. O
objetivo nao e apenas reduzir qualidade grafica; e identificar gargalos reais e melhorar FPS sem
destruir qualidade visual. Siga a documentacao oficial do Babylon.js sobre otimizacao de cena:
instrumentacao, draw calls, instances/thin instances, freeze de materiais/matrizes, pickability,
culling, performance priority, post-process, particulas e SceneOptimizer.

Regras:

- Meça antes de otimizar.
- Nao crie overlay de FPS paralelo; estenda a instrumentacao existente (`window.__perf` e HUD de
  debug).
- Nao ligue `scene.freezeActiveMeshes()` nem `scene.performancePriority` cegamente. Se testar, faca
  atras de flag/experimento e documente os riscos.
- Nao remova conteudo jogavel so para ganhar FPS.
- Nao piore texto, avatar, legenda, planeta, loja ou objetos importantes a ponto de ficarem
  ilegíveis.
- Nao mexa em monetizacao, chat, nickname, assinatura ou backend.
- Preserve o comportamento infantil/educativo.

Tarefas obrigatorias:

1. Criar `labs/lab-193-babylon-performance-mobile/FEATURES.md` com objetivo, baseline, achados,
   criterios de aceite, testes e decisoes.
2. Ampliar `window.__perf` para expor:
   - fps atual, fps medio, fps p5/p1 em uma amostra
   - frame time
   - draw calls
   - active meshes / total meshes
   - physics time
   - active meshes evaluation time
   - render time
   - particles render time
   - render targets render time
   - camera render time
   - hardware scaling
   - gpu tier / isLowEndDevice
3. Criar uma funcao de amostragem simples, por exemplo `window.__perf.sample(15000)`, que colete
   dados por 15 segundos e retorne/imprima JSON copiavel.
4. Rodar ou documentar roteiro de teste em:
   - spawn planeta principal
   - area com props/arvores
   - parkour/moedas
   - Marte/morros/inimigos
   - casa ou lojinha/preview
5. Identificar, com base nos contadores, se o gargalo principal e CPU, GPU, draw calls, fisica,
   post-process, particles, GUI/labels ou resolucao.
6. Aplicar somente otimizacoes pequenas e seguras justificadas por dados. Candidatas:
   - `scene.skipPointerMovePicking = true`, se o jogo nao usa pointer move picking.
   - `isPickable = false` em props decorativos, particulas, labels, colisores invisiveis e objetos
     sem picking.
   - `material.freeze()` em materiais estaticos que nao recebem alteracao por quadro.
   - `freezeWorldMatrix()` onde estiver faltando em objetos realmente estaticos.
   - trocar `Vector3.Distance` por squared distance nos loops quentes quando so ha comparacao por
     raio.
   - reduzir atualizacao de labels/interacoes distantes por throttling/culling seguro.
   - evitar raycast duplicado no mesmo quadro quando resultado ja existe.
7. Nao converter props para thin instances no escopo deste lab a menos que seja um caso pequeno,
   seguro e comprovado. Se for grande, deixe como proximo lab com plano.
8. Atualizar `labs/CURRENT.md` ao final com resumo claro, resultados e proximo lab recomendado.

Metas:

- Desktop Chrome deve continuar perto de 60 FPS.
- Android intermediario deve buscar pelo menos 30 FPS medio, com p5 acima de 24 FPS quando possivel.
- Redmi Pad 2 saindo de ~15 FPS deve ter melhora mensuravel ou um diagnostico claro do gargalo que
  explique por que nao melhorou ainda.
- A qualidade visual deve manter leitura boa de avatar, UI, labels e objetos importantes.

Entregue:

- Codigo pequeno e testado.
- Baseline/relatorio no FEATURES.md.
- Lista de proximos labs de otimizacao por impacto/risco.
- Comandos executados e resultado de `npx tsc -b`, `npm run build` e testes relevantes.
```

## 6. Proximos labs provaveis depois da auditoria

Estes labs so devem ser executados depois que o lab urgente provar qual gargalo domina:

1. Props repetidos com thin instances/instances sem quebrar colisores.
2. Perfil mobile quality explicito: low/mid/high com regras de sombras, particulas, labels, LOD e
   post-process.
3. Culling por planeta/area: desabilitar objetos de planetas/casa/arena que nao estao em uso.
4. Pool de efeitos temporarios: laser, fumaca, shock, moedas e particulas.
5. Simplificacao de NPCs/critters distantes: update rate menor, mesh simplificada ou desativacao.
6. LOD/impostor para props e landmark distantes.
7. Revisao de materiais/texturas: menos PBR onde Standard/unlit resolve, mais textura/atlas onde
   melhora qualidade percebida sem aumentar draw calls.

