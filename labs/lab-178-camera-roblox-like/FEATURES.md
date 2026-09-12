# Laboratório 178 — Câmera Roblox-like fácil

Status: em andamento
Início: 2026-09-11
Fim: -
Commit inicial: 43a197544720c7ee8b253e50cc314b1edb8437b8

## Objetivo do laboratório

Fechar o item P0 `docs/growth-retention-monetization-backlog.md`, seção 7/12, "Lab 178 - Câmera
Roblox-like fácil" — próximo da ordem recomendada após o lab-177. Crianças que já jogam
Roblox/Minecraft esperam uma câmera em 3ª pessoa simples e permissiva; fricção de câmera reduz
ativação antes do valor educativo aparecer.

## Investigação prévia (antes de codar)

Levantamento do código real de `World3D.tsx` feito antes de escrever este documento — boa parte
do escopo do backlog **já está implementada** por labs anteriores (55, 138, 140, 149, 150, 153),
então este lab foca só no que falta de verdade:

- **Já implementado (não mexer)**: giro horizontal por arrastar mouse/dedo, tanto dentro de casa
  (lab-138) quanto do lado de fora (lab-153, metade DIREITA da tela reservada pro giro, metade
  ESQUERDA reservada pro `TouchJoystick` de movimento — exatamente o "dedo direito pra câmera,
  esquerdo pra movimento" pedido pelo backlog); botões ◀ ▶ de giro em velocidade fixa, com suporte
  a teclado (lab-150); suavização via `Vector3.Lerp` no loop de física (`camera.position`/
  `camera.setTarget` a cada quadro, fator 0.08-0.12 conforme o modo); direção de movimento
  relativa à câmera preservada em todos os modos (a pé, carro, foguete).
- **Zoom (scroll/pinch) existe SÓ dentro de casa** (`houseCameraZoomRef`/`onHouseCameraWheel`,
  guardado por `insideHouseInterior`) — do lado de fora (a pé, carro, foguete), a distância da
  câmera é sempre fixa (`CAMERA_DISTANCE = 9`), sem nenhum controle de zoom. Gap real vs. o
  critério do backlog ("zoom por scroll/pinch").
- **Não existe botão de recentralizar** — só os botões ◀ ▶ de giro contínuo em velocidade fixa;
  não há nenhuma ação de "voltar a câmera pra trás do jogador" de um giro acumulado.
  Gap real vs. o critério do backlog.
- **Não existe nenhuma colisão/anti-clipping de câmera** — a posição é sempre um offset fixo
  atrás/acima do alvo (`avatarMesh.position.subtract(facing.scale(CAMERA_DISTANCE))...`), sem
  nenhum raycast checando se esse ponto cai dentro de uma montanha/parede/objeto. Com o relevo
  mais alto do planeta principal e os morros de planetas secundários (lab-177), a câmera pode
  ficar dentro da geometria em ângulos de rampa íngreme. Gap real vs. o critério explícito do
  backlog ("câmera não entra dentro do planeta/personagem"). O padrão de raycast físico já existe
  no código (`havokPlugin.raycast(from, to, result, { ignoreBody })`, usado por
  `terrainGroundRadial` e pelo ajuste de altura do pet) — reaproveitável aqui.
- **Botões de toque (`TouchActionButton`) não têm `aria-label`/`title`** — só o glifo visual
  (`◀`/`▶`) como conteúdo, sem nome acessível descritivo nem tooltip nativo pra mouse. Gap real,
  pequeno, junto do critério "tooltips mínimos quando necessário".
- **Sensibilidade padrão** (`CAMERA_DRAG_SENSITIVITY = 0.006`) já existe como constante única —
  o backlog pede um valor padrão razoável, não um sistema de configuração (isso é "fora de
  escopo" explícito no próprio item do backlog), então nenhuma mudança aqui a menos que o teste ao
  vivo mostre que o valor atual está ruim.

## Funcionalidades planejadas

- [ ] Zoom por scroll (desktop) e pinch (touch) na câmera de 3ª pessoa do lado de FORA de casa —
      a pé, dirigindo carro e pilotando o foguete (todos reaproveitam `CAMERA_DISTANCE`/
      `CAMERA_HEIGHT`). Mesmo padrão de clamp min/max já usado dentro de casa
      (`houseCameraZoomRef`), com seus próprios limites (perto o bastante pra ver o avatar de
      corpo inteiro, longe o bastante pra dar visão espacial sem sair de proporção com o mundo).
      (referência: `docs/growth-retention-monetization-backlog.md`, Lab 178, "zoom por
      scroll/pinch")
- [ ] Botão de recentralizar câmera (HUD, mesmo padrão visual/acessível de `TouchActionButton`) —
      anima o giro acumulado (`cameraYawOffsetRef`, e pitch/zoom quando dentro de casa) de volta
      ao padrão suavemente, sem corte brusco. (referência: backlog, Lab 178, "botão de
      recentralizar")
- [ ] Evitar a câmera clipando pra dentro de terreno/montanha/parede — raycast físico
      (`havokPlugin.raycast`, mesmo padrão já usado em `terrainGroundRadial`) do alvo até a
      posição desejada da câmera; se bloqueado, aproximar a câmera ao longo do mesmo raio até
      pouco antes do ponto de colisão. Testar especificamente numa rampa íngreme do planeta
      principal e num morro de Marte (lab-177) — os casos mais prováveis de expor o problema.
      (referência: backlog, Lab 178, "colisão/evitar clipping"; critério de aceite explícito
      "câmera não entra dentro do planeta/personagem")
- [ ] `aria-label`/`title` mínimos nos botões de câmera existentes (◀ ▶) e no botão de
      recentralizar novo — nome acessível descritivo pra leitor de tela + tooltip nativo pra
      mouse em desktop. (referência: backlog, Lab 178, "tooltips mínimos quando necessário")
- [ ] Teste manual documentado em desktop E viewport mobile (screenshot/evidência no
      `CONTEXT.md` deste lab) — critério de aceite explícito do backlog.

## Fora de escopo (explicitamente adiado)

- Sistema completo de configurações avançadas de câmera (sensibilidade ajustável pelo usuário,
  inverter eixo, etc.) — o próprio backlog já marca isso como fora de escopo deste item.
- Suporte a controle/gamepad, caso ainda não exista — fora de escopo explícito do backlog.
- Qualquer mudança em combate (não existe combate no jogo).
- Reescrever o giro horizontal por arrasto ou os botões ◀ ▶ já existentes e funcionando (lab-153/
  lab-150) — só ADICIONAR o que falta (zoom, recenter, anti-clipping, acessibilidade), nunca
  substituir o que já funciona.
- Mudar `CAMERA_DRAG_SENSITIVITY` sem evidência ao vivo de que o valor atual atrapalha.
