# Laboratório 192 — Preview 3D de verdade na lojinha de pets

Status: em andamento
Início: 2026-09-16
Fim: -
Commit inicial: 3ecf90ce75e33ce5cdc465b5145112377d3b3dc1

## Objetivo do laboratório

Dar ao painel de pets um preview 3D de verdade do pet equipado (hoje é só um emoji num grid plano),
fechando o critério de aceite "criança consegue escolher pet... com preview claro" — e criando a
base reutilizável (função de montagem do pet extraída, mesmo padrão já usado pro boneco) que um
laboratório futuro de cosméticos de pet vai precisar de qualquer jeito.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 206 - Pets premium de qualidade, roupas e
máscaras" — próximo item recomendado depois do lab-191 (P1, "após Lab 203 corrigir tamanho/
posicionamento do pet atual", já resolvido no lab-188).

## Investigação prévia (leitura do código, antes de codar)

- **O item do backlog na verdade embute 3 pedaços independentes, cada um do tamanho de um lab
  inteiro**: (a) catálogo de pets mais rico (mais espécies, modelos mais detalhados), (b)
  cosméticos de pet (roupa, coleira, chapéu, capa, máscara), (c) tela clara de escolha com preview.
  **Achado real**: hoje NÃO EXISTE NENHUM preview 3D no painel de pets (`PetPanel.tsx`) — só um
  emoji plano no mesmo grid do `AvatarShop.tsx`. Sem preview nenhum, adicionar cosméticos (b) não
  teria como ser mostrado com clareza — o preview é o pré-requisito de verdade pros outros dois
  pedaços, não um acessório independente. Este lab escolhe (c) como fatia inicial, cita (a)/(b)
  como "fora de escopo, laboratório futuro" abaixo.
- **Achado real, boa notícia pra viabilidade**: `buildGato`/`buildCachorro` (`World3D.tsx`,
  funções que montam o pet de verdade no jogo) já são funções PURAS e autocontidas —
  `buildGato(scene, shadowGenerator, furColor): TransformNode` — sem nenhuma dependência de estado
  do componente `World3D` (ao contrário do que se poderia temer). Isso é o MESMO formato que
  `buildStudentFigure`/`applyHat`/etc. (`studentFigure.ts`) já usam pro preview do boneco — esse
  arquivo foi extraído do `World3D.tsx` num lab anterior justamente pra permitir o preview de
  avatar (`AvatarPreview3D.tsx`) reaproveitar a MESMA lógica de montagem sem duplicar. Pets nunca
  passaram por essa extração porque não havia preview nenhum até agora.
- **Catálogo atual** (`data/pets.ts`): só 2 espécies (`gato`/`cachorro`), 4 pets no total
  (diferenciados só por nome/emoji/cor da pelagem). `PET_SPECIES_SCALE_MULTIPLIER` (lab-188) já
  ajusta a escala visual por espécie.
- **Estado já existente pra reaproveitar** (`types.ts`): `Progress.equippedPetId`,
  `unlockedPetIds`, `petCareCounts`, `petAdoptedAt` — o preview vai refletir `equippedPetId`
  (o mesmo pet que já aparece seguindo o jogador no mundo 3D), igual o preview de avatar reflete
  `profile.avatarEmoji`/cosméticos equipados — não uma "seleção em rascunho" separada.
- **Risco real citado no próprio backlog** ("aumentar meshes/materials e derrubar FPS"): o preview
  de avatar (`AvatarPreview3D.tsx`) já resolveu exatamente esse risco pro boneco — motor Babylon
  PRÓPRIO, isolado do mundo principal (sem física/Havok, sem o resto do mundo carregado), canvas
  pequeno. Reaproveitar a mesma arquitetura pro preview de pet significa este lab herda a mesma
  mitigação por construção, não precisa resolver de novo.

## Funcionalidades planejadas

- [x] Extrair `buildGato`/`buildCachorro` de `World3D.tsx` pra um módulo novo
  `world3d/petFigure.ts` (mesmo espírito de `studentFigure.ts`), exportadas — `World3D.tsx` passa
  a importar de lá em vez de definir localmente. Comportamento do pet no MUNDO principal não pode
  mudar (mesma função, só de lugar diferente).
- [x] Novo componente `PetPreview3D.tsx` (mesmo padrão de `AvatarPreview3D.tsx`: motor/cena/câmera
  próprios, `ArcRotateCamera` com giro automático, sem física, canvas pequeno) — mostra o pet
  EQUIPADO (`progress.equippedPetId`), usando `petVisualScale(stage, species)` (já existe,
  `progression.ts`) pra bater com o tamanho real do pet no mundo.
- [x] `PetPanel.tsx`: preview novo no topo do painel (mesmo lugar/espírito do preview do
  `AvatarShop.tsx`) — estado "nenhum pet equipado" quando `equippedPetId` é `null` (placeholder
  claro, não um preview vazio/quebrado).
- [x] Verificação ao vivo (Chrome real): abrir o painel de pets com um pet equipado, confirmar o
  preview bate com o pet visto no mundo (mesma espécie/cor/escala); trocar de pet equipado
  atualiza o preview instantaneamente; sem pet equipado mostra o placeholder, não quebra.
- [x] Confirmar ao vivo que a extração de `buildGato`/`buildCachorro` não mudou nada no
  comportamento do pet no MUNDO principal (aparência, escala, sombra) — regressão zero esperada,
  já que é só mover a função de lugar.
- [x] Confirmar que o preview não vaza material/textura/shadow-caster ao trocar de pet repetidas
  vezes (mesma medição já feita pro preview de avatar no lab-176 — contagem de materiais antes/
  depois de vários ciclos).

## Implementação

- `world3d/petFigure.ts` (novo): `buildGato`/`buildCachorro` movidas verbatim de `World3D.tsx` —
  eram funções puras (só recebiam `scene`/`shadowGenerator`/`furColor`), sem nenhum estado do
  componente pra desembaraçar. `World3D.tsx` importa as duas de lá; os 5 call sites (bichos
  selvagens vagando/empoleirados + o pet adotável de verdade) continuam idênticos.
- `world3d/PetPreview3D.tsx` (novo): motor Babylon próprio (sem física/Havok), câmera
  `ArcRotateCamera` com giro automático (raio 1.1, alvo `(0, 0.15, 0)` — ajustado ao vivo depois
  de um raio inicial de 0.75 cortar o pet fora do quadro), luz ambiente HDRI (mesmo arquivo já
  usado por `AvatarPreview3D.tsx`/mundo principal — achado ao vivo: sem isso o pet renderiza
  ESCURO, mesmo bug já corrigido pro avatar no lab-87, "o avatar fica escuro"). Reconstrói o pet
  (`dispose(false, true)` + rebuild) a cada troca de `petId`/`stage`, mesmo padrão de
  `AvatarPreview3D.tsx`.
- `world3d/PetPanel.tsx`: `PetPreview3D` importado via `lazy()` (mesmo motivo de
  `AvatarPreview3D` em `AvatarShop.tsx` — `PetPanel.tsx` é importado direto por `App.tsx`, sem
  lazy isso baixaria `@babylonjs/core` em rotas como `/familia` que nunca abrem o painel de pets).
  Preview novo logo abaixo do subtítulo, mostrando o pet EQUIPADO com o mesmo cálculo de
  estágio/idade já usado pela grade (`petStageFor`/`petAgeYears`/`petLifecycleStage`). Sem pet
  equipado, mostra um placeholder "🐾" em vez de um preview vazio.
- `data/pets.ts`: comentário de topo atualizado (referenciava o local antigo de
  `buildGato`/`buildCachorro`).
- `index.css`: `.pet-preview-3d-*` novo, mesmo espírito de `.avatar-preview-3d-*` mas menor (140px,
  pets são bichos pequenos).

## Verificação ao vivo (Chrome real)

Perfil de teste existente (`92b92cd2-...`, já tinha "Gato Laranja" adotado e equipado — um gato
"Idoso" de 46 anos de convivência, útil pra testar o blend de cor grisalha de idoso também).

- **Achado real corrigido em duas rodadas de ajuste ao vivo**: com o raio de câmera inicial (0.75)
  e o alvo `(0, 0.2, 0)` copiados sem ajuste do preview de avatar, o pet aparecia CORTADO no
  quadro (só cabeça/orelha/rabo visíveis) — a escala de um pet (~0.3-0.4 unidades) é bem menor que
  a de um boneco inteiro. Corrigido ao vivo testando valores direto no console
  (`scene.activeCamera.radius`/`.target`) até achar um enquadramento que mostra o pet inteiro com
  folga (raio 1.1, alvo `y: 0.15`) antes de fixar no código.
- **Achado real corrigido**: o pet renderizava ESCURO (mesmo bug do lab-87 pro avatar) — confirmado
  via `scene.getMaterialByName('gatoFur').albedoColor` retornando a cor CERTA (o blend grisalho de
  idoso, matematicamente correto), provando que o problema era só iluminação (sem
  `environmentTexture`, PBR sem reflexo/specular nenhum), não o cálculo de cor. Corrigido
  adicionando o mesmo HDRI que `AvatarPreview3D.tsx` já usa.
- Confirmado que o pet no MUNDO principal (fora do painel) segue renderizando idêntico depois da
  extração — mesma cor grisalha de idoso, mesmas orelhas/rabo, sem diferença visual.
- Confirmado que trocar de pet equipado (comprou e equipou "Cachorro Marrom", um filhote) atualiza
  o preview instantaneamente — geometria/cor corretas pra cada espécie.
- Confirmado, medindo `scene.materials.length`/`scene.meshes.length` antes/depois de 3 trocas de
  pet em sequência (gato→cachorro→gato→cachorro), que a contagem fica ESTÁVEL (3 materiais: chão +
  1 material do pet atual; nunca acumula material do pet anterior) — mesma técnica de verificação
  já usada pro preview de avatar no lab-176.
- Confirmado que sem pet equipado (`equippedPetId: null`) o painel mostra o placeholder "🐾" sem
  quebrar.
- Perfil de teste restaurado ao estado original (`coins: 699`, só "Gato Laranja" desbloqueado/
  equipado) ao final.

**Pendência disclosed**: viewport mobile/touch real não verificado (mesma limitação de ferramental
já conhecida de vários labs anteriores desta sessão).

## Review automático do Copilot (PR #72)

**Rodada 1** — 1 comentário gerado (falso positivo, investigado e descartado) + 1 suprimido (real,
corrigido):

- **Falso positivo, investigado e descartado**: o comentário gerado pedia pra descartar
  explicitamente `scene`/`shadowGenerator` na limpeza de desmontagem (além de `engine.dispose()`).
  Verificado contra o CÓDIGO-FONTE de verdade do `@babylonjs/core` instalado (não só a
  documentação): `AbstractEngine.dispose()` (`abstractEngine.pure.js`) já itera `this.scenes` e
  chama `scene.dispose()` em cada uma; `Scene.dispose()` (`scene.pure.js`) já chama
  `_disposeList(this.lights)`, que dispara `Light.dispose()`; `Light.dispose()`
  (`Lights/light.js`) já itera `this._shadowGenerators` e chama `shadowGenerator.dispose()` em
  cada um. A cadeia inteira (engine → cena → luz → shadow generator) já é coberta só por
  `engine.dispose()` — o MESMO padrão já usado por `AvatarPreview3D.tsx` (nunca descarta
  `scene`/`shadowGenerator` separadamente também, e está em produção sem esse problema há vários
  labs). Nenhuma mudança de código.
- **Real, grave, corrigido (achado suprimido)**: a troca de pet DENTRO de uma mesma sessão do
  preview (não a desmontagem) chamava só `petRootRef.current?.dispose(false, true)` — o MESMO
  vazamento já documentado (e corrigido) pro preview de avatar no lab-176 (`disposeStudentFigure`):
  `dispose(false, true)` libera material/textura recursivamente, mas NUNCA remove as malhas da
  `renderList` do `ShadowGenerator`. Achado irônico: meu próprio comentário no código já CITAVA
  essa lição do lab-176 — só não implementei de fato a correção. Corrigido com uma função nova
  `disposePetFigure` (`petFigure.ts`) que remove cada malha filha do `ShadowGenerator`
  (`removeShadowCaster`) antes de descartar a raiz — mesmo espírito de `disposeStudentFigure`,
  reaproveitável por qualquer consumidor futuro de `buildGato`/`buildCachorro` (inclusive um
  cosmético de pet, se um lab futuro precisar reconstruir a figura com frequência). Verificado ao
  vivo, medindo `shadowGenerator.getShadowMap().renderList.length` antes/depois de 3 trocas de pet
  em sequência (gato 5 malhas → gato 5 → cachorro 6 → cachorro 6): a contagem bate EXATAMENTE com o
  pet atual a cada troca, nunca acumula a do anterior.

## Fora de escopo (explicitamente adiado — cada um do tamanho de um lab futuro)

- Cosméticos de pet (roupa, coleira, chapéu, capa, máscara) — pedaço (b) do backlog, precisa do
  preview deste lab como pré-requisito, mas é trabalho novo substancial (catálogo, UI de
  equipar, anexar mesh no `buildGato`/`buildCachorro`, gate de assinatura).
- Catálogo de pets mais rico (mais espécies, modelos mais detalhados, animações) — pedaço (a) do
  backlog. `buildPassarinho` já existe no código pra vida selvagem do mundo, mas nunca foi
  cadastrado como espécie adotável (`PetSpecies`/`PET_CATALOG`) — candidato natural pra um lab
  futuro dedicado a isso.
- Qualquer gate de assinatura/premium em cosmético de pet (não existe cosmético de pet ainda
  neste lab pra gatear).
