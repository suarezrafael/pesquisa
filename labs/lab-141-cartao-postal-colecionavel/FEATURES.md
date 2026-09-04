# Laboratório 141 — Cartão-postal colecionável

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: fb0b9b87c4bfc35c2ea72958c26d1120d6a19910

## Objetivo do laboratório

Item do "backlog de engajamento" discutido em chat (mesma lista de onde saiu o login diário,
lab-138) — nunca escolhido antes. Escolhido de forma autônoma nesta sessão: verificação ao vivo do
lab-140 seguia bloqueada (aba de automação sem foco do sistema operacional) e não havia pedido novo
do usuário no momento, então este item conhecido do backlog foi puxado em vez de ficar ocioso.

## Funcionalidades planejadas
- [x] `Progress.collectedPostcardIds` novo + `data/postcards.ts` (catálogo, um cartão temático por
  planeta-destino: Marte/Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno).
- [x] `applyPostcardCollected` (`progression.ts`) — concedido automaticamente na primeira chegada
  de verdade a cada planeta (`landRocket`, `World3D.tsx`), idempotente, sem moeda/XP (pura coleção,
  mesmo espírito de `badges`).
- [x] Aviso transitório ("📮 Novo cartão-postal: ...!") ao chegar num planeta pela primeira vez.
- [x] Galeria de cartões dentro do `AchievementsPanel.tsx` já existente (nova seção abaixo dos
  emblemas, sem ícone novo no HUD) — cartão ainda não coletado mostra "???"/"Ainda não visitado"
  em vez do nome/descrição verdadeiros (efeito de álbum de figurinhas).

## Fora de escopo (explicitamente adiado)
- Cartão-postal do planeta principal (não é um "destino" viajado de foguete, sempre foi a base).
- Compartilhar/exportar o cartão fora do jogo.
