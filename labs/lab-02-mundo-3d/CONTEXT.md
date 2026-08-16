# Contexto — Laboratório 02 — Mundo 3D

Preenchido em: 2026-08-16
Commit inicial → final: 8188d82e267ed88289474ef0599444fdc7ce7307..HEAD (commit deste wrap)

## O que foi feito

1. **`docs/prompts/`** integrado ao repositório (`01-seguranca.md`, `02-design-profissional.md`,
   `03-arquitetura-sistema.md`, `04-manutencao-clean-code.md` + `README.md`), fornecido pelo
   usuário via zip. `CLAUDE.md` atualizado para referenciar esses critérios como padrão de
   qualidade obrigatório em todo laboratório futuro.

2. **Hub 2D substituído por um mundo 3D navegável** (`app/src/world3d/World3D.tsx`), usando
   Babylon.js + física real Havok (`@babylonjs/core`, `@babylonjs/havok`, `@babylonjs/gui`,
   `@babylonjs/loaders`). A camada de domínio (`quests.ts`, `progression.ts`, `storage.ts`,
   `QuestModal.tsx`, `RewardToast.tsx`) **não foi alterada** — só a apresentação/exploração
   mudou, provando a separação de camadas de `docs/prompts/03-arquitetura-sistema.md` §1.

3. **Física real, não cosmética:** avatar é uma esfera com corpo físico dinâmico (massa,
   restituição, atrito) que colide de verdade com chão, muros invisíveis e troncos de árvore;
   passo de física fixo (~60Hz via `HavokPlugin(useDeltaForWorldStep=false, ...)`), desacoplado
   do framerate de renderização, conforme pedido explicitamente pelo usuário. Colisores são
   simplificados (cilindro/caixa/esfera), nunca a malha visual completa.

4. **Qualidade visual dentro do orçamento zero** (sem asset pago/baixado): materiais
   `PBRMaterial` em tudo, sombras dinâmicas (`ShadowGenerator` com blur), `DefaultRenderingPipeline`
   (tonemapping ACES + FXAA), `SSAO2RenderingPipeline` leve, `GlowLayer` nos portais de missão.
   Instancing (`createInstance`) nas 8 árvores decorativas para reduzir draw calls.

5. **Controles:** teclado (WASD/setas) e um joystick virtual touch feito à mão
   (`TouchJoystick.tsx`, sem biblioteca externa), ambos alimentando a mesma velocidade física do
   avatar.

6. **10 portais de missão em 3D**, 1 por quest, dispostos em círculo, com anel + label numérico
   (Babylon GUI) e cor por tipo de quest (`questVisuals.ts`). Bloqueados/desbloqueados/concluídos
   têm materiais visuais diferentes (cinza opaco / brilho colorido / brilho verde). Ao avatar
   chegar perto de um portal desbloqueado (checagem de distância no loop de física, não colisão
   física — portais não têm colisor sólido), abre o `QuestModal` existente sem nenhuma mudança
   nele.

7. **Performance:** code-splitting via `React.lazy()` — o motor 3D (~1,3MB gzip) só é baixado ao
   entrar no mundo; a tela de onboarding carrega um bundle de ~67KB gzip. `vite-plugin-pwa`
   reconfigurado (`maximumFileSizeToCacheInBytes`) pra ainda pré-cachear o bundle 3D no service
   worker apesar do tamanho.

8. **Testado de ponta a ponta no Chrome:** onboarding → mundo 3D carrega (chão, árvores
   instanciadas, avatar, 10 portais) → aproximar do portal 1 abre o quiz real → responder certo
   dá recompensa (XP/moedas/badge) → portal 1 muda pra "concluído" e portal 2 desbloqueia
   visualmente, tudo através do código real (sem mock), inclusive testado via teleporte de QA
   (ver decisões) para exercitar o gatilho de proximidade sem depender de segurar tecla por
   tempo real em automação de navegador.

## Decisões técnicas tomadas

- **Babylon.js em vez de Three.js** — física, GUI e loader glTF já integrados no mesmo pacote,
  menos código de cola pra manter entre sessões (critério de `docs/prompts/04-manutencao-clean-code.md`).
  Já era a stack prevista na Opção B de `prompt.md` §7.
- **Havok em vez de Rapier/Cannon-es** (que o usuário sugeriu como alternativas) — Havok é o
  motor físico usado em jogos AAA, ficou gratuito em 2024, e tem integração oficial de primeira
  classe na Babylon.js. Mais realista que as alternativas sugeridas, sem custo adicional.
  Detalhado com justificativa completa em `prompt.md` §7.1 (nova subseção).
- **Sem assets 3D externos (glTF/HDRI baixados) neste laboratório** — baixar um arquivo de
  terceiros (mesmo gratuito/CC0) é uma ação que pede confirmação explícita do usuário antes de
  ser executada; não presumi essa autorização. O pipeline de carregamento glTF já está instalado
  e pronto (`@babylonjs/loaders`), só falta a fonte do asset e a autorização de download.
- **Câmera fixa (chase-cam simplificada)** em vez de câmera orbital livre ou primeira pessoa —
  evita a complexidade de colisão de câmera e controles de rotação por toque, mantendo o jogo
  legível pra uma criança de 10 anos. Trade-off documentado, não omissão.
- **QA de proximidade via teleporte de debug** (`window.__debugTeleport`, só em `import.meta.env.DEV`)
  — usado pra testar o gatilho dos portais sem depender de simular tecla segurada por segundos
  reais em automação de navegador. Não vai para build de produção.

## Pendências / dívidas conhecidas

- **IBL real (HDRI) e texturas PBR completas (normal/roughness/AO map)** não implementadas —
  dependem de baixar asset CC0 de terceiros (Poly Haven, por exemplo), o que exige permissão
  explícita do usuário antes de eu executar o download. Hoje a cena usa cor sólida + luz
  hemisférica/direcional, sem reflexo de ambiente real.
- **Sem modelos glTF reais** — toda geometria é primitiva procedural (esfera, cilindro, torus).
  Mesma dependência de asset externo + permissão do item acima.
- **Leitura contínua de FPS não foi possível capturar 100% ao vivo** nesta sessão de teste:
  o Chrome throttla `requestAnimationFrame` de abas em segundo plano no ambiente de automação
  usado para testar, então o contador de FPS (`window.__perf`, visível também como overlay em
  dev, canto superior direito) fica "congelado" entre capturas. A métrica que consegui medir de
  forma confiável e real (não estimada) foi o tempo de frame de um frame efetivamente renderizado:
  **~18,7ms/frame (equivalente a ~53 FPS) com o pipeline completo ativo (PBR + sombras + SSAO +
  tonemapping), ~55 draw calls com a cena inteira carregada**, numa GPU integrada Intel UHD (não
  dedicada) via ANGLE/D3D11 — hardware modesto, não uma GPU de jogo. Recomendo ao usuário abrir a
  URL numa aba normal em primeiro plano e observar o overlay de debug (canto superior direito, só
  em `npm run dev`) para uma leitura contínua ao vivo.
- Nenhum teste automatizado (unitário/integração) foi escrito para a lógica 3D — só verificação
  manual e via teleporte de QA no navegador.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das 7 funcionalidades do `FEATURES.md` ficou de fora — a única ressalva é que
"qualidade visual alta" foi entregue na parte que não depende de asset externo (PBR, sombras,
pós-processamento); IBL/texturas/modelos reais viraram dívida técnica explícita acima, não
omissão silenciosa.

## O que o próximo laboratório deve desenvolver

Candidatos, a confirmar com o usuário no próximo `lab start`:
- Perguntar ao usuário se autoriza baixar um HDRI CC0 (Poly Haven) e/ou um pacote glTF low-poly
  (Kenney.nl) para elevar a fidelidade visual conforme pendência acima — declarar arquivo,
  origem e tamanho antes de baixar.
- Hub social / cooperação em sala, Supabase real, deploy em hosting real (candidatos herdados de
  `labs/lab-01-fundacao/CONTEXT.md`, ainda não feitos).
- Se o mundo 3D crescer (mais objetos, animações de personagem), revisar orçamento de
  performance e considerar LOD, já que hoje nenhum objeto passa do limiar que justificaria.

## Estado do repositório ao final

- Branch: `copilot/pesquisa-mercado-jogo-educativo`
- Como rodar: `cd app && npm install && npm run dev`. Em dev, o overlay de debug (FPS/draw
  calls/meshes) aparece no canto superior direito do mundo 3D.
- `npm run build` gera a versão de produção com PWA (bundle inicial ~67KB gzip, mundo 3D
  ~1,3MB gzip carregado sob demanda).
