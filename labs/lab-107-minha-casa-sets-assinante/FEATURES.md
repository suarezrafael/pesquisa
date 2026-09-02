# Laboratório 107 — Minha Casa (sets exclusivos de assinante)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
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
- [x] `app/src/data/furniture.ts`: 6 itens novos `subscriptionOnly: true, cost: 0` — 3 do "Quarto
      Espacial" (cama-nave, luminária-planeta, tapete de estrelas) + 3 do "Jardim Encantado"
      (grama florida, banco de madeira, borboletas animadas).
- [x] `app/src/world3d/MyHousePanel.tsx`: nova prop `entitlementActive`; itens `subscriptionOnly`
      mostram 👑 no nome e, sem assinatura ativa, tag "🔒 Assinantes" em vez de botão de compra
      (mesmo padrão de `AvatarShop.tsx`); com assinatura ativa, mostram "✓ Tem" (usáveis sem
      precisar estar em `unlockedFurnitureIds`, mesma regra dos outros cosméticos de assinante).
- [x] `app/src/App.tsx`: passa `entitlementActive={entitlement?.active ?? false}` pro
      `MyHousePanel` (mesmo valor já usado pro `AvatarShop`).
- [x] Testes novos em `state/progression.test.ts` (bloco "itens exclusivos de assinante nunca são
      obtidos via moeda"): `unlockFurniture` recusa um item de cada set mesmo com moedas de sobra
      (suite total 44/44).
- [x] Verificação ao vivo (dev server + browser automation, `window.__debugTeleport`): sem
      assinatura ativa, os 6 itens aparecem com 👑 e tag "🔒 Assinantes" (confirmado em screenshot,
      sem erro de console); os 5 itens grátis/compráveis continuam mostrando custo normalmente
      (sem regressão do lab-106). O estado "com assinatura ativa" (`entitlementActive: true`) NÃO
      foi simulado ao vivo — exigiria ou um token de entitlement real (infraestrutura de
      pagamento, fora de propósito só pra checar um render condicional) ou adulterar
      `localStorage`/interceptar rede de um jeito que o próprio lab-90 documentou como o tipo de
      atalho que esconde bugs reais. Em vez disso, a verificação se apoiou em paridade de código:
      `MyHousePanel` usa a MESMA expressão `usable = subscriptionOnly ? entitlementActive : ...`
      já em produção há vários laboratórios em `AvatarShop.tsx` pra chapéus/óculos exclusivos —
      risco residual baixo por reuso literal de um padrão já testado, não por suposição nova.
- [x] `npm run build` (typecheck + produção) sem erros.

## Fora de escopo (explicitamente adiado)
- "Modo visita" (ver casa de amigo) — P2 explícito, precisa de revisão de segurança infantil.
- Qualquer representação 3D dos itens exclusivos (mesma decisão do lab-105/106: mobília não tem
  posição/geometria própria ainda, só posse).
