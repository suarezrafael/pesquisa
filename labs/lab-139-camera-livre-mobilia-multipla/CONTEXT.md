# Contexto — Laboratório 139 — Câmera livre dentro de casa + comprar múltiplas cópias do mesmo móvel

Preenchido em: 2026-09-02
Commit inicial → final: 1b7957206412f362232463e1e36ed05e0aea6cba..HEAD

## O que foi feito

1. **Câmera livre dentro de casa** (`World3D.tsx`): o resto do jogo usa uma câmera em 3ª pessoa
   TOTALMENTE controlada por código (posição/alvo recalculados por quadro), não o `attachControl`
   nativo do Babylon (só usado no preview pequeno da lojinha, `AvatarPreview3D.tsx`, cena
   separada) — então arrastar/rolar o mouse aqui são ouvintes de ponteiro/roda escritos à mão
   (`pointerdown`/`pointermove`/`pointerup`/`wheel` no canvas), ativos só dentro de casa
   (`insideHouseInterior`) e fora do modo de posicionar mobília. Eles só alimentam 3 refs
   (`cameraYawOffsetRef` — reaproveitado dos botões ◀ ▶ do lab-55 — mais os dois novos,
   `houseCameraPitchOffsetRef`/`houseCameraZoomRef`), lidos pela MESMA fórmula de câmera de
   sempre, agora generalizada pra "esférica" (giro + inclinação + zoom) em vez do offset fixo
   antigo. Com os dois offsets novos em zero (valor ao entrar em casa), a fórmula reproduz
   EXATAMENTE o comportamento de antes — fora de casa nunca muda.
2. **Comprar mais de uma unidade do mesmo móvel** (`progression.ts`, `MyHousePanel.tsx`,
   `World3D.tsx`): `unlockFurniture` parou de usar `unlockGeneric` (que bloqueia recomprar um id já
   possuído) — agora `unlockedFurnitureIds` guarda um id REPETIDO por cópia comprada, e
   `furnitureQuantity` (nova, `progression.ts`) conta quantas cópias existem (ou lê o entitlement
   direto, pra item `subscriptionOnly`). `houseFurnitureNodes` (`World3D.tsx`) virou um mapa por
   CÓPIA (`${itemId}#${índice}`), construído sob demanda por `refreshHouseFurnitureVisuals`
   (reconciliação completa: cria peça nova quando a quantidade cresce, remove quando cai — só
   acontece hoje se uma assinatura expirar). `MyHousePanel.tsx` mostra "✓ Tem (N)" + um botão
   "Mover" por cópia, e o botão de comprar continua disponível mesmo já possuindo (só pros itens
   normais — `subscriptionOnly`/`planetReward` continuam de fora, nunca compráveis com moeda).

## Decisões técnicas tomadas

- **Câmera "esférica" derivada de `camDist`/`camHeight` existentes, não valores novos do zero** —
  `basePitch = atan2(camHeight, camDist)`/`baseRadius = sqrt(camDist²+camHeight²)` reconstroem o
  ângulo/distância de sempre; garante continuidade total pra quem nunca mexe no mouse (mesma
  câmera de antes) e some com o zoom/giro só quando o jogador arrasta.
- **Altura FINAL travada, não pitch/zoom isolados** — achado real testando ao vivo: travar só o
  ângulo de inclinação não bastava, porque o ZOOM também afeta a altura (`radius * sin(pitch)`);
  em pitch+zoom máximos ao mesmo tempo a câmera furava o teto e a tela virava um cinza uniforme
  (câmera literalmente dentro da malha do teto). Corrigido travando a componente vertical FINAL do
  deslocamento (`[-0.3, 2.5]`, sala tem `HOUSE_ROOM_HEIGHT = 3`), cobrindo qualquer combinação de
  ângulo+zoom, não só o caso específico que apareceu no teste.
- **`HOUSE_CAMERA_ZOOM_MAX` reduzido de 2.2 pra 1.4** — achado real testando ao vivo: no valor
  original, zoom máximo colocava a câmera do lado de FORA da sala (11×11,
  `HOUSE_ROOM_HALF_SIZE = 5.5`) — a parede entre câmera e jogador já desvanece nesse caso (mesmo
  mecanismo do lab-136), então não "quebra" de vez, mas a vista fica estranha (olhando o mundo lá
  fora através da parede). Não é uma trava geométrica perfeita pra QUALQUER combinação de
  pitch+zoom (isso exigiria travar também a distância HORIZONTAL, não só a vertical — escopo maior
  que o necessário aqui), só reduz a faixa de zoom pra ficar confortavelmente dentro da sala na
  maioria dos ângulos.
- **`houseFurnitureNodes` por cópia em vez de um mapa "criar tudo, esconder o que falta"** —
  mobília agora é criada SOB DEMANDA (só quando a quantidade realmente cresce), não mais um
  conjunto fixo pré-construído e alternado com `setEnabled`. Mudança de arquitetura necessária: com
  quantidade ilimitada por item, não dá pra pré-construir "todas as cópias possíveis" antecipando
  quanto alguém vai comprar.
- **Posição padrão de uma cópia nova usa proporção áurea `(índice * 97 + cópia) * 0.61803398875 %
  1`, sem depender do total de peças** — o total muda toda vez que alguém compra mais uma (ou uma
  assinatura ativa/expira), então a fórmula de distribuição em anel de antes (que dividia o arco
  pelo TOTAL de itens do catálogo) não dava mais pra reaproveitar sem reposicionar peças já
  existentes (ruim — moveria móveis que o jogador talvez já tenha arrumado). A proporção áurea dá
  uma posição estável e bem distribuída só a partir de (índice do catálogo, índice da cópia).

## Pendências / dívidas conhecidas

- **`HOUSE_CAMERA_ZOOM_MAX = 1.4` não cobre 100% das combinações de pitch+zoom** — em pitch bem
  baixo (câmera quase na altura do chão) + zoom máximo ao mesmo tempo, a distância HORIZONTAL
  ainda pode passar um pouco da parede (a parede desvanece nesse caso, não é um bug visualmente
  quebrado, só uma vista um pouco estranha). Travar isso por completo exigiria também limitar a
  distância horizontal, não só a vertical — não fiz por já não ser o caso comum (usuário teria que
  puxar os dois limites ao extremo ao mesmo tempo) e o fallback (parede some) já evitar o pior caso
  (tela cinza sólida do bug do teto).
- **Remover mobília não existe** — a única forma hoje de `unlockedFurnitureIds` perder uma entrada
  é uma assinatura expirar (item `subscriptionOnly`). Não há "vender"/descartar um item normal
  comprado a mais por engano — fora do que foi pedido, mas registrado como possível próximo passo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — os dois itens planejados foram concluídos e verificados ao vivo.

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário registrado além do que já está pendente de sessões anteriores (bug de
avatar deformado ao equipar óculos na lojinha, ainda não reproduzido — ver
`labs/lab-138-login-diario/CONTEXT.md` § Pendências) — perguntar ao usuário antes de escolher.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 88/88 (4 testes novos de `furnitureQuantity` + 1 teste de `unlockFurniture`
  atualizado pro novo comportamento de recompra).
- `npm run build`: typecheck (`tsc -b`) + build de produção sem erros.
- **Verificado ao vivo** (via `npm run preview`, build de produção real, navegação real — teclado
  sintético W/A/D/E via CDP, mesma técnica já usada em labs anteriores pra evitar o problema de aba
  em segundo plano suspendendo `requestAnimationFrame`):
  - Câmera: arrastar pra cima em pitch/zoom máximos ao mesmo tempo — ANTES da correção, tela virava
    cinza uniforme (câmera dentro do teto); DEPOIS, vista de cima confirmada limpa, chão/boneco
    visíveis normalmente. Achado o problema do zoom saindo da sala, corrigido o teto (verificado
    ao vivo), zoom reduzido por inspeção visual mas sem novo ciclo de teste ao vivo depois do ajuste
    final (ver Pendências).
  - Mobília múltipla: comprada "Planta" duas vezes seguidas na mesma sessão — painel confirmado
    mostrando "✓ Tem (2)" com dois botões "🖐️ Mover #1"/"🖐️ Mover #2" independentes, DUAS peças de
    planta realmente construídas na sala 3D (posições diferentes, uma delas movida de verdade via
    o fluxo de posicionamento e confirmada permanecendo na nova posição enquanto a outra cópia
    ficou intocada).
- Deploy: pendente — mesmo fluxo do lab-138 (push → PR → CI → merge → deploy), a rodar em seguida.
