# Laboratório 136 — Paredes transparentes por oclusão de câmera + posicionamento manual de mobília

Status: concluído
Início: 2026-08-31
Fim: 2026-08-31
Commit inicial: 2a1164cc9d2eec2611dba9ad735afd82de9bcfeb

## Objetivo do laboratório

Os dois itens deixados de fora do lab-135 ("Fora de escopo"), confirmados pelo usuário como
realmente desejados assim que perguntado: *"as paredes estao solidas, precisam ficar
transparentes pra camera e ao comprar um peca pra casa tem que ter opcao virtual de escolher em
que posicao dacas deve ficar a peca, nao so clicar e colocar em uma logar jogado, tem que ter como
escolher o angulo e posicao onde fica o objeto."*

## Funcionalidades planejadas

- [x] Parede da sala fica translúcida quando a câmera fica do lado de fora dela (mesmo espírito do
  "chão do quarto imperceptível" do lab-123, mas pra paredes) — desvanecimento suave, não um
  corte abrupto.
- [x] Modo de posicionamento manual de mobília: mover (x/z) e girar (ângulo) uma peça já possuída
  dentro da sala, com confirmar/cancelar — não mais só o layout fixo em anel do lab-123.

## Investigação

### Paredes transparentes

As 4 paredes da sala (lab-123) compartilhavam UMA ÚNICA instância de `PBRMaterial` — qualquer
desvanecimento nela afetaria as 4 ao mesmo tempo, não só a que está atrapalhando a visão. A câmera
em 3ª pessoa (`desiredCamPos = pos - camFacing*camDist + up*camHeight`) pode ficar do lado de FORA
de uma parede em cantos apertados (sala 11×11, `HOUSE_INTERIOR_CAMERA_DISTANCE=3,2`) — confirmado
ao vivo nesta investigação (câmera medida em `z=157,5`, além do limite da parede sul em `z=155,5`).

### Posicionamento manual de mobília

O layout da 1ª versão (lab-123) usava um anel fixo calculado por ângulo ao redor do balcão — sem
jeito nenhum de o jogador escolher onde cada peça fica. O pedido explícito do usuário pede DOIS
eixos de controle (posição E ângulo), não só uma posição solta.

## O que foi feito

### Paredes transparentes (`World3D.tsx`)

- Cada parede ganha seu PRÓPRIO material CLONADO (`wallMat.clone(...)`) em vez de compartilhar a
  mesma instância — pré-requisito pra desvanecer uma sem afetar as outras três.
- A cada quadro, dentro de casa: a posição da câmera é comparada, em coordenadas LOCAIS de
  `interiorRoot`, contra `±HOUSE_ROOM_HALF_SIZE` em cada eixo — não é um raycast (a sala é uma
  caixa com paredes ortogonais aos eixos locais, então a checagem geométrica direta já identifica
  exatamente qual parede a câmera atravessou). A parede "do lado errado" recebe alpha-alvo
  `HOUSE_WALL_FADE_ALPHA=0,18` (baixo, mas não zero — a sala continua reconhecível como sala);
  as outras voltam pra `1`. Interpolado com lerp (`+= (alvo - atual) * 0,2` por quadro), não trocado
  de opacidade num quadro só, pra não "piscar".
- `PBRMaterial.alpha < 1` já ativa blending sozinho (`needAlphaBlending()` verificado no código-fonte
  do pacote) — sem precisar mexer em `transparencyMode` manualmente.

### Posicionamento manual de mobília (`World3D.tsx`, `MyHousePanel.tsx`, `progression.ts`,
`useProgress.ts`, `types.ts`, `storage.ts`, `App.tsx`)

- **Dado novo**: `Progress.housePlacements: Record<string, {x, z, rotY}>` — ausência de uma chave
  significa "ainda no layout padrão em anel"; `setFurniturePlacement` (`progression.ts`) é pura
  escrita de coordenadas já escolhidas na cena 3D, sem conhecer nada de geometria da sala (mesmo
  espírito de separação de `docs/prompts/03-arquitetura-sistema.md` já seguido por todo o resto
  deste arquivo).
- **Entrada no modo**: botão "🖐️ Mover" novo no `MyHousePanel`, ao lado de cada item já possuído.
  Fecha o painel e chama `App.tsx → placingFurnitureRequestId` (prop nova em `World3D`, observada
  por um `useEffect`, mesmo padrão de bridge já usado por `unlockedFurnitureIds`/
  `__refreshHouseFurniture`).
- **Dentro da cena 3D**: `startFurniturePlacement(id)` congela o jogador (mesmo mecanismo de
  `drivingCar`/`drivingRocket` — `placingFurnitureId` entra na mesma condição de guarda do bloco
  de física) e deixa a peça "fantasma" (alpha 0,55). O MESMO eixo de movimento (WASD/joystick) e os
  MESMOS botões de rotação de câmera (◀ ▶, antes só giravam a câmera) passam a mover/girar a peça
  em vez do avatar/câmera enquanto o modo estiver ativo — reaproveita input já existente em vez de
  inventar um controle novo. Posição clampada dentro da sala com folga (`FURNITURE_PLACEMENT_MARGIN
  = 0,7`) pra nunca colar na parede.
- **Confirmar/Cancelar**: barra nova (`furniture-placement-bar`, React DOM normal — NÃO Babylon
  GUI, pra não reintroduzir controles 2D que o lab-117 removeu de propósito do bundle) com dois
  botões reais (alvo de toque 44px, `[MUST]` de acessibilidade do lab-91/120). Confirmar persiste
  via `onFurniturePlaced` (chega em `useProgress().setFurniturePlacement`); Cancelar restaura um
  snapshot tirado no instante em que o modo começou (funciona tanto pra "já tinha posição salva"
  quanto "ainda no layout padrão", sem precisar tratar os dois casos separadamente). Sair de casa
  com o modo ainda ativo (`exitHouseInterior`) cancela automaticamente — sem isso o jogador ficaria
  sem jeito de confirmar/cancelar depois de sair.
- **Ao (re)construir a sala**: o layout em anel só é usado pra itens SEM posição salva —
  `progress.housePlacements[item.id]`, quando presente, tem prioridade.

## Achado real na verificação ao vivo (não só leitura de código)

Testado o roteiro completo, de ponta a ponta: entrada real na casa (mesmo gatilho do lab-134/135),
câmera empurrada pra fora da parede sul de propósito (`__debugSetFacing` + assentamento físico) —
confirmado visualmente por screenshot (parede sul translúcida, avatar e balcão "Catálogo" visíveis
através dela; parede leste ao lado continua opaca, provando que só a parede certa desvanece) e por
leitura direta de `material.alpha` (convergiu pra `0,18` na parede atravessada, `1` nas outras 3).
Posicionamento testado com um item real já possuído (`tapete`, do perfil de dev usado nesta
sessão): tecla `D` sintética real movendo a peça fantasma (não o avatar, confirmado — o avatar
ficou parado), clique real no botão "✅ Confirmar posição" gravando a posição exata no
`localStorage`, recarregada a página e a sala reconstruída já nasce com a peça na posição salva
(não no anel padrão) — prova que a persistência sobrevive a uma sessão nova de verdade, não só a
um `setState` em memória. Testado também Cancelar: mover a peça manualmente e cancelar restaura
exatamente a posição/ângulo salvos, com alpha de volta a `1`.

`npm run test`: 78/78 (3 testes novos pra `setFurniturePlacement`). `npm run build`: sem erros.

## Pendências / dívidas conhecidas

- **Colisão da mobília com ela mesma ou com o balcão não é checada** — o jogador pode sobrepor
  duas peças ou colocar uma dentro do balcão; não há física de mobília (nunca teve, desde o
  lab-123), então não há bloqueio nenhum, só uma limitação visual que o próprio jogador precisa
  evitar. Fica como possível melhoria futura (checar sobreposição de bounding box antes de
  confirmar), não crítica — o pedido do usuário era "poder escolher", não "impedir erro".
- **Desvanecimento de parede não cobre o teto** — só as 4 paredes; a câmera pode em teoria também
  ficar acima do teto em ângulos extremos (não observado na verificação, `HOUSE_INTERIOR_CAMERA_
  HEIGHT=2,2` é bem menor que `HOUSE_ROOM_HEIGHT=3`), mas não foi testado exaustivamente.
- Resto do backlog acumulado (câmera da lojinha de avatar, mais roupas texturizadas, link do painel
  `/família`, cache do PWA obsoleto) segue em `labs/CURRENT.md`, sem prioridade única definida.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 78/78 passando (3 novos: `setFurniturePlacement` grava, sobrescreve, e não afeta
  outros itens/campos).
- `npm run build`: typecheck + build de produção sem erros.
- Verificado ao vivo: paredes desvanecem corretamente por oclusão de câmera (só a parede certa,
  confirmado visual + numericamente); posicionamento manual de mobília testado ponta a ponta com
  tecla real, clique real, persistência real em `localStorage`, e sobrevivência a um reload de
  página de verdade.
- Deploy: pendente de publicação nos dois servidores (Vercel + Cloudflare Pages).
