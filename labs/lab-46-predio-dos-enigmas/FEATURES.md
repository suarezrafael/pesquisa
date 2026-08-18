# Laboratório 46 — Prédio dos Enigmas (4 andares, escada, quiz surpresa por andar)

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: 8d0a8b9

## Objetivo do laboratório
Pedido do usuário: "crie um prédio de 4 andares em que possa subir via escada e que a câmera
fique com as paredes do prédio quase transparente pra poder a câmera poder ver como subir as
escadas, em cada andar tem um pequeno quiz surpresa." Ajustes adicionais recebidos durante o
laboratório: reposicionar o prédio (estava em cima da rua), diminuir o tamanho das nuvens, e
reduzir a quantidade de rochas do deserto (estavam numerosas e próximas demais).

## Funcionalidades planejadas
- [x] **Prédio novo, "Prédio dos Enigmas"** (`World3D.tsx`) — 4 andares (térreo + 3), cada um com
      paredes/piso próprios, ligados por escadas de DEGRAUS de verdade (não uma rampa lisa como a
      Torre do Tesouro): 9 degraus de 0,2 de altura cada por lance (bem menor que o raio da
      cápsula física do avatar, 0,32, pra ela conseguir subir sozinha empurrada pelo solver de
      física). Eixo x local dedicado ao poço da escada, sempre aberto do térreo ao topo; piso de
      cada andar cobre só o resto da área.
- [x] **Fundação funda** (mesma correção do lab-45) aplicada desde o início — não é um prédio
      novo sofrendo do bug antigo.
- [x] **Quiz surpresa por andar**: 4 perguntas novas (`data/surpriseQuizzes.ts`), um marcador "?"
      flutuante brilhante por andar, gatilho por proximidade (mesmo padrão dos portais das
      escolas). Reaproveita o `QuestModal` existente, mas com um caminho de recompensa PRÓPRIO
      (`handleSurpriseQuizCorrect` em `App.tsx`) — só moedas na hora, não conta pra
      `completedQuestIds`/badges nem aparece na `QuestListOverlay` (é um bônus avulso, não uma
      missão oficial das 21 escolas).
- [x] **Paredes quase transparentes perto do jogador**: `visibility` das paredes interpolada
      (suave, sem "piscar") com base na distância TANGENCIAL do jogador até o eixo vertical do
      prédio (não a distância até a câmera — ver "Decisões técnicas" abaixo, foi a causa de um
      bug real encontrado e corrigido ao vivo nesta sessão).
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo: contagem de malhas (27 degraus, 17 paredes, 4 marcadores, telhado),
      quiz de cada um dos 4 andares disparado e respondido corretamente (moedas confirmadas
      subindo a cada acerto), paredes confirmadas ficando ~0,12 de opacidade perto do jogador e
      voltando a 1 longe, screenshot mostrando a escada visível através da parede quase
      transparente. Checklist de regressão completo: 21 escolas, 39 bichos, torre, 8 lasers do
      parkour, 65 props gerais, 7 props do deserto, 48 rochas de montanha — tudo presente.
- [x] **Reposicionamento** (pedido do usuário, com o prédio em cima da rua): media 1,43 unidade
      até a linha de centro da rua (metade-largura 0,85) — sobrepondo o asfalto. Corrigido pra
      ~3,16 unidades (mesma "longitude"/`theta`, `phi` maior — mais longe do polo, mesmo lado da
      Torre do Tesouro), confirmado ao vivo e visualmente.
- [x] **Nuvens menores** (pedido do usuário) — diâmetro e espaçamento entre tufos reduzidos pra
      ~55% do tamanho original.
- [x] **Menos rochas no deserto** (pedido do usuário: "muito número, uma perto da outra") — de 12
      pra 7 props (4 cactos + 3 rochas), piso mínimo de distância do centro aumentado (0,25 → 0,35)
      pra reduzir aglomeração.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo adiado nesta sessão.
