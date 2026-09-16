# Laboratório 193 — Auditoria de performance Babylon.js em mobile

Status: em andamento
Início: 2026-09-16
Fim: -
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

- [ ] Ampliar `window.__perf` com os contadores que faltam (`activeMeshesEvaluationTime`,
  `renderTime`, `particlesRenderTime`, `renderTargetsRenderTime`, `cameraRenderTime` via
  `SceneInstrumentation`; `gpuFrameTime`/tier via `EngineInstrumentation` quando suportado pelo
  navegador) e `hardwareScalingLevel`/`isLowEndDevice`/qualidade atual.
- [ ] Nova função `window.__perf.sample(durationMs)` — coleta amostras por N milissegundos (padrão
  15000) e devolve um JSON com médias e percentis (p5/p1) de FPS/frame time, pronto pra colar num
  relatório, sem precisar do DevTools Performance tab.
- [ ] Documentar baseline medido em pelo menos 5 cenas/rotas (spawn do planeta principal, área com
  props/árvores, parkour/moedas, Marte com inimigos/morros, casa ou lojinha/preview) — ao vivo via
  Chrome real nesta sessão (aparelho Android físico não está disponível pra esta sessão de
  automação; documentar isso como limitação de ferramental, mesma classe já conhecida de vários
  labs anteriores).
- [ ] Classificar, com base nos contadores reais (não achismo), se o gargalo dominante em cada cena
  é CPU (active meshes/loops JS/raycasts), draw calls (clones/materiais), GPU/fill-rate (post-
  process/resolução/PBR), física (Havok) ou GUI (labels).
- [ ] Aplicar só otimizações pequenas e seguras que os dados justificarem (candidatas do próprio
  documento urgente: `scene.skipPointerMovePicking`, `isPickable=false` em decorativos,
  `material.freeze()` em materiais estáticos, `freezeWorldMatrix()` onde faltar, squared distance
  em vez de `Vector3.Distance` nos loops quentes, evitar raycast duplicado no mesmo quadro).
- [ ] Lista priorizada de otimizações MAIORES pra labs futuros (thin instances generalizado, perfil
  de qualidade mobile explícito, culling por planeta/área, pool de efeitos temporários,
  simplificação de NPCs distantes, LOD/impostor, revisão de materiais/texturas) — não implementadas
  aqui, só documentadas com prioridade/risco.

## Fora de escopo (conforme o próprio documento urgente)

- Reescrever `World3D.tsx` inteiro.
- Trocar Babylon.js por outro motor.
- Remover conteúdo jogável pra mascarar FPS, ou piorar leitura visual pra ganhar FPS artificial.
- Ligar `scene.performancePriority`/`scene.freezeActiveMeshes()` sem medir e documentar riscos
  primeiro (podem quebrar objetos dinâmicos/labels/teleporte/picking).
- Converter props pra thin instances nesta sessão, a menos que seja um caso pequeno e comprovado
  seguro — se for grande, fica documentado como próximo lab.
- Mexer em monetização, chat, nickname, assinatura ou backend.
