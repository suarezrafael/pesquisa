# Laboratório 107 — Minha Casa (sets exclusivos de assinante)

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: 415311896b1d0d582976a5d3ea09e5bd1d9d8605

## Objetivo do laboratório
Fechar a última peça de "Minha Casa" planejada em `docs/plano-comercial-backend.md`: os dois sets
temáticos exclusivos de assinante — "Quarto Espacial" 🚀 e "Jardim Encantado" 🌷. Regra inegociável
do plano comercial continua valendo: só ESSES sets ficam atrás do entitlement, nunca a casa em si
nem a mobília básica (já grátis/comprável desde o lab-105/106).

## Investigado antes de planejar
- `docs/plano-comercial-backend.md` (linhas 180-182): especifica os dois sets item a item —
  "Quarto Espacial" (cama-nave, luminária-planeta, tapete de estrelas) e "Jardim Encantado" (grama
  florida, banco de madeira, borboletas animadas).
- `app/src/data/glasses.ts`/`hats.ts`: padrão exato já usado pra cosmético exclusivo de assinante —
  `subscriptionOnly: true`, `cost: 0`, incluído no MESMO catálogo dos itens compráveis (não uma
  lista separada). `unlockGeneric` (`progression.ts`) já rejeita compra com moeda de qualquer item
  `subscriptionOnly` — nenhuma mudança de domínio necessária, só adicionar os itens ao catálogo.
- `app/src/world3d/AvatarShop.tsx`: padrão visual — `usable = subscriptionOnly ? entitlementActive
  : unlockedIds.includes(id)`, tag "🔒 Assinantes" (`subscription-lock`) quando bloqueado, coroa 👑
  ao lado do nome. `MyHousePanel.tsx` (lab-106) ainda não recebe `entitlementActive` — precisa
  ganhar essa prop, mesmo padrão de `AvatarShop`.
- Confirmado: `FurnitureOption.subscriptionOnly?` já existe no tipo desde o lab-106 (reservado
  exatamente pra este laboratório) — não precisa mudar o shape do catálogo, só popular.

## Funcionalidades planejadas
- [ ] `app/src/data/furniture.ts`: 6 itens novos `subscriptionOnly: true, cost: 0` — 3 do "Quarto
      Espacial" (cama-nave, luminária-planeta, tapete de estrelas) + 3 do "Jardim Encantado"
      (grama florida, banco de madeira, borboletas animadas).
- [ ] `app/src/world3d/MyHousePanel.tsx`: nova prop `entitlementActive`; itens `subscriptionOnly`
      mostram 👑 no nome e, sem assinatura ativa, tag "🔒 Assinantes" em vez de botão de compra
      (mesmo padrão de `AvatarShop.tsx`); com assinatura ativa, mostram "✓ Tem" (usáveis sem
      precisar estar em `unlockedFurnitureIds`, mesma regra dos outros cosméticos de assinante).
- [ ] `app/src/App.tsx`: passa `entitlementActive={entitlement?.active ?? false}` pro
      `MyHousePanel` (mesmo valor já usado pro `AvatarShop`).
- [ ] Testes novos em `state/progression.test.ts` (bloco "itens exclusivos de assinante nunca são
      obtidos via moeda"): `unlockFurniture` recusa um item do novo lote mesmo com moedas de sobra.
- [ ] Verificação ao vivo (dev server + browser automation): sem assinatura ativa, os 6 itens
      aparecem bloqueados (🔒); simulando `entitlementActive: true` (ou entitlement real de teste
      se aplicável), os 6 aparecem usáveis sem custar moeda.

## Fora de escopo (explicitamente adiado)
- "Modo visita" (ver casa de amigo) — P2 explícito, precisa de revisão de segurança infantil.
- Qualquer representação 3D dos itens exclusivos (mesma decisão do lab-105/106: mobília não tem
  posição/geometria própria ainda, só posse).
