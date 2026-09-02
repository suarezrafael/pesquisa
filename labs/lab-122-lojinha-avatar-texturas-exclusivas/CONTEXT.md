# Contexto — Laboratório 122 — Lojinha de avatar: itens exclusivos com textura/estilo real

Preenchido em: 2026-08-29
Commit inicial → final: 77508ab1e0697c52a7ff0faf152a8bc55d02095a..HEAD

## O que foi feito

Pedido direto do usuário no chat: itens exclusivos de assinante na lojinha (calça/sapato/mochila/
camisa) precisavam de "textura, estilos, mais cores... mais moda" em vez de só uma cor sólida
diferente dos itens grátis.

- `app/src/data/customization.ts`: novo tipo `ClothingStyle` (`'starry' | 'nebula' | 'holographic'
  | 'prism' | 'neon-glow' | 'metallic-gold'`) + campo opcional `style?` em `ColorOption`. Os 8 itens
  `subscriptionOnly` dos 4 catálogos ganharam um estilo: Calça Estelar/Mochila Estelar → `starry`;
  Calça Galáctica → `nebula`; Camisa Holográfica → `holographic`; Camisa Prisma → `prism`; Tênis
  Neon → `neon-glow`; Tênis Dourado/Mochila Dourada → `metallic-gold`. Todo item grátis/comprável
  com moeda continua sem `style` (visual idêntico a antes).
- `app/src/world3d/studentFigure.ts`: nova função exportada `applyClothingLook(mat, opt, scene,
  fallbackColor, baseRoughness)` — único lugar que decide o que um `style` faz com o material.
  `metallic-gold` ajusta `metallic`/`roughness` da própria PBR (sem textura). Os outros 5 estilos
  usam `DynamicTexture` (mesma técnica já usada pras faixas de Júpiter/Saturno/Urano/Netuno):
  `starry` desenha estrelinhas brancas num fundo azul-marinho escuro; os outros 4 desenham faixas
  horizontais com paletas fixas por estilo (`STRIPE_PALETTES`). `holographic`/`neon-glow` também
  ganham um leve `emissiveColor` pra reforçar o brilho. Textura cacheada por `Scene` (chave =
  `style`) em `(scene as any).__clothingPatternCache` — gerada uma vez, reutilizada por toda figura
  (NPCs da lojinha, jogadores remotos) que equipa o mesmo item.
- **13 pontos de chamada** substituídos pelo `mat.albedoColor = new Color3(...)` cru por
  `applyClothingLook`: 9 em `app/src/world3d/World3D.tsx` (montagem inicial do boneco local, 4
  pontes de recolorir ao vivo — `__setPlayerShirtColor`/`PantsColor`/`ShoeColor`/`BackpackColor` —
  e 4 sub-checagens de sincronização de jogador remoto) e **4 em
  `app/src/world3d/AvatarPreview3D.tsx`** (o preview 3D dentro da própria lojinha).

## Decisões técnicas tomadas

- **Paletas fixas por estilo, não derivadas de `colorRgb`** — o objetivo era um visual desenhado
  pro item (estrela, nebulosa, holográfico, prisma, neon), não uma variação automática da cor
  sólida de fallback.
- **`applyClothingLook` sempre reseta `albedoTexture`/`metallic`/`roughness`/`emissiveColor` antes
  de aplicar o estilo do item atual** — necessário porque o MESMO objeto `PBRMaterial` é reusado
  quando o jogador troca de item ao vivo (trocar de um item `metallic-gold` de volta pra um item
  sólido, por exemplo); sem o reset, a peça continuaria brilhando por engano. Verificado ao vivo
  (ver abaixo).
- **Achado que ampliou o escopo depois de já ter implementado a função central**: a primeira
  verificação ao vivo (equipando itens direto no boneco do MUNDO via bridge de debug) funcionou
  perfeitamente, mas a lojinha continuava mostrando cor sólida — o preview 3D (`AvatarPreview3D.tsx`)
  tem sua PRÓPRIA cópia da mesma lógica antiga (`figure.pantsMat.albedoColor = new Color3(...)`),
  nunca lida na investigação inicial (que só tinha aberto `World3D.tsx`). Corrigido trazendo os
  mesmos 4 pontos pra `applyClothingLook`. Sem essa segunda verificação ao vivo — não bastava
  confiar só na leitura teórica do primeiro arquivo — esse gap real (a lojinha, o lugar mais
  importante pro usuário VER o item antes de "comprar", continuaria quebrada) teria passado.
- **`backpackFlapMat` (aba decorativa da mochila) NÃO foi estendida pra suportar estilo** — é
  definida uma única vez na construção (`backpackFlapMat.albedoColor = backpackMat.albedoColor.
  scale(0.75)`), nunca atualizada em recolorir ao vivo (bug pré-existente, não introduzido por este
  laboratório — nenhuma ponte/sincronização toca nela). Considerado fora de escopo: é um acessório
  de 2cm, não a peça em si, e ampliar mais o já-grande raio de mudança deste laboratório (13 pontos)
  não parecia proporcional.

## Pendências / dívidas conhecidas

- `backpackFlapMat` não reflete recolorir ao vivo (nem antes, nem depois deste laboratório) — ver
  decisão acima. Se algum dia a mochila ganhar mais destaque visual, vale revisitar.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

O pedido do usuário nesta mesma mensagem de chat tinha uma SEGUNDA parte, bem maior: a casa
("Minha Casa", lab-105-107) devia virar um mapa interno 3D andável de verdade — apertar E na porta
pra entrar numa cena separada com catálogo de móveis (incluindo itens de temática educacional) e
apertar E na porta de saída pra voltar ao planetinha. Isso é uma mudança arquitetural bem maior
(nunca existiu "interior andável" neste jogo — todo prédio hoje é fachada + painel 2D por gatilho
de proximidade) e fica para um ou mais laboratórios seguintes, não coberta aqui. Também no backlog
(sem prioridade única, perguntar ao usuário antes de escolher): (1) o bug de morros/platôs
invisíveis do lab-95, ainda sem resposta do usuário sobre aparelho/GPU; (2) code-splitting real do
chunk `studentFigure` (3,68MB) — uma investigação em paralelo durante este laboratório (não
formalizada como lab próprio) confirmou a causa raiz com dados reais: o `package.json` do
`@babylonjs/core` marca todo `**/index.js` como tendo efeitos colaterais, então importar o barril
`@babylonjs/core` (feito em `World3D.tsx`, `AvatarPreview3D.tsx` E `studentFigure.ts`) força o
bundler a incluir XR/FrameGraph/etc. inteiros por não conseguir provar que são seguros de descartar.
Testado ao vivo: trocar só os imports de `studentFigure.ts` pra caminhos individuais (mesma técnica
do lab-117) teve efeito ZERO no tamanho do chunk (os outros dois arquivos ainda importam o barril
e forçam o mesmo grafo inteiro pro mesmo chunk) — a correção de verdade exigiria converter os TRÊS
arquivos de uma vez (~50 símbolos ao todo), um refactor bem maior e mais arriscado que o de 2
símbolos do lab-117, tocando o arquivo central de renderização 3D. Fica como candidato a laboratório
próprio, não decidido ainda se vale o risco/esforço frente ao ganho.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 47/47 passando (sem teste novo — mudança de aparência/render, sem
  lógica de domínio nova testável em isolamento; `ClothingStyle`/`style` em si são só dado).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation, perfil de teste "Teste Missoes" já
  existente, descartável): confirmado via inspeção direta de material (`pantsMat.albedoTexture`,
  `.metallic`, `.emissiveColor`) que cada um dos 6 estilos aplica exatamente o que devia (textura
  cacheada e REUTILIZADA entre calça/mochila quando os dois usam `starry` — mesmo objeto de
  textura, confirmado por nome); confirmado que voltar de um item exclusivo pra um item sólido
  reseta textura/metálico/emissivo corretamente; confirmado VISUALMENTE no avatar em jogo (não só
  em dado) que a calça estelar mostra estrelinhas brancas visíveis e a camisa prisma mostra listras
  coloridas; sem erro de console durante toda a verificação.
- Como verificar de novo: `cd app && npm run dev`, abrir a lojinha (👤 "Loja de avatares" no HUD),
  ir na aba "Roupas", e olhar o preview 3D ao equipar qualquer um dos 8 itens com 👑 (requer
  assinatura ativa pra equipar de verdade pela UI — sem isso, testar via
  `window.__scene.__setPlayerPantsColor('calca_estelar')` etc. no console, e inspecionar
  `window.__playerFigure.pantsMat`).
