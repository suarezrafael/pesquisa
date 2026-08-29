# Contexto — Laboratório 106 — Minha Casa (mobília comprável com moeda)

Preenchido em: 2026-08-29
Commit inicial → final: 5c29e45b69e1e06a3332bd37c55abcf8458d4b15..HEAD

## O que foi feito
Continuação direta do lab-105 — trocou o placeholder de mobília do `MyHousePanel` por compra de
verdade com moeda, mesmo eixo de colecionável já usado em chapéus/óculos/cores.

- **`app/src/data/furniture.ts`** (novo): `FurnitureOption`/`FURNITURE_CATALOG` — 5 itens (Cama 20,
  Mesa e cadeira 15, Tapete 8, Planta 6, Luminária 10 moedas), campo `subscriptionOnly?` já
  presente no tipo (não usado ainda por nenhum item — reservado pro laboratório dos 2 conjuntos
  exclusivos de assinante).
- **`app/src/types.ts`**: `Progress.unlockedFurnitureIds: string[]`.
- **`app/src/state/storage.ts`**: `emptyProgress.unlockedFurnitureIds: []` — a casa começa vazia
  (diferente dos outros eixos, que sempre têm uma opção padrão grátis).
- **`app/src/state/progression.ts`**: `unlockFurniture(progress, id)` via `unlockGeneric`
  (idêntico a `unlockGlasses`, sem lógica nova).
- **`app/src/state/useProgress.ts`**: wrapper `unlockFurniture` (mesmo formato dos outros
  `unlockXxx`).
- **`app/src/world3d/MyHousePanel.tsx`**: painel reescrito — lista de compra de verdade
  (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/`.avatar-shop-action`, mesmas
  classes CSS de `AvatarShop.tsx`, zero CSS novo), botão de compra desabilitado sem moeda
  suficiente, tag "✓ Tem" pro que já foi comprado. Recebe `progress`/`onUnlockFurniture` como
  props novas.
- **`app/src/App.tsx`**: `unlockFurniture` do `useProgress()` passado pro `MyHousePanel`.
- **`app/src/state/progression.test.ts`**: 3 testes novos (compra normal desconta moeda, recusa
  sem moeda suficiente, não desbloqueia/desconta duas vezes o mesmo item) — suite total 42.

## Decisões técnicas tomadas
- **Reaproveitar `unlockGeneric` sem nenhuma variação** — mobília segue exatamente a mesma regra
  de compra de todo outro cosmético (rejeita item já possuído, rejeita moeda insuficiente, rejeita
  `subscriptionOnly` mesmo com moeda de sobra). Não havia motivo pra uma regra diferente, e
  divergir aqui só aumentaria a superfície de bug sem ganho.
- **Sem conceito de "equipar"** — ao contrário de chapéu/óculos/roupa, mobília não é uma peça do
  boneco; cada item é só possuído ou não (tag "✓ Tem"), sem estado de "em uso"/`equippedXxxId`.
  Isso também evita a pergunta em aberto desde o lab-105 ("como representar mobília sem cena 3D
  navegável") — a resposta é simplesmente não representar posição nenhuma, só posse.
- **Preços na mesma faixa dos outros catálogos** (6-20 moedas, chapéus/óculos ficam em 8-20) —
  mantém a economia do jogo coerente, sem precisar de rebalanceamento em outro lugar.

## Pendências / dívidas conhecidas
- Nenhuma nova — reaproveita 100% de infraestrutura já testada (`unlockGeneric`, classes CSS de
  `AvatarShop`).
- **Nota de verificação ao vivo**: a verificação usou o perfil local real "DudaDuda" (porta 5174,
  `localStorage` da própria máquina de desenvolvimento) — os `coins` desse perfil foram sobrescritos
  pra 100 pra testar a compra sem precisar completar missões de novo, e a compra de "Cama" ficou
  gravada de verdade (`unlockedFurnitureIds: ["cama"]`, coins final 80). O valor ORIGINAL de moedas
  desse perfil não foi anotado antes da sobrescrita — não dá pra restaurar automaticamente. Impacto
  é mínimo (só um número de save local de teste, nada em produção/banco/Stripe), mas fica registrado
  aqui por transparência — se for um perfil que importa, o usuário pode limpar
  `localStorage['jogo-educativo:progress']` naquela origem (`localhost:5174`) pra recomeçar do zero.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório — todas as 8 (catálogo, tipo, storage, domínio,
  hook, painel, wiring, testes) concluídas e verificadas (`npm run test`: 42/42; `npm run build`:
  typecheck + produção sem erros; compra ao vivo confirmada no navegador).

## O que o próximo laboratório deve desenvolver
- **Os dois conjuntos temáticos exclusivos de assinante** ("Quarto Espacial" 🚀: cama-nave, luminária
  planeta, tapete estelar; "Jardim Encantado" 🌷: grama florida, banco de madeira, borboletas
  animadas — `docs/plano-comercial-backend.md`) — usa o campo `subscriptionOnly` já previsto em
  `FurnitureOption`, mesmo padrão de `entitlementActive` já usado em `AvatarShop.tsx` pra
  chapéus/óculos exclusivos.
- Bug de morros invisíveis (lab-95) continua em aberto, esperando resposta do usuário.
- Secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` continuam pendentes (lab-104,
  ação do usuário).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 42 testes, incluindo os 3 novos de `unlockFurniture`.
  - `cd app && npm run build` — typecheck + build de produção, confirmado passando sem erros.
  - `cd app && npm run dev`, abrir o jogo, `window.__debugTeleport(-0.35, 1, 0.12)` (dev-only) pra
    abrir "Minha Casa" na hora — cada item mostra custo em moeda ou "✓ Tem"; comprar desconta moeda
    e persiste em `localStorage['jogo-educativo:progress'].unlockedFurnitureIds`.
