# Laboratório 92 — óculos: novo eixo de colecionáveis (free + assinatura)

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: 7ca02c5410b4c5a49d3925b8d3a3a2a72dd86798

## Objetivo do laboratório
Continuação do pedido do usuário registrado em `labs/CURRENT.md`: "mais itens colecionáveis (free
+ assinatura)", item 2 do pedido maior dividido em labs a partir do lab-91.

Achado ao investigar antes de escrever qualquer código: `docs/plano-comercial-backend.md`, seção
"Catálogo de cosméticos (Fase E)", já especifica exatamente esse pedido — a maior parte da lista
original já foi construída ao longo dos labs 78-87 (criaturas novas, chapéus com variante de
assinante cobrindo todos os formatos, cores de roupa/mochila), mas **"Óculos" (eixo de
customização novo, mesmo padrão do chapéu — independente, `equippedGlassesId`)** nunca foi
implementado. Esse é o item mais bem-grounded pra "mais colecionáveis" pedido agora: já estava
planejado, seu design já foi decidido (Óculos de Sol 😎, Óculos de Realidade Virtual 🥽), e cabe
inteiro numa iteração (um eixo de customização a mais, seguindo o MESMO padrão já estabelecido por
chapéu/cor-de-roupa/cabelo — nenhuma abstração nova, só mais uma instância do padrão existente).

## Funcionalidades planejadas
- [x] **`app/src/data/glasses.ts`** (novo): `GlassesOption`/`GlassesShape` (`'sunglasses' | 'vr'`),
  mesma estrutura de `HatOption`. Catálogo: Óculos de Sol 😎 e Óculos Colorido 🕶️ (10 moedas cada,
  formato `sunglasses`), Óculos de Realidade Virtual 🥽 (formato `vr`) e Óculos Holográfico ✨
  (formato `sunglasses`, cor roxa) como exclusivos de assinante.
- [x] **`types.ts`**: `Profile.equippedGlassesId: string | null`, `Progress.unlockedGlassesIds:
  string[]`.
- [x] **`state/storage.ts`**: default `equippedGlassesId: null` no `loadProfile`, `emptyProgress.
  unlockedGlassesIds: DEFAULT_UNLOCKED_GLASSES_IDS` (sempre `[]` — nenhum óculos vem pré-liberado,
  "Nenhum" já é grátis por padrão).
- [x] **`state/progression.ts`** / **`state/useProgress.ts`**: `unlockGlasses` reaproveitando
  `unlockGeneric` (mesma regra dos outros eixos).
- [x] **`state/useProfile.ts`**: `equipGlasses(id: string | null)`.
- [x] **`world3d/studentFigure.ts`**: `applyGlasses(figure, glasses, scene, shadowGenerator)` —
  duas lentes + ponte (sunglasses) ou visor + tira (vr), na altura dos olhos (`EYE_Y = 1.28`,
  mesma referência do acessório `eyes` já existente).
- [x] **`world3d/World3D.tsx`**: óculos aplicado no boneco local na montagem inicial,
  `__setPlayerGlasses` + `useEffect` observando `profile.equippedGlassesId`, `glassesId` no
  `appearanceKey`/`sendState` do jogador local, e no protocolo de jogador remoto
  (`RemotePlayer.lastGlassesId`, `applyRemoteAppearance`) — confirmado por grep que os 7 pontos de
  espelhamento do chapéu (`hatId`) têm todos o equivalente em óculos.
- [x] **`world3d/multiplayer.ts`**: `RemoteState.glassesId`, `sendState(...)` ganhou o campo.
- [x] **`world3d/AvatarPreview3D.tsx`**: prop `glassesId`, aplicado no preview 3D da lojinha.
- [x] **`world3d/AvatarShop.tsx`**: nova aba "Óculos" (mesmo padrão visual da aba "Chapéus", com
  opção "Nenhum"), passa `glassesId` pro preview.
- [x] **`App.tsx`**: conecta `equipGlasses`/`unlockGlasses` do estado até `AvatarShop`.
- [x] **`state/progression.test.ts`**: 2 testes novos — recusa `oculos_rv` (subscriptionOnly)
  mesmo com moedas, e compra normal de `oculos_sol` desconta o custo certo. Suíte total: 36 testes.
- [x] **Testado ao vivo** contra o dev server: comprado "Óculos de Sol" (500→490 moedas),
  equipado e confirmado — não só visualmente, mas inspecionando `window.__playerFigure.
  glassesMeshes` direto no console — exatamente 3 malhas (2 lentes + ponte) na posição/cor
  esperadas; desequipado ("Nenhum") e confirmado `glassesMeshes.length === 0`; confirmado que
  "Óculos de Realidade Virtual"/"Óculos Holográfico" aparecem como `🔒 Assinantes`, sem botão
  clicável, idêntico ao comportamento já existente pros outros eixos exclusivos. Visibilidade
  multiplayer (outro jogador vendo os óculos equipados) **não foi testada ao vivo com duas abas**
  — verificada só por leitura/paridade de código com o mecanismo do chapéu (já comprovado
  funcionando desde o lab-73) e pelo tipo `RemoteState.glassesId` obrigatório barrando em tempo de
  compilação qualquer chamada de `sendState` que esqueça o campo; registrado como pendência de
  verificação, mesmo padrão já usado no projeto pra outros efeitos visuais (ver lab-73 CONTEXT.md).
- [x] **Deploy em produção** via `npx vercel --prod --yes` (3ª tentativa, mesmo padrão
  intermitente de "fetch failed"). Sem mudança no relay — confirmado que o handler de `state`
  (lab-89) repassa qualquer campo extra automaticamente (`{...msg, ...}`).

## Fora de escopo (explicitamente adiado — resto do backlog de Fase E)
- **Chapéus com formato novo** (Chapéu de Mago 🧙, Fone de Ouvido Gamer 🎧, Chifres de Dragão 🐉)
  — precisam de geometria 3D nova (`HatShape` ganhar valores novos), diferente do óculos que
  reaproveita o padrão de "forma nova, mas pequena e simples" pela primeira vez neste laboratório.
  Avaliar como próximo passo depois de óculos validar o padrão.
- **Roupas com padrão/emissive** (camisa com gradiente, calça com padrão de estrela, tênis com
  efeito "led" pulsante) — precisa de um campo novo (`pattern`/`emissive`) no lugar de `colorRgb`
  puro, mudança de material mais profunda que uma forma geométrica nova.
- **Mochila voadora** (hélice/asas animadas) — precisa de animação, não só geometria estática.
- Itens 3 e 4 do pedido maior do usuário (centro de estudo/carteira + catálogo de conquistas,
  brinde do chefe de Marte) — continuam nos próprios laboratórios, sem mudança.
