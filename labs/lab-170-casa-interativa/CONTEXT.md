# Contexto — Laboratório 170 — casa interativa (deitar, excluir móvel, setas corrigidas)

Preenchido em: 2026-09-09
Commit inicial → final: ff06b63b432696783ee124246cac5e5059802ea9..dc0166f (PR #44, mergeado)

## O que foi feito

Pedido do usuário com 3 itens num turno só (bug de setas invertidas, excluir móvel, casa
interativa) — confirmado via `AskUserQuestion` fazer tudo num lab só, e que excluir NUNCA devolve
moeda.

- **Setas invertidas (bug)** — `y` (eixo cima/baixo do teclado/joystick) já tem o mesmo sinal
  usado pro "throttle" do avatar a pé (`const throttle = Math.max(-1, Math.min(1, -y))`, seta pra
  cima = `y=-1` = anda pra frente). O código do modo de posicionamento de mobília aplicava `y`
  DIRETO em `ghost.position.z`, sem negar — seta pra cima empurrava a peça pra -Z (fundo da sala,
  lado da porta), o oposto de "frente". Corrigido negando `y` (`ghost.position.z - y * speed *
  dt`), mesma convenção já usada pelo avatar.
- **Excluir mobília** — `removeFurniture(progress, key)` novo (`progression.ts`): remove UMA
  cópia (`key` = `${itemId}#${índice}`), sem devolver moeda. Só item comum é excluível — nunca
  `subscriptionOnly` (nada a devolver) nem `planetReward` (conquista permanente, sem como
  reconquistar o planeta só pra recuperar o item apagado por engano). Reindexação de
  `housePlacements`: a cópia excluída some, toda cópia de índice MAIOR desliza uma posição pra
  baixo, preservando a posição de cada cópia que sobra. `MyHousePanel.tsx` ganhou um botão
  "🗑️ Excluir" por cópia, com confirmação de dois cliques (mesmo padrão de "Remover amigo",
  `FriendsPanel.tsx`, lab-160).
- **Bug real achado ao implementar exclusão**: `refreshHouseFurnitureVisuals` (`World3D.tsx`) só
  sabia "construir o que falta" (pensado pra quantidade CRESCENDO, comprar mais uma sempre no
  fim) — com quantidade DIMINUINDO (exclusão do meio), a peça 3D que sobrava na cena não era
  necessariamente a peça certa (ficava a excluída, sumia a que devia continuar). Corrigido
  rastreando a última quantidade conhecida por item; ao detectar quantidade MENOR, descarta TODAS
  as cópias antigas daquele item antes de reconstruir do zero a partir de `housePlacements` (já
  reindexado corretamente) — caminho raro (só ao excluir), sem custo extra pra comprar/mover.
- **Deitar na cama** — `restingInBedKey` novo (mesma categoria de `drivingCar`/`drivingRocket`:
  trava o loop de física inteiro do avatar, só sai por tecla `E`, nunca por distância).
  `lieDownOnBed`/`getUpFromBed` reparentam a figura visual na própria cama, com uma pose deitada
  (`Quaternion.RotationAxis(Vector3.Right(), -Math.PI/2)`, pernas/braços retos) — mesmo mecanismo
  de reparentar+pose já usado ao entrar num carro, só que horizontal em vez de sentado.
- **Interatividade genérica de mobília** — `nearestFurniturePiece()` acha a peça mais próxima
  (raio `FURNITURE_INTERACT_DISTANCE = 1.1`) dentro de casa; se for uma cama, deita; qualquer
  outro tipo mostra um balão (`furnitureReactionLabel`, novo — primeiro balão ligado à PRÓPRIA
  cabeça do jogador local, os existentes só valiam pra jogadores remotos/NPCs) com
  `${emoji} ${nome}` do item, direto do `FURNITURE_CATALOG` — cobre qualquer item, presente ou
  futuro, sem precisar de mensagem única por peça.
- **Bug real achado testando ao vivo**: `nearestFurniturePiece()` comparava `piece.position`
  (LOCAL — a peça é filha de `houseInteriorRootNode`, deslocado por `HOUSE_INTERIOR_CENTER`)
  contra `avatarMesh.position` (sempre MUNDO) — a "distância" calculada dava um valor gigante (do
  tamanho do próprio deslocamento da sala), nunca menor que `FURNITURE_INTERACT_DISTANCE`, e a
  interação nunca disparava (silenciosamente — sem erro nenhum). Corrigido trocando por
  `piece.getAbsolutePosition()`.

## Decisões técnicas tomadas

- **Nunca devolve moeda ao excluir** (confirmado com o usuário) — evita comprar-e-excluir
  repetidas vezes só pra girar moeda.
- **`subscriptionOnly`/`planetReward` nunca excluíveis** — mesma lista já usada por `canBuyMore`
  em `MyHousePanel.tsx` (`!item.subscriptionOnly && !item.planetReward`), reaproveitada como
  `canRemove`.
- **Reação genérica (balão) em vez de pose única por tipo de móvel** — o catálogo tem quase 20
  itens e cresce a cada novo planeta (lab-130-like); uma pose/animação nova por item seria
  trabalho recorrente sem fim. Reaproveitar `${emoji} ${nome}` do próprio catálogo cobre item
  novo automaticamente, sem tocar em código de interação de novo.
- **`restingInBedKey` trava o loop de física inteiro** (mesma categoria de `drivingCar`/
  `drivingRocket`), diferente de `sittingAtDesk` (lab-93, só trava o RECÁLCULO DE POSE, não a
  posição/gravidade) — a saída da carteira depende de o jogador se afastar fisicamente (posição
  real precisa continuar atualizando); a saída da cama é só por tecla `E`, então travar tudo é
  seguro e mais simples (mesmo raciocínio de carro/foguete).

## Pendências / dívidas conhecidas

Nenhuma nova. PR #44 teve 2 achados reais do Copilot corrigidos antes do merge:
- **`removeFurniture` podia propagar chaves `${id}#NaN`** em `housePlacements` — uma entrada
  legada/corrompida sem sufixo `#<índice>` numérico virava `NaN` na reindexação e era regravada
  como lixo. Descartada em vez de preservada (já era inútil, nenhum código lê `${id}#NaN`).
- **`key={i}` (índice) na lista de cópias** (`MyHousePanel.tsx`) — podia fazer o React reaproveitar
  a linha errada do DOM depois de excluir uma cópia do meio (reindexação muda o que cada índice
  representa). Trocado pela mesma string estável (`${item.id}#${i}`) já usada como identidade da
  cópia em todo o resto do arquivo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

Nenhum item já sequenciado por este laboratório. Se o usuário quiser poses/animações únicas por
tipo de móvel (sentar no banco de verdade, girar o globo, etc.) em vez do balão genérico, isso
vira um pedido novo, escopo maior (uma pose por tipo, não reaproveitável).

## Estado do repositório ao final

- Branch: `lab-170-casa-interativa` (mergeada e apagada). **Confirma deploy em produção**: PR
  #44 mergeado (2 achados reais do Copilot corrigidos), CI/CD verde nos 3 workers, deploy
  automático confirmado (`GET /health` 200, app respondendo 200 no Vercel).
- `npx tsc -b`: limpo. `npm run test` (app): 151/151 (5 novos — `removeFurniture`: remove sem
  reembolso, reindexação preserva posição das cópias restantes, recusa item
  subscriptionOnly/planetReward, recusa índice fora do intervalo, recusa item inexistente).
  `npm run build`: limpo, sem regressão de bundle.
- **Verificado ao vivo via Chrome real** (automação, perfil de teste local): comprados 3 "Planta"
  em posições distintas (-2,-2)/(0,-2)/(2,-2) + 1 "Cama"; excluída a cópia do MEIO (#2, posição
  (0,-2)) pelo painel real (dois cliques, "Confirmar exclusão?") — confirmado por inspeção direta
  da cena 3D que as duas plantas restantes ficaram EXATAMENTE nas posições certas
  ((-2,-2)/(2,-2)), sem reembolso de moeda (500 antes e depois). Deitar na cama: `E` perto da cama
  reparentou a figura nela com a pose deitada (rotação horizontal confirmada por quaternion),
  screenshot confirmando visualmente o personagem deitado com a cabeça perto da cabeceira; `E` de
  novo devolveu a postura de pé (desparentado, quaternion identidade). Reação genérica: `E` perto
  de uma planta confirmado mostrando o texto exato "🪴 Planta" no balão da própria cabeça do
  jogador. Setas de posicionamento: simulado `ArrowUp` mantido por vários quadros durante o modo
  de posicionamento — `z` da peça foi de -2 pra -0,845 (andou em direção a +Z, "pra frente"),
  confirmando a inversão corrigida.
