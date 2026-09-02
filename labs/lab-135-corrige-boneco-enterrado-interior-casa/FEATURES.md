# Laboratório 135 — Correção: boneco enterrado no interior da casa (chão plano tratado como esfera)

Status: concluído
Início: 2026-08-31
Fim: 2026-08-31
Commit inicial: 9275b02e54d20704e76fbb031ee8c6789b51d7dc

## Objetivo do laboratório

Bug reportado pelo usuário ao vivo, em produção, logo depois de confirmar que o fix do lab-134
(`HOUSE_TRIGGER_DISTANCE`) funcionou de verdade: *"funcionou, so as paredes precisam ficar
transparentes da casa pois a camera nao via conseguir enxergar o cenario e oo boneco. ao acessar o
tem que ser possivel escolhar one colocar o objetos do catalog comprados, e o boenco esta enterrado
na caasa quase no joelho"* — três queixas numa mensagem só, a primeira vez que um jogador de
verdade entrava no interior da casa desde que o gatilho de entrada foi corrigido (o interior
existe desde o lab-123, mas nunca tinha sido alcançado por um jogador real antes, só por teleporte
de depuração que ignora a colisão que bloqueava a entrada — ver lab-134).

Este laboratório cobre só a queixa mais concreta e diretamente causada por lógica identificável: o
boneco enterrado até o joelho. As outras duas (paredes transparentes / escolher onde colocar
móveis) ficam de fora — ver "Fora de escopo" abaixo.

## Investigação

O interior da casa (lab-123) foi modelado como mais um "planetinha" de raio grande
(`HOUSE_INTERIOR_RADIUS = 10`), reaproveitando a MESMA gravidade radial de todo o resto do jogo
(`currentWorldCenter`/`currentGroundBaseFn`) — decisão documentada no código como assumindo que "a
curvatura seria imperceptível numa sala de poucos metros". Na prática essa suposição estava
ERRADA: o chão da sala é uma caixa de verdade, genuinamente PLANA, não uma esfera.

O bloco de física/movimento por quadro (`World3D.tsx`, ~linha 8000) calcula `localUp` como a
direção NORMALIZADA de `currentWorldCenter` até o jogador — numa esfera de verdade, essa direção
codifica a posição inteira na superfície (bijetiva). Numa sala PLANA, a mesma direção "pra cima" é
compartilhada por infinitos pontos no chão — não pode codificar posição horizontal nenhuma. Como o
personagem VISUAL "gruda" na superfície ao longo de `localUp` (`currentWorldCenter +
localUp*(raio+altura))`), fora do exato ponto acima do centro da sala essa fórmula literalmente
puxa o boneco visual pra BAIXO do chão real — até ~0,4 unidade nas bordas da sala de 11×11 (medido
ao vivo). A física do colisor em si sempre esteve correta (repousa no chão PLANO via colisão real
de verdade, não por esta fórmula) — só a posição/orientação VISUAL do boneco, a altura de pulo
(`airHeight`), a gravidade aplicada e a câmera usavam a fórmula esférica errada.

**Achado de ferramenta durante a própria correção**: a primeira tentativa de fix (só travar
`localUp` na vertical pura) quebrou o rastreamento horizontal por completo — como a fórmula de
"grudar na superfície" só sabe posicionar ao longo de UMA direção a partir de um centro fixo, uma
direção CONSTANTE colapsa qualquer posição horizontal pro mesmo ponto único (o boneco ficava
sempre travado bem no centro da sala, x/z fixos, pior que o bug original). Só detectado testando
ao vivo com o boneco fisicamente longe do centro (`__debugTeleportExact` + verificação de
`window.__playerFigure.root.position`) — release note própria pra não repetir esse erro: ao
adaptar código pensado pra superfície esférica pra um plano, a direção "pra cima" sozinha não
resolve posição alguma; é preciso separar explicitamente altura (que a direção ainda resolve bem,
travada) de x/z horizontais (que precisam vir da posição real do colisor, `pos`, não de `localUp`).

## O que foi feito

- **`World3D.tsx`** (bloco de física por quadro, dentro de `if (avatarBody && avatarMesh)`):
  - `dist` passa a ser `relPos.y` (altura acima do plano do centro) em vez de `relPos.length()`
    (distância euclidiana 3D) enquanto `insideHouseInterior` — corrige `airHeight`/altura de pulo,
    que antes crescia artificialmente só por o jogador se afastar do centro horizontalmente, sem
    pular de verdade.
  - `localUp` trava em `HOUSE_INTERIOR_LANDING_UP` (vertical pura) enquanto `insideHouseInterior`,
    em vez de recalcular radialmente a partir do centro — corrige gravidade (antes puxava
    ligeiramente pro centro da sala, uma força lateral espúria), orientação do boneco (antes
    inclinava pra fora do prumo conforme se afastava do centro) e o `upVector`/altura da câmera
    (antes também inclinavam).
  - A linha que "gruda" o personagem visual na superfície ganha um `if (insideHouseInterior)`
    específico: x/z vêm direto de `pos` (posição real do colisor físico), só a altura usa a mesma
    fórmula de sempre (`currentGroundBaseFn(localUp) + 0.02 + airHeight`) — sem isso, mesmo com
    `localUp` travado, uma direção constante não tem como codificar posição horizontal nenhuma
    (ver "Achado de ferramenta" acima).

## Verificação ao vivo

Reproduzido o roteiro completo, real, sem atalho: teleporte de depuração até um ponto FORA da
colisão sólida da parede externa da casa (mesma técnica rigorosa estabelecida no lab-134),
assentamento físico real por dezenas de quadros, `__handleInteractPress()` pra entrar (mesmo
gatilho que um jogador real usa), depois `__debugTeleportExact` pra três posições diferentes DENTRO
da sala (perto do centro, a meio caminho, e bem no canto perto da parede, ~5 unidades do centro em
cada eixo) com assentamento físico forçado em cada uma. Em TODAS as três posições,
`window.__playerFigure.root.position` bateu exatamente com `avatarCollider.position` em x/z, e a
altura ficou fixa em `10.02` (chão real da sala) — sem afundamento algum, nem no canto mais
extremo. Confirmado visualmente por screenshot: corpo inteiro visível, pés apoiados no chão, mesmo
espremido no canto perto da parede.

`npm run test`: 75/75 (sem teste novo — física/renderização 3D, não lógica de domínio pura).
`npm run build`: sem erros.

## Fora de escopo (explicitamente adiado)

As outras duas queixas da mesma mensagem do usuário, ambas features maiores (não bugs pontuais):

- **"As paredes precisam ficar transparentes... a câmera não via conseguir enxergar o cenário e o
  boneco"**: parte do sintoma original pode ter sido simplesmente a câmera inclinada pela MESMA
  causa raiz corrigida aqui (gravidade/orientação/câmera puxando pro centro da sala perto das
  paredes) — mas mesmo corrigido, uma sala de 11×11 com `HOUSE_INTERIOR_CAMERA_DISTANCE=3,2` ainda
  pode colocar a câmera bem perto ou atravessando a parede em cantos apertados (visível no
  screenshot da verificação: câmera bem perto da parede no canto). Um fade/transparência de parede
  quando a câmera está perto ou atrás dela é uma feature de renderização própria (detectar
  oclusão e ajustar alpha do material), não coberta aqui — precisa de verificação com o usuário se
  ainda é necessária depois deste fix, ou se já melhorou o suficiente.
- **"Ao acessar [o catálogo] tem que ser possível escolher onde colocar os objetos do catálogo
  comprados"**: hoje a mobília comprada aparece automaticamente num anel fixo ao redor do balcão
  (`World3D.tsx`, layout gerado por ângulo a partir de `FURNITURE_CATALOG`) — colocação manual
  exigiria uma UI de posicionamento nova (arrastar/apontar um local livre dentro da sala), escopo
  de feature nova, não um bug.

## O que o próximo laboratório deve desenvolver

Perguntar ao usuário se as paredes/câmera continuam sendo um problema depois deste fix (pode ter
resolvido sozinho); se sim, ou se ele confirmar que quer seguir com colocação manual de móveis,
tratar como novo(s) laboratório(s) — ambos são escopo de feature nova, não extensão natural deste
fix. Resto do backlog acumulado (ver `labs/CURRENT.md`) segue sem prioridade única definida.
