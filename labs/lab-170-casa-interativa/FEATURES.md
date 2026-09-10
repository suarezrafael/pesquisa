# Laboratório 170 — casa interativa (deitar, excluir móvel, setas corrigidas)

Status: concluído
Início: 2026-09-09
Fim: 2026-09-09
Commit inicial: ff06b63b432696783ee124246cac5e5059802ea9

## Objetivo do laboratório

Pedido do usuário, feito em um único turno com 3 itens: "os objetos da casa tem que ter como
interagir, por exemplo ao se aproximar na cama tem que ter como deitar, tem que ter como excluir
objetos da casa tbm, hoje so tem como colocar mais um, mas nao achei como excluir um objeto da
casa. e parece que a coordenadas das setas para mover esao invertidas... outros objetos tem que
ser interativos, pela tecla E." Confirmado com o usuário via `AskUserQuestion`: tudo num lab só,
excluir móvel NÃO devolve moeda.

## Funcionalidades planejadas

- [x] **Bug: setas de posicionamento de mobília invertidas** (`World3D.tsx`, modo de
      posicionamento) — `y` (cima/baixo) já nasce com o mesmo sinal do "throttle" do avatar a pé
      (`throttle = -y`, pra cima anda pra frente); o código da peça fantasma aplicava `y` DIRETO
      em `position.z`, sem negar, empurrando "pra cima" pra -Z (fundo/porta) em vez de +Z
      (frente). Corrigido negando `y` antes de aplicar, mesma convenção do avatar.
- [x] **Excluir mobília** (`removeFurniture`, `progression.ts` + `MyHousePanel.tsx`) — remove uma
      cópia comprada, SEM devolver moeda (decisão confirmada com o usuário). Confirmação de dois
      cliques (mesmo padrão de "Remover amigo", lab-160). Reindexação de `housePlacements`
      preservando a posição de cada cópia que continua existindo.
- [x] **Deitar na cama** (`World3D.tsx`, tecla E) — reparenta a figura na própria cama, pose
      deitada (rotação 90°), congela o corpo físico; E de novo levanta.
- [x] **Interatividade genérica pra outros objetos** (tecla E) — balão com emoji+nome do item
      (`FURNITURE_CATALOG`) acima da cabeça do jogador; cobre qualquer item do catálogo, presente
      ou futuro, sem código novo por peça.

## Fora de escopo (explicitamente adiado)

- Pose/animação única por tipo de móvel (sentar no banco com pose própria, girar globo de verdade,
  etc.) — a reação genérica (balão) cobre "interativo via E" sem precisar de uma animação nova por
  item; caso o usuário queira poses específicas depois, vira pedido novo.
