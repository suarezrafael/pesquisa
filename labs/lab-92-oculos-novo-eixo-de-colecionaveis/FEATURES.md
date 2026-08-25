# Laboratório 92 — óculos: novo eixo de colecionáveis (free + assinatura)

Status: em andamento
Início: 2026-08-25
Fim: -
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
- [ ] **`app/src/data/glasses.ts`** (novo): `GlassesOption`/`GlassesShape` (`'sunglasses' | 'vr'`),
  mesma estrutura de `HatOption`. Catálogo inicial: 2 itens compráveis com moeda (free) + 2
  exclusivos de assinante — pelo menos um óculos de sol (free) e a versão de RV (assinatura),
  como já estava no plano original.
- [ ] **`types.ts`**: `Profile.equippedGlassesId: string | null`, `Progress.unlockedGlassesIds:
  string[]`.
- [ ] **`state/storage.ts`**: default `equippedGlassesId: null` no `loadProfile`, `emptyProgress.
  unlockedGlassesIds: []`.
- [ ] **`state/progression.ts`** / **`state/useProgress.ts`**: `unlockGlasses` reaproveitando
  `unlockGeneric` (mesma regra dos outros eixos: nunca libera item `subscriptionOnly` de graça).
- [ ] **`state/useProfile.ts`**: `equipGlasses(id: string | null)`.
- [ ] **`world3d/studentFigure.ts`**: `applyGlasses(figure, glasses, scene, shadowGenerator)` —
  duas peças novas de geometria simples (lentes de sol + ponte; visor de RV + tira), na altura dos
  olhos (`HEAD_Y + 0.13`, mesma referência do acessório `eyes` já existente), reaproveitando o
  padrão de `applyHat`/`applyHairShape` (descarta+remonta).
- [ ] **`world3d/World3D.tsx`**: aplicar óculos no boneco local na montagem inicial, novo
  `__setPlayerGlasses` + `useEffect` observando `profile.equippedGlassesId` (mesmo padrão do
  chapéu), incluir `glassesId` no `appearanceKey`/`sendState` do jogador local, e no protocolo de
  jogador remoto (`RemotePlayer.lastGlassesId`, `applyRemoteAppearance`).
- [ ] **`world3d/multiplayer.ts`**: `RemoteState.glassesId`, `sendState(...)` ganha o campo no
  objeto de aparência.
- [ ] **`world3d/AvatarPreview3D.tsx`**: prop `glassesId`, aplicado no preview 3D da lojinha.
- [ ] **`world3d/AvatarShop.tsx`**: nova aba "Óculos" (mesmo padrão visual da aba "Chapéus", com
  opção "Nenhum"), passa `glassesId` pro preview.
- [ ] **`App.tsx`**: conecta `equipGlasses`/`unlockGlasses` do estado até `AvatarShop`.
- [ ] **`state/progression.test.ts`**: teste de regressão espelhando o de `unlockHat` — recusa
  óculos `subscriptionOnly` mesmo com moedas suficientes.
- [ ] **Testar ao vivo**: equipar/desequipar os dois óculos free e confirmar visual no preview 3D
  e no boneco em cena; confirmar que os itens de assinante aparecem bloqueados sem assinatura
  ativa; confirmar que outro jogador conectado vê os óculos equipados (mesmo teste de
  visibilidade multiplayer já usado pro chapéu no lab-73).
- [ ] **Deploy em produção** (só frontend, sem mudança de backend/relay — o relay já repassa
  qualquer campo extra em `state` sem precisar de mudança, confirmado lendo o handler do lab-89).

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
