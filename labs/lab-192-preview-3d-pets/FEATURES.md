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

- [ ] Extrair `buildGato`/`buildCachorro` de `World3D.tsx` pra um módulo novo
  `world3d/petFigure.ts` (mesmo espírito de `studentFigure.ts`), exportadas — `World3D.tsx` passa
  a importar de lá em vez de definir localmente. Comportamento do pet no MUNDO principal não pode
  mudar (mesma função, só de lugar diferente).
- [ ] Novo componente `PetPreview3D.tsx` (mesmo padrão de `AvatarPreview3D.tsx`: motor/cena/câmera
  próprios, `ArcRotateCamera` com giro automático, sem física, canvas pequeno) — mostra o pet
  EQUIPADO (`progress.equippedPetId`), usando `petVisualScale(stage, species)` (já existe,
  `progression.ts`) pra bater com o tamanho real do pet no mundo.
- [ ] `PetPanel.tsx`: preview novo no topo do painel (mesmo lugar/espírito do preview do
  `AvatarShop.tsx`) — estado "nenhum pet equipado" quando `equippedPetId` é `null` (placeholder
  claro, não um preview vazio/quebrado).
- [ ] Verificação ao vivo (Chrome real): abrir o painel de pets com um pet equipado, confirmar o
  preview bate com o pet visto no mundo (mesma espécie/cor/escala); trocar de pet equipado
  atualiza o preview instantaneamente; sem pet equipado mostra o placeholder, não quebra.
- [ ] Confirmar ao vivo que a extração de `buildGato`/`buildCachorro` não mudou nada no
  comportamento do pet no MUNDO principal (aparência, escala, sombra) — regressão zero esperada,
  já que é só mover a função de lugar.
- [ ] Confirmar que o preview não vaza material/textura/shadow-caster ao trocar de pet repetidas
  vezes (mesma medição já feita pro preview de avatar no lab-176 — contagem de materiais antes/
  depois de vários ciclos).

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
