# Contexto — Laboratório 135 — Correção: boneco enterrado no interior da casa (chão plano tratado como esfera)

Preenchido em: 2026-08-31
Commit inicial → final: 9275b02e54d20704e76fbb031ee8c6789b51d7dc..HEAD

## O que foi feito

Ver `FEATURES.md` para a investigação completa. Resumo: o interior da "Minha Casa" (lab-123) é
modelado como um "planetinha" de raio grande (`HOUSE_INTERIOR_RADIUS=10`) reaproveitando a mesma
gravidade radial esférica do resto do jogo — decisão que assumia curvatura "imperceptível" numa
sala de poucos metros, mas o chão da sala é uma caixa PLANA de verdade, não uma esfera. A fórmula
de "grudar o personagem visual na superfície" usa a direção normalizada até o centro (`localUp`)
pra reconstruir a posição inteira — válido numa esfera (a direção É a posição), inválido num plano
(a mesma direção é compartilhada por infinitos pontos do chão) — resultado: o boneco visual afundava
cada vez mais fundo no chão real conforme se afastava do ponto exatamente acima do centro da sala
(até ~0,4 unidade nas bordas), exatamente o "enterrado quase no joelho" relatado.

Corrigido em três partes, todas dentro do bloco de física por quadro em `World3D.tsx`:
1. `dist` vira `relPos.y` (altura acima do plano) em vez de distância euclidiana 3D, enquanto
   `insideHouseInterior` — corrige a altura de pulo (`airHeight`), que antes crescia só por andar
   longe do centro, sem pular de verdade.
2. `localUp` trava em `HOUSE_INTERIOR_LANDING_UP` (vertical pura) em vez de recalcular
   radialmente — corrige gravidade (antes com puxão lateral espúrio rumo ao centro), orientação do
   boneco (antes inclinada) e câmera (`upVector`/altura, antes também inclinados).
3. A posição visual do personagem ganha um caminho próprio pra dentro de casa: x/z vêm direto do
   colisor físico real (`pos`), só a altura reaproveita a fórmula de sempre — sem isso (tentativa
   inicial, corrigida ainda durante este laboratório antes de qualquer commit) uma direção
   constante colapsa qualquer posição horizontal pro mesmo ponto único, um bug PIOR que o
   original (boneco preso sempre no centro da sala).

## Decisões técnicas tomadas

A decisão central: em vez de dar ao interior sua própria física/câmera dedicada (reescrever do
zero), manter a MESMA infraestrutura de `currentWorldCenter`/`currentGroundBaseFn`/`localUp` já
usada pra planetas de verdade (como o lab-123 originalmente decidiu), só ensinando esse bloco a
tratar "sala plana" como um caso especial explícito (`insideHouseInterior`) em vez de forçar a
abstração esférica a cobrir os dois casos com a mesma matemática. Reaproveita 100% do resto do
pipeline (gatilhos de proximidade, `currentGroundBaseFn` já retornando uma constante pro
interior, câmera) — só os três pontos que dependiam de "direção codifica posição" precisaram de
um branch.

**Porquê separar `dist` de `localUp` em vez de só uma correção**: inicialmente só travar `localUp`
foi tentado (parecia bastar), mas isso sozinho quebra o rastreamento HORIZONTAL da posição visual
por completo (ver "Achado de ferramenta" em `FEATURES.md`) — a lição registrada: ao portar código
pensado pra uma superfície esférica pra um plano, é preciso decompor explicitamente "altura" (que
uma direção travada ainda resolve) de "posição horizontal" (que precisa vir da posição real, nunca
de uma direção sozinha) — não dá pra corrigir só metade do problema e esperar o resto continuar
funcionando por acidente.

## Pendências / dívidas conhecidas

- **Paredes/câmera perto de cantos apertados**: mesmo com a orientação/altura de câmera corrigidas
  aqui, uma sala de 11×11 com câmera a 3,2 unidades de distância ainda pode ficar bem perto ou
  atravessando a parede em cantos (visto no screenshot da verificação ao vivo). Não corrigido
  neste laboratório — precisa confirmar com o usuário se ainda incomoda depois deste fix antes de
  investir numa feature de fade/transparência de parede por oclusão de câmera.
- **Colocação manual de móveis comprados**: pedido explícito do usuário na mesma mensagem, não
  coberto — hoje a mobília aparece automaticamente num anel fixo ao redor do balcão. Precisaria de
  uma UI de posicionamento nova (escopo de feature, não bug).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma dentro do escopo deste laboratório (só o afundamento do boneco) — as outras duas queixas
da mesma mensagem do usuário nunca entraram no escopo, ver "Fora de escopo" em `FEATURES.md`.

## O que o próximo laboratório deve desenvolver

Perguntar ao usuário se as paredes/câmera continuam incomodando depois deste fix; se sim, ou se
ele confirmar que quer seguir com colocação manual de móveis no catálogo, cada um vira um
laboratório próprio (são features novas e não-triviais, não extensões diretas deste fix). Resto do
backlog acumulado (câmera da lojinha de avatar, mais roupas texturizadas, link do painel
`/família`, cache do PWA obsoleto) segue em `labs/CURRENT.md`, sem prioridade única definida.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 75/75 passando (sem teste novo — física/renderização 3D, não lógica de domínio).
- `npm run build`: sem erros.
- Verificado ao vivo: entrada real na casa (mesmo gatilho corrigido no lab-134), depois três
  posições diferentes dentro da sala (perto do centro, meio caminho, canto extremo perto da
  parede) — em todas, a posição visual do personagem bate exatamente com o colisor físico em x/z e
  a altura fica fixa no chão real (10,02), sem afundamento nenhum mesmo no canto mais extremo.
  Confirmado também por screenshot (corpo inteiro visível, pés apoiados no chão).
- Deploy: pendente — aplicado no código, ainda não publicado nos dois servidores.
