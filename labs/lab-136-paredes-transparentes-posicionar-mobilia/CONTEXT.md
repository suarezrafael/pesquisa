# Contexto — Laboratório 136 — Paredes transparentes por oclusão de câmera + posicionamento manual de mobília

Preenchido em: 2026-08-31
Commit inicial → final: 2a1164cc9d2eec2611dba9ad735afd82de9bcfeb..HEAD

## O que foi feito

Ver `FEATURES.md` pra investigação/implementação completas. Resumo: os dois itens que o lab-135
deixou explicitamente "fora de escopo" (features novas, não bugs pontuais), confirmados pelo
usuário como realmente desejados na sequência da mesma conversa.

1. **Paredes transparentes por oclusão de câmera**: cada parede da sala ganhou material próprio
   (antes as 4 compartilhavam uma instância); a cada quadro, a posição da câmera é comparada contra
   os limites locais da sala em cada eixo (checagem geométrica direta, não raycast, já que a sala é
   uma caixa ortogonal) — a parede do lado errado desvanece com lerp suave, as outras voltam ao
   normal.
2. **Posicionamento manual de mobília**: novo campo `Progress.housePlacements`, novo botão "Mover"
   no `MyHousePanel`, novo modo dentro da cena 3D que reaproveita o input de movimento/rotação de
   câmera já existente pra mover/girar uma peça "fantasma", com Confirmar/Cancelar (React DOM,
   não Babylon GUI) persistindo via o mesmo padrão `unlockXxx` de `useProgress.ts`.

## Decisões técnicas tomadas

**Checagem geométrica direta em vez de raycast pra oclusão de parede**: a sala é uma caixa com
paredes ortogonais alinhadas aos eixos locais de `interiorRoot` — comparar a coordenada local da
câmera contra `±HOUSE_ROOM_HALF_SIZE` em cada eixo já diz exatamente qual parede foi atravessada,
sem o custo/complexidade de um raycast físico a cada quadro. Só funciona porque a sala é uma caixa
simples; se um dia o formato do interior mudar (cômodos não-retangulares), essa checagem precisaria
virar raycast de verdade.

**Reaproveitar o eixo de movimento e os botões de câmera pro modo de posicionamento, em vez de
controles novos**: o jogador já sabe usar WASD/joystick e ◀ ▶; inventar um esquema de controle
diferente só pra este modo (ex.: arrastar com o mouse, um D-pad novo) seria mais uma coisa pra
aprender sem necessidade — e o avatar já fica congelado nesse momento (mesmo padrão de
`drivingCar`/`drivingRocket`), então não há ambiguidade sobre "isso está controlando o quê".

**Confirmar/Cancelar como botões React DOM, não Babylon GUI**: o lab-117 removeu deliberadamente os
controles 2D do bundle de `@babylonjs/gui` (só ficaram `AdvancedDynamicTexture`/`TextBlock`,
-32% no chunk `World3D`) — adicionar um `Button` do Babylon GUI reintroduziria parte desse peso.
Como este projeto já tem um HUD inteiro em React DOM sobreposto ao `<canvas>` (`TouchActionButton`,
`HudHeader` etc.), a barra de posicionamento seguiu o mesmo padrão, sem custo de bundle adicional.

**`placingFurnitureId` como `let` do closure, espelhado por `useState` só pra UI**: mesmo raciocínio
já usado em `insideHouseInterior`/`survivalPlanetId` neste arquivo — o loop de física por quadro
roda dentro de um `useEffect` de dependências `[]`, então só enxerga o valor que existia na
montagem se ler direto do `useState`; o `let` do closure é a fonte de verdade LIDA a cada quadro, o
`useState` é só espelhado (via `setPlacingFurnitureUi`) pra disparar re-render da barra
Confirmar/Cancelar.

**Snapshot da posição ANTES de entrar no modo, não "lembrar o padrão"**: `cancelFurniturePlacement`
restaura `placingFurnitureStartSnapshot` (tirado no instante de `startFurniturePlacement`) em vez de
tentar recalcular "qual seria a posição padrão em anel" — funciona igual pra um item que já tinha
posição salva (volta pra ela) ou que ainda estava no layout padrão (volta pro layout padrão), sem
precisar tratar os dois casos como lógicas diferentes.

## Pendências / dívidas conhecidas

Ver `FEATURES.md` (seção "Pendências"): sobreposição de mobília não é checada (sem física, sempre
foi assim desde o lab-123); desvanecimento não cobre o teto (não testado exaustivamente, câmera
nunca ficou acima dele na verificação).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas features pedidas pelo usuário foram concluídas e verificadas ao vivo.

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário além do backlog já acumulado em `labs/CURRENT.md` (câmera da lojinha de
avatar, mais roupas texturizadas, link do painel `/família`, cache do PWA obsoleto) — perguntar ao
usuário antes de escolher o próximo item.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 78/78 passando (3 testes novos pra `setFurniturePlacement`).
- `npm run build`: typecheck + build de produção sem erros.
- Verificado ao vivo, ponta a ponta: paredes desvanecendo corretamente por oclusão de câmera (só a
  parede certa, testado tanto visual quanto numericamente via `material.alpha`); modo de
  posicionamento testado com tecla real, clique real em Confirmar, persistência real no
  `localStorage` sobrevivendo a um reload de página de verdade, e Cancelar restaurando a posição
  anterior exatamente.
- Deploy: pendente de publicação nos dois servidores (Vercel + Cloudflare Pages).
