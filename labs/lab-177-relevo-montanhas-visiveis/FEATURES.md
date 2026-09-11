# Laboratório 177 — Relevo e montanhas visíveis

Status: concluído
Início: 2026-09-11
Fim: 2026-09-11
Commit inicial: 2317efb68a8a19525385afddad57b38aab30b341

## Objetivo do laboratório

Fechar de vez o bug "física permite andar sobre montanha invisível" (`docs/growth-retention-monetization-backlog.md`,
seção 7, "Lab 177", prioridade P0) — confirmar se a correção especulativa do lab-151 (nunca
verificada ao vivo) realmente resolveu o planeta principal, e auditar um sistema de colisão
DIFERENTE (planetas secundários) que nunca foi checado por esse mesmo tipo de divergência.

## Investigação prévia (antes de codar)

Levantamento do código real feito antes de escrever este documento (não presumir a partir da
descrição do backlog, que assume uma causa genérica de "malha visual separada da física" — isso
só é verdade em METADE do sistema real):

- **Planeta principal** (`PLATEAU_CENTERS`, `terrainHeight`, `World3D.tsx`): visual e física
  usam o MESMO mesh/vértices (`terrainHeight` desloca os vértices da esfera única do planeta,
  `PhysicsAggregate(planet, PhysicsShapeType.MESH, ...)` colide contra essa MESMA malha) — não há
  separação real entre "o que se vê" e "o que colide" aqui. O bug histórico (labs 95/124/151) é
  puramente de RENDERIZAÇÃO em rampas íngremes (culling de triângulo com winding invertido,
  normal degenerada virando NaN após normalização na GPU) — Havok nunca teve o problema, só o
  material/normal do lado visual. O lab-151 reduziu a altura dos 12 `PLATEAU_CENTERS` de forma
  especulativa (inclinação máxima de ~0,73-0,87 pra ~0,64-0,67) mas **nunca confirmou ao vivo que
  isso resolveu o bug relatado pelo usuário** — o próprio `CONTEXT.md` do lab-151 registra isso
  como pendência aberta.
- **Planetas secundários** (Marte e outros "morros", `buildMarsHill`, `World3D.tsx` ~5262-5297):
  sistema DIFERENTE — cada morro tem uma malha visual PRÓPRIA e um collider esférico embutido
  (`MARS_ROCK_COLLIDER_PROTRUSION`) dimensionado/posicionado de forma INDEPENDENTE dessa malha.
  Esse é um caso real de possível divergência visual/física (collider maior/menor ou deslocado em
  relação ao morro visível) — nunca auditado por nenhum lab anterior.
- Nenhum lab entre 152 e 176 tocou terreno/montanha — o estado é exatamente onde o lab-151 deixou.

## Funcionalidades planejadas

- [x] Reverificar ao vivo, num navegador real, se a redução de altura do lab-151 resolveu o
      artefato de renderização nas rampas mais íngremes do planeta principal (testar
      especificamente o platô com a maior inclinação restante) — se ainda houver falha visual,
      diagnosticar a causa de verdade (inspecionar winding/normal real via `window.__scene`, não
      só reler o código) e corrigir. (referência: docs/growth-retention-monetization-backlog.md,
      Lab 177; labs/lab-151-.../CONTEXT.md, pendência registrada)
- [x] Auditar os colliders de morro dos planetas secundários (`buildMarsHill` e equivalentes de
      outros planetas, se existirem) comparando dimensão/posição do collider contra a malha visual
      — corrigir qualquer divergência real encontrada (collider menor deixando o jogador afundar
      visualmente, ou maior deixando-o flutuar/andar no "ar" antes de tocar o morro visível).
      (referência: achado da investigação prévia acima, nunca auditado antes)
- [x] Screenshot de verificação (desktop e, se possível, viewport mobile) entra no `CONTEXT.md`
      deste lab — critério de aceite explícito do backlog. (achado real da 1ª rodada do review
      automático do Copilot no PR #52: a primeira versão deste `CONTEXT.md` afirmava ter feito
      screenshots sem incluir/linkar nenhuma imagem de verdade — corrigido, arquivo real em
      `labs/lab-177-relevo-montanhas-visiveis/evidencias/planeta-principal-plato-11.jpg`, só
      desktop — viewport mobile não testado nesta sessão)
- [ ] **Pendente — não concluído** (achado real da 4ª/5ª rodada do review automático do Copilot
      no PR #52): confirmar visualmente, num viewport/dispositivo mobile real, que a qualidade
      `isLowEndDevice` continua mostrando leitura mínima do relevo — critério de aceite explícito
      do backlog ("mobile low quality ainda mostra leitura mínima do relevo"). A leitura do código
      (`isLowEndDevice` só reduz contagem de props/rochas decorativas e tamanho de shadow map,
      nunca desliga a malha de terreno nem o `PhysicsAggregate`) dá confiança razoável, mas não é
      o mesmo que confirmar visualmente. `isLowEndDevice` é detectado só por regex de
      `navigator.userAgent` (`World3D.tsx` ~2326) — as ferramentas de automação de navegador
      disponíveis nesta sessão (`mcp__claude-in-chrome__*`) não expõem override de user agent nem
      emulação de dispositivo (só redimensionam a janela, o que não muda `navigator.userAgent`),
      então essa verificação específica não foi possível de fazer de forma válida aqui — fica como
      pendência real pro próximo lab/sessão com acesso a um dispositivo/emulador de verdade.

## Fora de escopo (explicitamente adiado)

- Redesenhar todo o terreno, adicionar bioma novo, trocar engine de física/renderização
  (docs/growth-retention-monetization-backlog.md, Lab 177, "Fora de escopo").
- Labs seguintes do mesmo backlog (178 — câmera Roblox-like; 179+ — planetas interativos etc.).
- Qualquer ajuste de gameplay/conteúdo educativo — este lab é só qualidade visual/física de
  terreno.
