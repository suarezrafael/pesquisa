# Laboratório 176 — Lojinha com preview de avatar estável

Status: concluído
Início: 2026-09-11
Fim: 2026-09-11
Commit inicial: 7e552183693c7645f5eb41e80bca8604f7be3606

## Objetivo do laboratório

Corrigir o preview 3D da lojinha (`AvatarShop.tsx` + `AvatarPreview3D.tsx`) para que trocar boné,
óculos, cabelo, cor de roupa ou qualquer outro cosmético repetidamente nunca duplique, esconda,
herde mesh errada ou trave o boneco — hoje cada troca acumula vazamento de recurso (ver achado
abaixo), o que corrói a confiança da criança na customização e a credibilidade da assinatura
cosmética pro responsável.

## Funcionalidades planejadas

- [x] Corrigir vazamento de material/textura: `applyHat`/`applyGlasses`/`applyHairShape`/
      `applyBonecoFeatures` (`studentFigure.ts`, 4 pontos de `mesh.dispose()` sem
      `disposeMaterialAndTextures = true`) descartam a malha antiga mas nunca o `PBRMaterial`
      criado pra ela — cada `new PBRMaterial('hatMat-${hat.id}', scene)` novo (linha ~486) fica
      registrado em `scene.materials` pra sempre. Mesma classe de bug já corrigida em
      `World3D.tsx`/`disposeFurnitureNode` no lab-175 (referência: `labs/lab-175-casa-visitavel/CONTEXT.md`,
      10ª rodada do Copilot). (referência: docs/growth-retention-monetization-backlog.md, Lab 176)
- [x] Corrigir vazamento de shadow caster: os mesmos 4 pontos chamam `shadowGenerator.addShadowCaster(mesh)`
      ao montar a peça, mas nunca `removeShadowCaster` antes de descartar — a `renderList` do
      `ShadowGenerator` (tanto o da lojinha, `AvatarPreview3D.tsx`, quanto o do avatar ao vivo no
      mundo, se as mesmas funções forem usadas lá) acumula referências a malhas já destruídas a
      cada troca. Mesma classe de bug do lab-175 (`disposeFurnitureNode`). (referência:
      docs/growth-retention-monetization-backlog.md, Lab 176)
- [x] **Achado adicional investigando o item acima**: `removeRemotePlayer` (`World3D.tsx`, ~linha
      9016) descarta a figura INTEIRA de um jogador remoto que desconecta com `rp.figure.root.dispose()`
      sem argumentos — nem material/textura, nem remoção dos meshes do corpo inteiro (torso, cabeça,
      mochila, membros, todos registrados em `shadowGenerator` por `buildStudentFigure`) do
      `ShadowGenerator`. Cada jogador que entra/sai de uma sessão multiplayer vaza o avatar inteiro
      dele pra sempre a partir desse ponto — mesma causa raiz do achado acima, escopo adjacente
      (equipar cosmético vs. desconectar jogador), corrigir junto por ser a mesma classe de bug no
      mesmo arquivo/subsistema.
- [x] Investigar e corrigir qualquer caso concreto de "herda mesh errada"/"duplica"/"trava" além do
      vazamento acima — reproduzir trocando bone/chapéu/óculos/cabelo repetidamente (10+ vezes,
      critério de aceite do backlog) e comparar contra o comportamento esperado; casos reais viram
      correções específicas, não suposição. (referência: docs/growth-retention-monetization-backlog.md,
      Lab 176)
- [x] Adicionar teste/regressão para troca sequencial de cosméticos (mesmo padrão de teste de
      domínio puro já usado no projeto — extrair a lógica testável se fizer sentido; se a correção
      for só de disposal 3D, documentar verificação manual ao vivo em vez de forçar um teste
      artificial, mesmo critério já usado em labs anteriores pra mudanças de cena 3D sem lógica de
      domínio isolável). (referência: docs/growth-retention-monetization-backlog.md, Lab 176)
- [x] Revisar limpeza de meshes/materiais/estado visual nos 4 pontos de disposal listados acima,
      garantindo que nenhum item bloqueado (sem entitlement) apareça como comprado no preview, e
      que o preview nunca altera `progress` antes de confirmar compra/equipar (comportamento já
      esperado, só confirmar que continua valendo). (referência:
      docs/growth-retention-monetization-backlog.md, Lab 176)

## Fora de escopo (explicitamente adiado)

- Novos cosméticos, catálogo premium novo, checkout ou preço (docs/growth-retention-monetization-backlog.md,
  Lab 176, "Fora de escopo").
- Qualquer mudança em Stripe, entitlement ou assinatura.
- Labs seguintes do mesmo backlog (177 — relevo/montanhas visíveis; 178 — câmera Roblox-like) —
  cada um é seu próprio laboratório, na ordem recomendada pelo documento.
