# Laboratório 24 — Chapéus (customização avançada)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 2e0e2f6dd40a1ab99dd09bfde710d5b396b98fa2

## Objetivo do laboratório
Segunda metade da resposta do usuário à pergunta feita no lab-23 ("mais conteúdo/customização"):
a primeira opção sugerida (nova região do planeta) virou o bioma de deserto; esta é a segunda
("mais customização de avatar"). Hoje a lojinha (lab-08/13) só deixa trocar entre **presets**
inteiros de criatura (raposa, gato, etc., cada um com cor+peças fixas) — não existe nenhuma
customização independente da escolha de criatura. Chapéus são um novo eixo de personalização
que se aplica em cima de qualquer criatura escolhida, sem mexer no sistema de presets existente.

## Funcionalidades planejadas
- [x] `src/data/hats.ts` (novo, mesmo padrão de `avatars.ts`) — catálogo de ~5 chapéus (boné,
      chapéu de festa, coroa, flor, laço), cada um com `shape` (descreve a geometria 3D, montada
      em `World3D.tsx`) + custo em moedas.
- [x] `Progress.unlockedHatIds: string[]` e `Profile.equippedHatId: string | null` (`types.ts`) —
      mesmo padrão de `unlockedAvatarIds`/`avatarEmoji`, eixo independente (trocar de criatura não
      mexe no chapéu equipado, e vice-versa).
- [x] `unlockHat`/`equipHat` (`progression.ts`/`useProgress.ts`/`useProfile.ts`) — mesmo padrão de
      `unlockAvatar`/`equipAvatar`.
- [x] Geometria 3D dos chapéus (`applyHat()`, `World3D.tsx`) — primitivas simples parentadas em
      `figure.root` acima da cabeça (mesmo padrão de `applyBonecoFeatures`, offset absoluto, não
      aninhado na malha da cabeça), com hook `__setPlayerHat` pra trocar sem reconstruir a cena
      (mesmo padrão de `__setAvatarShirtColor`).
- [x] Seção de chapéus na lojinha (`AvatarShop.tsx`) — mesma UI de comprar/equipar já usada pros
      avatares, título/seção separada.
- [x] Verificação: `npm run build` passa; testado ao vivo via cliques reais na loja — comprado e
      equipado um chapéu, confirmado por dados da cena (contagem/nomes de malha) que ele foi
      criado, e confirmado que continua equipado (mesmas malhas) depois de trocar de criatura.
      Validação visual por screenshot não foi concluída (ver `CONTEXT.md`, pendências).

## Fora de escopo (explicitamente adiado)
- Sincronizar chapéu equipado pros outros jogadores no multiplayer local (exigiria estender
  `RemoteState`/`sendState` de novo, igual ao lab-20 fez pra xp/coins) — cosmético só pro próprio
  jogador nesta primeira versão, não quebra nada existente.
- Chapéu no professor/lojista/NPCs pedestres — são personagens fixos/decorativos, não o avatar do
  jogador; fora do propósito de "customização do MEU personagem".
- Customização de cor independente por peça (não só chapéu) — chapéus são o primeiro eixo
  independente; mais eixos (cor de camisa à parte da criatura, por exemplo) ficam pro próximo lab
  de customização, se o usuário pedir mais.
