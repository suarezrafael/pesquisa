# Laboratório 155 — Pets adotáveis (Grupo A do backlog social, lab-154)

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: fcfe898a0ba589ef931f1a932fbf54b343945768

## Objetivo do laboratório

Primeiro item do Grupo A do backlog social planejado no lab-154 (item de maior alavancagem de
engajamento encontrado na pesquisa de mercado desta sessão — o core loop do Adopt Me!). Adotar um
pet com moeda, ele segue o jogador pelo mundo, cresce em estágios (filhote → jovem → adulto)
conforme é alimentado.

## Funcionalidades planejadas

- [x] `data/pets.ts`: catálogo de 4 pets (2 gatos, 2 cachorros — reaproveita `buildGato`/
      `buildCachorro`, já existentes, sem geometria nova).
- [x] `types.ts`/`storage.ts`: `unlockedPetIds`/`equippedPetId`/`petCareCounts`/`lastPetFeedAt` em
      `Progress`, defaults em `emptyProgress`.
- [x] `state/progression.ts`: `adoptPet` (reaproveita `unlockGeneric`), `equipPet`, `feedPet`
      (limite de uma vez por dia real, mesma defesa anti-farm de `applyDailyLoginReward`),
      `petStageFor`/`petStageScale` (filhote/jovem/adulto por número de alimentações). Testado
      (`progression.test.ts`, 17 casos novos).
- [x] `state/useProgress.ts`: `adoptPet`/`equipPet`/`feedPet` wrappers, mesmo formato de
      `unlockFurniture`/`claimDailyLogin`.
- [x] `world3d/PetPanel.tsx`: catálogo comprável, reaproveitando a mesma grade/CSS de
      `MyHousePanel.tsx`/`AvatarShop.tsx` — mostra estágio atual, botão "Alimentar" (desabilitado
      se já alimentado hoje).
- [x] `HudHeader.tsx`/`App.tsx`: ícone 🐾 novo no HUD abre o painel.
- [x] `World3D.tsx`: pet ativo é construído na cena 3D e segue o jogador com atraso (`petUp`
      perseguindo o `localUp` do jogador a cada quadro), escondido dentro de casa/em veículo,
      escalado pelo estágio de crescimento. Ponte `__refreshPet` reconstrói a malha quando
      adotar/trocar/alimentar muda algo relevante, sem precisar sair/voltar do jogo.
- [x] `npx tsc -b` / `npm run test` sem erros (124/124, 17 novos).
- [x] Verificação ao vivo: adotar desconta moeda e mostra "✓ Ativo"; alimentar mostra "Já
      alimentado hoje" (desabilitado) até o dia seguinte; posição/escala do pet confirmadas
      diretamente no motor (não só visual) — segue perto do avatar, escala muda de 0.55 (filhote)
      pra 0.8 (jovem) exatamente no limiar de 3 alimentações.

## Fora de escopo (explicitamente adiado)

- Múltiplos pets seguindo ao mesmo tempo — só o `equippedPetId` ativo segue, mesmo padrão de
  chapéu/óculos (um equipado por vez, pode possuir vários).
- Aviso/toast quando o pet muda de estágio — o painel já mostra o estágio atualizado ao reabrir,
  suficiente pro v1; toast dedicado fica pra depois se o usuário pedir.
- Pet dentro de casa / em veículos — a sala é plana (sem conceito de `up` esférico) e o pet fica
  escondido nesses casos, reaparecendo do lado de fora.
