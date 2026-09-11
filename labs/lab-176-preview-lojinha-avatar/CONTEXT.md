# Contexto — Laboratório 176 — Lojinha com preview de avatar estável

Preenchido em: 2026-09-11
Commit inicial → final: 7e552183693c7645f5eb41e80bca8604f7be3606..HEAD (ver `git log` na branch
`lab-176-preview-lojinha-avatar`)

## O que foi feito

- **Causa raiz identificada por leitura direta do código** (`app/src/world3d/studentFigure.ts`):
  os 4 pontos que trocam uma peça de cosmético (`applyBonecoFeatures`/`applyHat`/`applyGlasses`/
  `applyHairShape`) descartavam a malha antiga com `mesh.dispose()` sem argumentos — isso NUNCA
  libera o material (a menos que `disposeMaterialAndTextures` seja `true`) nem remove a malha da
  `renderList` do `ShadowGenerator` (Babylon nunca faz isso sozinho ao descartar um nó). Três dessas
  quatro funções (`applyBonecoFeatures`/`applyHat`/`applyGlasses`) também criam um `PBRMaterial`
  NOVO a cada chamada, então cada troca de cosmético deixava um material extra e uma referência de
  shadow caster morta acumulando pra sempre na cena — mesma classe de bug já corrigida pra mobília
  de casa no lab-175 (`disposeFurnitureNode`, `World3D.tsx`).
- **Onde isso realmente doía**: o preview PEQUENO da lojinha (`AvatarPreview3D.tsx`) mascarava a
  METADE do bug — reconstrói a figura INTEIRA a cada troca (`figureRef.current?.root.dispose(false,
  true)`, que já limpa MATERIAL recursivamente antes de chamar `applyHat` etc. num boneco
  recém-criado sem nada pra descartar), mas isso nunca tocava o `ShadowGenerator` (achado da 1ª
  rodada do Copilot, ver abaixo — `dispose()` nunca soube nada sobre shadow generators,
  independente dos argumentos). O vazamento de MATERIAL de verdade acontece no AVATAR AO VIVO do
  próprio jogador e de jogadores remotos (`World3D.tsx`, pontes `__setPlayerHat`/
  `__setPlayerGlasses`/`__setPlayerHairShape`/`__setAvatarShirtColor` e a função
  `applyRemoteAppearance`), que trocam só a peça no boneco já em cena, sem reconstruir tudo — cada
  troca real durante uma sessão (inclusive toda vez que o jogador clica um item na lojinha, já que
  a lojinha atualiza o avatar ao vivo por trás do próprio painel) soma o vazamento.
- **Correção**: nova função `disposeMeshGroup(meshes, shadowGenerator, disposeMaterial)` em
  `studentFigure.ts`, reaproveitada pelos 4 pontos — remove cada malha do `shadowGenerator`
  (`removeShadowCaster`) antes de descartar, e descarta o material COMPARTILHADO uma vez só (não
  por malha, já que todas as peças de um grupo, ex. as duas partes do boné, compartilham o MESMO
  `PBRMaterial`). `disposeMaterial=false` só em `applyHairShape`, que reaproveita `figure.hairMat`
  persistente entre chamadas (nunca recriado) — descartá-lo destruiria o material que a PRÓXIMA
  chamada ainda vai usar.
- **Achado adicional durante a investigação** (mesma causa raiz, escopo adjacente): `removeRemotePlayer`
  (`World3D.tsx`) descartava a figura INTEIRA de um jogador remoto que desconecta com
  `rp.figure.root.dispose()` sem argumentos — nem material/textura, nem remoção de NENHUMA malha do
  corpo (torso, cabeça, mochila, membros, chapéu, óculos, cabelo, todos registrados em
  `shadowGenerator`) do `ShadowGenerator`. Cada jogador que entra/sai de uma sessão multiplayer
  vazava o avatar INTEIRO dele pra sempre a partir desse ponto. Corrigido com
  `root.getChildMeshes().forEach(mesh => shadowGenerator.removeShadowCaster(mesh))` antes de
  `root.dispose(false, true)`.
- **Correção inicial** (antes das rodadas de review abaixo): nenhuma mudança em `AvatarShop.tsx`/
  `AvatarPreview3D.tsx` foi necessária — a causa raiz mora inteiramente em `studentFigure.ts`
  (compartilhado por lojinha e mundo 3D) e no ponto de desconexão de jogador remoto em
  `World3D.tsx`. **Isso deixou de valer já na 1ª rodada de review do Copilot** (achado do
  review automático do Copilot no PR #51, 3ª rodada — esta frase tinha ficado desatualizada e não
  foi corrigida a tempo): `AvatarPreview3D.tsx` PASSOU a mudar na 1ª rodada, pra importar e chamar
  `disposeStudentFigure` a cada rebuild do preview (ver achados da 1ª/2ª rodada, seção própria mais
  abaixo). `AvatarShop.tsx` continua intocado do início ao fim deste lab.

## Decisões técnicas tomadas

- **Uma função `disposeMeshGroup` reaproveitada nos 4 pontos**, em vez de repetir a mesma sequência
  4 vezes — evita o padrão observado no lab-175, onde corrigir o mesmo tipo de vazamento em pontos
  separados um por um (mobília) levou várias rodadas de review até cobrir todos; com uma função só,
  um novo eixo de customização que precisar do mesmo padrão no futuro herda a correção de graça.
- **`disposeMaterial` como parâmetro explícito, não inferido** — `applyHairShape` é o único dos 4
  que reaproveita um material persistente (`figure.hairMat`) em vez de criar um novo por chamada
  (decisão de design já documentada no código desde antes deste lab: cor de cabelo não é um eixo de
  customização pedido, só o formato muda). Descartar esse material junto quebraria a PRÓXIMA
  chamada de `applyHairShape`, que ainda espera usá-lo — um parâmetro explícito deixa essa
  diferença visível no call site, em vez de a função "adivinhar" pelo nome do material.
- **Não foi adicionado teste unitário novo** — a correção inteira é disposal de recursos 3D
  (Babylon: materiais, shadow casters), sem nenhuma regra de negócio/domínio isolável pra extrair e
  testar como função pura (mesmo critério já aceito em labs anteriores pra mudanças de cena 3D sem
  lógica de domínio, ex. lab-168/lab-170). Verificação foi ao vivo, num navegador real (ver seção
  abaixo).
- **Não foi encontrado nenhum caso concreto de "duplica"/"herda mesh errada" além do vazamento** —
  15 ciclos completos de troca (30 cliques, boné ↔ nenhum) num navegador real não reproduziram
  nenhum artefato visual, malha duplicada ou travamento perceptível de curto prazo. A hipótese mais
  provável é que o sintoma "trava" reportado pelo usuário é justamente a degradação de performance
  do vazamento se acumulando ao longo de uma sessão de uso real e mais longa (muito mais que 15
  trocas) — não reproduzida aqui por limite de tempo de uma sessão de teste automatizada, mas a
  causa (vazamento ilimitado de material + shadow caster) é real e mensurável independente de
  precisar chegar a "travar" de verdade pra ser um bug.

Primeira rodada do Copilot no PR #51 trouxe 3 achados reais corrigidos:

- **`removeRemotePlayer` com `disposeMaterialAndTextures = true` podia destruir uma textura
  COMPARTILHADA entre jogadores** — `shirtMat`/`pantsMat`/`shoeMat`/`backpackMat` podem apontar
  pra uma `DynamicTexture` cacheada por `Scene` (`getOrCreatePatternTexture`, uma textura por
  `style` reaproveitada por QUALQUER figura que equipe o mesmo item, pra não redesenhar o canvas
  do zero pra cada jogador). Forçar o descarte recursivo de texturas no root inteiro de um jogador
  remoto que desconecta destruiria essa textura mesmo que o jogador LOCAL ou outro remoto ainda a
  estivesse usando — o cache continuaria devolvendo a instância já descartada pra sempre.
  Corrigido soltando a referência (`albedoTexture = null`, sem descartar a textura em si) nos 4
  materiais de roupa ANTES do dispose recursivo — a textura compartilhada sobrevive intacta, só a
  malha/material específicos deste jogador são liberados.
- **O preview da lojinha (`AvatarPreview3D.tsx`) nunca removia as malhas do corpo do
  `ShadowGenerator` do PRÓPRIO preview antes de descartar a figura inteira** — a correção original
  deste lab cobriu os 4 pontos de troca de PEÇA (`disposeMeshGroup`), mas o rebuild completo da
  figura no preview (`root.dispose(false, true)`, roda em TODA troca, mais frequente que qualquer
  troca no avatar ao vivo) nunca foi coberto por isso — `dispose()` nunca soube nada sobre shadow
  generators, com ou sem `disposeMaterialAndTextures`. Corrigido com uma função nova,
  `disposeStudentFigure` (exportada de `studentFigure.ts`), que remove `root.getChildMeshes()` do
  shadow generator antes do dispose recursivo — usada só por `AvatarPreview3D.tsx` (descarte de
  figura INTEIRA, diferente de `disposeMeshGroup`, que descarta um GRUPO de peças numa figura que
  continua viva).
- **`applyBonecoFeatures` criava `bonecoAccentMat` incondicionalmente, mesmo quando nenhuma peça
  ia usá-lo** — uma criatura com `earStyle`/`tailStyle`/`special` todos `'none'` (alcançável de
  verdade: `FALLBACK_BONECO_FEATURES`, usado quando `avatarEmoji` não bate com nenhum avatar do
  catálogo) nunca chama `add()`, então o material era criado e imediatamente órfão — nem atribuído
  a nenhuma malha, nem capturável por `disposeMeshGroup` na PRÓXIMA chamada (que só pega
  `figure.accessories[0]?.material`, vazio nesse caso). Corrigido criando o material sob demanda,
  dentro de `add()`, só quando a primeira peça de verdade precisar dele.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 178/178, inalterado) e `npm run build`
limpos. **Reverificado ao vivo** (novo `npm run dev`, outro perfil de teste real já existente no
ambiente, 200 moedas): 10 trocas de CRIATURA (não só chapéu desta vez) entre avatares com
combinações de feature diferentes (incluindo `Sapo`, `special: 'eyes'`) na aba Avatares — medido
`window.__avatarPreviewScene.materials.length`/`meshes.length` e a render list do
`ShadowGenerator` do PREVIEW (não mais só o da cena principal, que já tinha sido verificado antes)
antes/depois: todos permaneceram EXATAMENTE estáveis (11 materiais, 23 malhas, 22 na render list)
— confirma os achados 2 e 3 desta rodada. O achado 1 (`removeRemotePlayer`) não foi reverificado
ao vivo (mesma pendência já registrada abaixo, exigiria uma segunda sessão simulando desconexão de
jogador remoto).

Segunda rodada do Copilot no PR #51 trouxe 1 achado real corrigido e 1 achado avaliado como
INCORRETO (não implementado, com justificativa):

- **`disposeStudentFigure` (novo nesta mesma rodada anterior) tinha o MESMO risco de textura
  compartilhada já corrigido em `removeRemotePlayer`, só que ainda não replicado aqui** —
  `shirtMat`/`pantsMat`/`shoeMat`/`backpackMat` podem apontar pra uma `DynamicTexture` cacheada
  por `Scene` (`getOrCreatePatternTexture`); como o PREVIEW reconstrói a figura na MESMA cena a
  cada troca (reaproveitando o cache entre as trocas), `root.dispose(false, true)` sem soltar essa
  referência antes destruía a textura e quebrava a PRÓXIMA vez que o mesmo `style` fosse pedido
  NESTA sessão de preview (o cache continuaria devolvendo a instância já descartada). Corrigido
  com o mesmo padrão de `removeRemotePlayer`: `albedoTexture = null` nos 4 materiais antes do
  dispose recursivo.
- **Achado avaliado e NÃO implementado**: o review sugeriu que o cleanup do efeito de montagem em
  `AvatarPreview3D.tsx` (roda quando o componente desmonta — a lojinha é renderizada
  condicionalmente em `App.tsx`, `{showShop && <AvatarShop ... />}`, então fechar a loja desmonta
  `AvatarPreview3D` de verdade) deveria chamar `disposeStudentFigure`/`scene.dispose()`
  explicitamente antes de `engine.dispose()`, alegando que sem isso "reabrir a loja repetidamente
  pode reter a cena, meshes, materiais e recursos WebGL". Verificado na FONTE do Babylon.js
  instalado (`node_modules/@babylonjs/core/Engines/abstractEngine.pure.js`, método `dispose()`):
  `AbstractEngine.dispose()` já contém `while (this.scenes.length) { this.scenes[0].dispose(); }`
  ANTES de liberar o contexto WebGL — ou seja, `engine.dispose()` (já chamado no cleanup) SEMPRE
  dispõe toda cena associada a ele, incluindo todos os meshes/materiais/luzes/shadow generators
  dela, e depois o contexto WebGL inteiro é descartado (invalidando qualquer buffer/textura de
  GPU que sobrasse de qualquer forma). Não há vazamento real nesse ponto — o achado partiu de uma
  premissa incorreta sobre o comportamento de `engine.dispose()`. Documentado aqui em vez de
  simplesmente ignorado, mesmo padrão de transparência já usado neste projeto pra achados
  descartados.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 178/178, inalterado) e `npm run build`
limpos. Sem verificação ao vivo nova — mudança é idêntica em espírito e local à já verificada na
1ª rodada (`removeRemotePlayer`), mesmo padrão de confiança.

**Terceira rodada do Copilot: "Approval recommended"** — 1 achado real de documentação corrigido
(a frase "nenhuma mudança em `AvatarPreview3D.tsx` foi necessária", em "O que foi feito", tinha
ficado desatualizada já na 1ª rodada e não foi corrigida a tempo — `AvatarPreview3D.tsx` passou a
mudar naquela mesma rodada). Nenhuma mudança de código nesta rodada.

## Pendências / dívidas conhecidas

- Não foi possível testar ao vivo o swap de ÓCULOS (as duas opções disponíveis no perfil de teste
  custavam 10 moedas, o perfil só tinha 8) nem de CABELO/CRIATURA repetidamente — confiança nesses
  3 casos vem de os 4 pontos de correção compartilharem exatamente a mesma função
  (`disposeMeshGroup`) já testada ao vivo pra chapéu, não de um teste ao vivo específico pra cada
  um.
- Não foi testado ao vivo o vazamento de `removeRemotePlayer` (exigiria uma segunda sessão/aba
  simulando um jogador remoto entrando e saindo repetidamente, mesma técnica já usada em labs
  anteriores tipo lab-172 — não feito aqui por escopo/tempo) — confiança vem da leitura direta do
  código (mesmo padrão de bug, mesma correção já validada em `disposeFurnitureNode` no lab-175).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos (o item de teste automatizado foi
resolvido pela cláusula de contingência do próprio item: documentar verificação ao vivo em vez de
forçar um teste artificial).

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md` (seção 12,
"Prompt pronto para o Claude executar este backlog"):

1. **Lab 177 — Relevo e montanhas visíveis** (P0): física permite andar sobre montanha invisível,
   mas o visual não renderiza — diagnosticar separação entre mesh visual e colisão física.
2. **Lab 178 — Câmera Roblox-like fácil** (P0): orbit por mouse/touch, zoom, recentralizar,
   sensibilidade padrão, modo mobile com dedo direito pra câmera e esquerdo pra movimento.
3. Considerar o **Lab 185 — Medição de coortes** antes dos labs 179+ se faltar evento pra provar
   os labs seguintes (recomendação do próprio documento).

## Estado do repositório ao final

- Branch: `lab-176-preview-lojinha-avatar`.
- `npx tsc -b`/`npm run test` (app): limpo, 178/178 (inalterado — nenhum teste novo, ver
  "Decisões técnicas tomadas"). `npm run build`: limpo, sem regressão de bundle.
- Nenhuma mudança em `server-accounts`/`server-cf-relay` — lab inteiro é client-side (Babylon/3D).
- **Verificado ao vivo num navegador real** (Chrome via automação, `npm run dev` local, perfil de
  teste já existente no `localStorage` do ambiente): abriu a Lojinha de avatares, trocou entre
  "Nenhum"/"Boné" 15 ciclos completos (30 cliques) na aba Chapéus. Antes de cada rodada, medido
  `window.__scene.materials.length` (cena principal do jogo, não o preview pequeno da lojinha) e o
  tamanho da `renderList` do `ShadowGenerator` do sol via `light.getShadowGenerator().getShadowMap().renderList`:
  ambos permaneceram EXATAMENTE estáveis (604 materiais, só 1 `hatMat-bone`; 1761 na render list;
  2236 malhas na cena) do início ao fim dos 15 ciclos — antes da correção, cada ciclo teria deixado
  pelo menos +1 `PBRMaterial` órfão (`hatMat-bone` duplicado) e +2 referências mortas na render list
  (as duas malhas do boné). Confirmado visualmente por screenshot: o boneco troca de chapéu
  corretamente a cada clique, sem nenhuma peça duplicada, sumida ou malformada. Confirmado também
  que "Chapéu de Festa" (10 moedas, perfil de teste só tinha 8) aparece com o preço, nunca como
  "Em uso" — nenhum item bloqueado aparece como comprado. Nenhum dado de teste precisou ser
  limpo (mudança é só client-side, sem servidor envolvido).
