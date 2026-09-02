# Laboratório 106 — Minha Casa (mobília comprável com moeda)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 5c29e45b69e1e06a3332bd37c55abcf8458d4b15

## Objetivo do laboratório
Continuação direta do lab-105 ("O que o próximo laboratório deve desenvolver"): trocar o
placeholder de mobília do `MyHousePanel` ("chega em um próximo laboratório") por compra de verdade
com moeda — mesmo eixo de colecionável já usado pra chapéus/óculos/cores (`unlockGeneric`,
`docs/plano-comercial-backend.md`). Os 2 conjuntos exclusivos de assinante ("Quarto Espacial",
"Jardim Encantado") continuam fora de escopo — dependem deste eixo existir primeiro.

## Investigado antes de planejar
- `labs/lab-105-minha-casa-plot-base/CONTEXT.md`, seção "O que o próximo laboratório deve
  desenvolver": já apontava esta exata tarefa como o passo natural seguinte, incluindo a pergunta
  em aberto de como representar itens comprados sem uma cena 3D navegável pra "colocar" — resolvida
  aqui mostrando cada item como possuído (✓ Tem) ou comprável (🪙 custo) na lista do próprio painel,
  sem posicionamento (mesma lógica do resto do jogo: cosmético = "ligado/desligado", nunca
  posição livre).
- `app/src/data/glasses.ts` + `app/src/state/progression.ts` (`unlockGlasses`/`unlockGeneric`):
  padrão exato de catálogo `{id, name, emoji, cost, subscriptionOnly?}` + função de desbloqueio
  genérica (rejeita `subscriptionOnly`, item já possuído, ou moeda insuficiente) — reaproveitado
  literalmente pra mobília, sem inventar uma regra de compra nova.
- `app/src/world3d/AvatarShop.tsx` (seção de chapéus/óculos): padrão visual de grade de compra
  (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/`.avatar-shop-action`) — reaproveitado
  dentro do `MyHousePanel` sem CSS novo, só sem o conceito de "equipar" (mobília não é uma peça do
  boneco).
- `app/src/state/storage.ts` (`emptyProgress`, `loadProgress`): confirmado que `loadProgress` faz
  merge (`{...emptyProgress, ...saved}`), então progresso salvo antes deste laboratório recebe
  `unlockedFurnitureIds: []` automaticamente, sem precisar de migração.

## Funcionalidades planejadas
- [x] `app/src/data/furniture.ts` (novo): `FurnitureOption`/`FURNITURE_CATALOG` — 5 itens (Cama,
      Mesa e cadeira, Tapete, Planta, Luminária), custo 6-20 moedas (mesma faixa de preço do resto
      do jogo), campo `subscriptionOnly?` já previsto pro laboratório dos conjuntos exclusivos.
- [x] `types.ts`: `Progress.unlockedFurnitureIds: string[]`.
- [x] `state/storage.ts`: `emptyProgress.unlockedFurnitureIds: []` (casa começa vazia, nada grátis).
- [x] `state/progression.ts`: `unlockFurniture` via `unlockGeneric` (mesmo padrão de
      `unlockGlasses`).
- [x] `state/useProgress.ts`: wrapper `unlockFurniture` (mesmo formato dos outros `unlockXxx`).
- [x] `world3d/MyHousePanel.tsx`: lista de compra de verdade substituindo o placeholder do lab-105
      — reaproveita `.avatar-shop-*`, botão desabilitado sem moeda suficiente, tag "✓ Tem" pro que
      já foi comprado.
- [x] `App.tsx`: `unlockFurniture` do `useProgress()` passado pro `MyHousePanel`.
- [x] Testes novos em `state/progression.test.ts` (3): compra normal desconta moeda, recusa sem
      moeda suficiente, não desbloqueia/desconta duas vezes o mesmo item.
- [x] Verificação: `npm run test` (suite completa) e `npm run build` (typecheck + produção) sem
      erros.

## Fora de escopo (explicitamente adiado)
- Os dois conjuntos temáticos exclusivos de assinante ("Quarto Espacial" 🚀, "Jardim Encantado" 🌷)
  — próximo laboratório desta frente, usa o campo `subscriptionOnly` já previsto no catálogo.
- Qualquer representação 3D/visual da mobília comprada (a casa continua sendo só uma fachada sólida
  por fora, sem interior navegável — decisão tomada no lab-105).
- "Modo visita" — mesma razão do lab-105 (P2 explícito, precisa de revisão de segurança infantil).
