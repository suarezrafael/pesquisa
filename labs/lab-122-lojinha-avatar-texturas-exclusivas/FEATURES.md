# Laboratório 122 — Lojinha de avatar: itens exclusivos com textura/estilo real

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 77508ab1e0697c52a7ff0faf152a8bc55d02095a

## Objetivo do laboratório

Pedido direto do usuário no chat: *"na lojinha de avatar tem que ter os itens exclusivos [ter]
uma qualidade maior pro avatar, por exemplo as roupas/calças precisam ter textura, terem estilos
mais cores em vez de ser só uma cor sólida, mais moda."*

## Investigado antes de planejar

- `app/src/data/customization.ts` tem 4 catálogos (`PANTS_COLOR_CATALOG`, `SHOE_COLOR_CATALOG`,
  `BACKPACK_COLOR_CATALOG`, `SHIRT_COLOR_CATALOG`), cada um com 2 itens `subscriptionOnly: true`
  (8 no total). **Confirmado o problema relatado**: todo item, exclusivo ou não, usa a mesma
  interface `ColorOption` com só `colorRgb` — os itens exclusivos ("Calça Estelar", "Calça
  Galáctica", "Tênis Neon", "Tênis Dourado", "Mochila Dourada", "Mochila Estelar", "Camisa
  Holográfica", "Camisa Prisma") têm NOMES chamativos mas são, visualmente, só mais uma cor sólida
  igual aos itens grátis — nenhuma diferença de textura/padrão/brilho apesar do nome sugerir isso.
- `app/src/world3d/studentFigure.ts` (`buildStudentFigure`) só atribui `xMat.albedoColor` pra
  camisa/calça/sapato/mochila — nunca `albedoTexture`/`metallic`/`emissiveColor` pra essas peças.
- **Técnica já estabelecida neste projeto pra textura procedural**: `DynamicTexture` (canvas 2D,
  desenha, `.update()`, atribui a `PBRMaterial.albedoTexture`) — já usada pras faixas de
  Júpiter/Saturno/Urano/Netuno (`World3D.tsx`, ~linhas 4825-5124). `metallic`/`emissiveColor` de
  `PBRMaterial` também já usados (foguete, armas, olhos de robô) pra efeito metálico/brilhante.
  Nenhuma capacidade nova precisa ser adicionada — só aplicar técnicas já usadas em outro contexto
  às roupas.
- **Achado que aumenta o escopo real**: a cor de calça/sapato/mochila/camisa não é setada só na
  construção inicial do boneco — existem **13 pontos** que fazem
  `xMat.albedoColor = new Color3(...opt.colorRgb)` direto: 9 em `World3D.tsx` (montagem inicial (2),
  4 pontes de recolorir ao vivo — `__setPlayerShirtColor`/`PantsColor`/`ShoeColor`/`BackpackColor`,
  chamadas quando o próprio jogador troca de cosmético na lojinha — e 4 sub-checagens de
  sincronização de jogador remoto, um por eixo) **e mais 4 em `AvatarPreview3D.tsx`** — o preview
  3D DENTRO da própria lojinha (achado só depois de já ter implementado a função central e ir
  verificar ao vivo: a lojinha continuava mostrando cor sólida porque o preview usa seu próprio
  componente, com sua própria cópia da mesma lógica, nunca lida na primeira leitura de
  `World3D.tsx`). Qualquer lógica de estilo/textura precisa ficar centralizada numa função só, não
  copiada nos 13 lugares — incluindo o arquivo do preview, não só o mundo 3D.

## Decisões técnicas tomadas

- **`ColorOption` (customization.ts, dado puro, sem import de engine) ganha campo opcional
  `style?: ClothingStyle`** — união de strings (`'solid' | 'starry' | 'nebula' | 'holographic' |
  'prism' | 'neon-glow' | 'metallic-gold'`), mesmo padrão já usado por `HairShape`. Todo item
  grátis/comprável com moeda continua sem `style` (undefined = comportamento atual, cor sólida,
  ZERO mudança visual pra quem já tem esses itens). Só os 8 itens `subscriptionOnly` ganham um
  estilo não-`solid`.
- **Mapeamento de estilo por item**: Calça Estelar/Mochila Estelar → `starry` (fundo escuro +
  pontinhos claros, mesmo gerador reutilizado pras duas); Calça Galáctica → `nebula` (gradiente
  roxo/rosa/azul); Camisa Holográfica → `holographic` (gradiente iridescente + leve emissivo);
  Camisa Prisma → `prism` (faixas diagonais multicoloridas); Tênis Neon → `neon-glow` (gradiente
  vibrante + emissivo forte); Tênis Dourado/Mochila Dourada → `metallic-gold` (sem textura — só
  `metallic`/`roughness` da própria PBR, brilho metálico de verdade).
- **Função nova centralizada `applyClothingLook(mat, opt, scene, fallbackColor)` em
  `studentFigure.ts`** (módulo já acoplado à engine, local certo pra isso) — usada nos 9 pontos de
  `World3D.tsx` no lugar do `mat.albedoColor = new Color3(...)` cru. Único lugar que decide o que
  cada `style` faz com o material.
- **Cache de textura por `Scene`** (`(scene as any).__clothingPatternCache`, mesmo padrão de ponte
  já usado pra `__setAvatarShirtColor` etc.) — evita gerar a mesma textura de canvas repetidamente
  pra cada figura (NPCs da lojinha, jogadores remotos) que equipa o mesmo item exclusivo; a textura
  é criada uma vez por `style` por cena e reutilizada.
- **`metallic-gold` não usa `DynamicTexture`** — é um caminho de renderização genuinamente
  diferente (`metallic`/`roughness` da PBR, sem textura nenhuma), não uma variação do mesmo
  mecanismo dos outros 5 estilos.
- **Sem mudança em `unlockGeneric`/entitlement/preço** — é só uma camada de aparência em cima de
  dado que já existe; nenhuma regra de negócio muda.

## Funcionalidades planejadas

- [x] `customization.ts`: `ClothingStyle` novo + campo `style?` em `ColorOption`; atribuir o estilo
      certo aos 8 itens `subscriptionOnly` dos 4 catálogos.
- [x] `studentFigure.ts`: `applyClothingLook` + geradores de textura (`starry`/`nebula`/
      `holographic`/`prism`/`neon-glow`) com cache por `Scene`; ramo `metallic-gold` via PBR pura.
- [x] `World3D.tsx` (9 pontos) e `AvatarPreview3D.tsx` (4 pontos): trocar todo
      `mat.albedoColor = new Color3(...)` pra calça/sapato/mochila/camisa por chamadas a
      `applyClothingLook`.
- [x] Verificação: `npm run build` sem erros; verificação ao vivo (dev server + browser automation)
      equipando pelo menos 2 catálogos diferentes (ex.: calça + camisa) confirmando visualmente a
      textura/brilho novo, e confirmando que um item GRÁTIS/comprável com moeda continua com cor
      sólida idêntica a antes (sem regressão).

## Fora de escopo (explicitamente adiado)

- Sincronização multiplayer do visual novo entre duas abas reais — mesma limitação já registrada em
  labs anteriores (lab-92: câmera/ambiente de automação não permite abrir 2 sessões reais
  facilmente); confiança vem de paridade de código entre os 9 pontos, todos usando a mesma função
  nova.
- Novos itens/eixos de customização (isso é sobre MELHORAR os 8 que já existem, não adicionar mais).
- O segundo pedido do usuário nesta mesma mensagem (casa com interior 3D andável) — feature bem
  maior e arquiteturalmente diferente (nova área navegável, transição de porta, mobília como objeto
  3D real em vez de painel 2D); vira laboratório(s) separado(s) depois deste.
