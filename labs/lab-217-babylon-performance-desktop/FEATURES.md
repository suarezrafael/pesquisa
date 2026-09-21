# Laboratorio 217 - Performance Babylon no desktop e mobile

Status: concluido
Inicio: 2026-09-21
Fim: 2026-09-21
Commit inicial: 057c84228bc111e9ff95004cb849e95761b6bc56

## Objetivo do laboratorio

Reduzir o custo de CPU, memoria grafica e trabalho por quadro da cena principal sem degradar a
qualidade visual. O pedido parte de relato real de FPS baixo tambem em desktop, alem dos aparelhos
Android ja registrados no lab-193.

## Linha de base e diagnostico

- A cena atual cria 2264 malhas e, no planeta principal, reportou cerca de 937 malhas ativas no HUD.
- A medicao automatizada no Edge fica limitada pelo throttling de `requestAnimationFrame` ja
  documentado no lab-193; o valor observado de 1 FPS nao e baseline de hardware. A contagem de
  malhas e a inspecao do loop, entretanto, confirmam uma carga estrutural alta.
- O callback de `onBeforeRenderObservable` atualiza por quadro NPCs, carros, pets, fauna, luas e
  professores de planetas que nao estao sendo visitados.
- Dezenas de verificacoes de proximidade usam `Vector3.Distance` (raiz quadrada) a cada quadro,
  inclusive para mensagens de interface que toleram atualizacao a 10 Hz.
- Os tres motores Babylon usam `preserveDrawingBuffer: true`, embora o projeto nao leia o
  framebuffer; isso preserva memoria/banda da GPU sem beneficio funcional.

## Funcionalidades planejadas

- [x] Desligar `preserveDrawingBuffer` nos motores principal e de preview, mantendo os previews,
  captura pelo navegador e renderizacao visual funcionando.
- [x] Pausar animacoes/IA decorativas de mundos que nao estao ativos (professores e luas de outros
  planetas; fauna, NPCs, carros e decoracao animada da Terra quando o jogador estiver fora dela).
- [x] Atualizar dicas e indicadores de proximidade nao criticos em 10 Hz, preservando colisoes,
  movimento, coleta e gatilhos de gameplay a cada quadro.
- [x] Trocar comparacoes de distancia em loops quentes por distancia ao quadrado, sem alterar os
  raios de interacao.
- [x] Evitar alocacoes temporarias nos trechos alterados quando a API `*ToRef` do Babylon permitir.
- [x] Cobrir os novos helpers de distancia com testes unitarios deterministas.
- [x] Executar TypeScript, testes, lint, build e validar o jogo ao vivo no Edge, incluindo camera,
  movimento, proximidade, loja e painel de pets.

## Criterios de aceite

- Nenhum mundo invisivel executa seus loops decorativos enquanto outro mundo esta ativo.
- Dicas de proximidade respondem em ate 100 ms e gatilhos de gameplay continuam por quadro.
- Nao ha nova alocacao recorrente evidente nos loops alterados.
- O HUD nao aumenta contagem de malhas/draw calls e a cena mantem equivalencia visual.
- Build e testes ficam verdes; console do Edge sem novo erro.

## Fora de escopo

- Reescrever `World3D.tsx`, trocar Babylon.js, reduzir conteudo ou textura por padrao no desktop.
- Ativar `ScenePerformancePriority.Aggressive`, que pode desabilitar picking e culling necessario.
- Aplicar octree sem classificar corretamente todas as malhas dinamicas.
- Congelar materiais em massa sem auditar quais propriedades mudam durante clima, portais e voo.
- Novas especies/modelos de pet; essa entrega sera o laboratorio seguinte, depois deste P0.

## Implementacao entregue

- Os engines principal, benchmark, avatar preview e pet preview usam
  `preserveDrawingBuffer: false` e `stencil: false`. Nenhum consumidor de leitura de pixels ou
  stencil existe no projeto.
- `spatialPerformance.ts` centraliza comparacao por distancia ao quadrado, sem `sqrt` e sem criar
  `Vector3`. Gatilhos quentes, rede, parkour, colecionaveis e UI passaram a usa-lo.
- Labels de proximidade do Babylon GUI atualizam a 10 Hz; fisica, movimento, coleta e gatilhos
  continuam por quadro.
- NPCs e fauna proximos continuam por quadro; os distantes atualizam a 10 Hz com o tempo acumulado.
  Isso preserva a velocidade da simulacao e reduz rig, terreno, quaternion e collider updates.
- Nuvens, fauna, civis, carros, lagoa, piscina e portais da Terra param fora da Terra/interiores.
  Professores e luas atualizam apenas no planeta atualmente visitado.
- Quaternions temporarios passaram a ser copiados para a instancia existente em vez de clonados a
  cada quadro. O indice das quests das escolas e armazenado na construcao, eliminando
  `findIndex()` repetido no loop.

## Verificacao

- `npx tsc -b --force`: limpo.
- `npm run test -- --run`: 263/263 testes (2 novos para os helpers espaciais).
- `npm run lint`: sem novo achado; permanecem os 2 avisos preexistentes em `PetPanel.tsx` e
  `server-accounts/src/domain.test.ts`.
- `npm run build`: concluido sem erro.
- Edge real: mundo, camera, lojinha, preview de avatar, painel de pets e troca do preview de Gato
  Laranja para Gato Preto funcionaram; console sem erro.
- O Edge controlado por automacao continua limitando `requestAnimationFrame` a cerca de 1-2 FPS,
  comportamento ja documentado no lab-193. Esse numero nao e usado como benchmark de hardware;
  o ganho deve ser confirmado em desktop/Android fisico com `window.__perf.sample(15000)`.

## Referencias tecnicas

- Babylon.js, "Optimizing Your Scene": `freezeWorldMatrix`, `material.freeze`,
  `skipPointerMovePicking`, instancias e prioridades de performance.
- Babylon.js, "Instances": instancias e thin instances para reduzir draw calls.
- Babylon.js, "Selection Octrees": beneficio e obrigacao de tratar conteudo dinamico.
- Fontes oficiais: `https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene`,
  `https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances` e
  `https://doc.babylonjs.com/features/featuresDeepDive/scene/optimizeOctrees`.
- `docs/urgent-babylon-performance-lab.md` e `labs/lab-193-babylon-performance-mobile/FEATURES.md`.
