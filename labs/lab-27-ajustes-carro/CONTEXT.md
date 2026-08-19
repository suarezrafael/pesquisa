# Contexto — Laboratório 27 — Ajustes do carro dirigível

Preenchido em: 2026-08-17
Commit inicial → final: 9700cdaeef2cc5cb7a4354f4017fd859425006f3..7d046717570d9b749a1ffa28f04383ab27bcbe45

## O que foi feito

1. **Rua maior e orgânica** — `STREET_PHI` sobe de 18° pra 25° (raio de um círculo de latitude é
   proporcional a sen(phi); sen(25°)/sen(18°) ≈ 1,37×, uma volta visivelmente maior) +
   `STREET_WOBBLE_AMPLITUDE` (~1,2°, `Math.sin(theta*5)`, mesmo padrão de ondulação já usado no
   rio) — não fica mais um círculo geometricamente perfeito visto de cima.
2. **Boneco visível dirigindo** — trocado `studentFigure.root.setEnabled(false)` (escondia a
   figura) por parentar a figura no próprio carro
   (`studentFigure.root.parent = nearestCar.root`, offset local fixo `(0, 0.56, -0.05)`, sentado
   por cima da cabine) — a figura passa a herdar posição/rotação do carro automaticamente a cada
   quadro (via a hierarquia de transform do Babylon), sem precisar de nenhum código de
   sincronização manual por quadro. Ao sair, `studentFigure.root.parent = null` devolve o
   controle pro loop normal do avatar a pé.

## Decisões técnicas tomadas

- **Descoberta importante ao recalcular a folga da rua maior**: o critério do lab-25 ("nenhum
  marco com phi < 36°") só olhava a posição do CENTRO de cada marco, não o raio dele — a piscina
  (phi=36°, raio de BACIA DE TERRENO 0,32 rad ≈ 18,3°) na real se estende até ~17,7° de phi, quase
  encostando no antigo `STREET_PHI=18°` (a rua original ficou por um triz, ~0,3° de folga, sem eu
  perceber isso no lab-25). A correção não foi "não mexer" — foi entender que a BACIA DE TERRENO
  não é o obstáculo físico de verdade (é só uma rampa suave que a própria rua já segue, via
  `terrainHeight`, igual a qualquer outro relevo do planeta); o obstáculo físico real é só o
  DISCO DE ÁGUA da piscina (`poolRadius = 1.1` unidades, bem menor que os 18,3° da bacia). Com
  isso, dava pra empurrar `STREET_PHI` bem mais longe (25°) sem perigo real, só reavaliando o que
  de fato bloqueia uma rua (água/prédio/plataforma) contra o que só é variação de altura de
  terreno (que a rua acompanha, não colide com ela).
- **Ondulação sutil (1,2°), não algo dramático** — o objetivo era só quebrar a leitura de "círculo
  geométrico perfeito", não arriscar a folga contra a piscina de novo com uma ondulação grande.
- **Parentar no carro, não sincronizar manualmente por quadro** — mais simples e mais robusto que
  copiar posição/rotação todo quadro (que é como os jogadores remotos e os NPCs fazem, porque eles
  não têm uma hierarquia de transform disponível pra usar) — aqui o carro já é um `TransformNode`
  de verdade, então a hierarquia pai-filho do próprio Babylon resolve a sincronização de graça,
  inclusive girando a figura junto quando o carro curva.
- **Sem pose de "sentado"** — documentado como fora de escopo desde o `FEATURES.md`: o boneco fica
  na pose parada (ou parada no meio de um passo, se estava andando ao entrar — congelada, já que
  o loop de animação de caminhada só roda quando `!drivingCar`); dá pra melhorar depois, não
  bloqueava o pedido central ("o boneco deve ficar visível em cima do carro").

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, ~1m40s).
- Testado ao vivo no navegador:
  - **Rua maior**: `phi` mínimo/máximo amostrado em todos os 96 pontos de `streetCenter` =
    23,80°/26,20° (bate com `STREET_PHI=25°` ± `STREET_WOBBLE_AMPLITUDE=1,2°`, confirmando a
    ondulação está ativa e dentro do esperado).
  - **Folga contra a piscina**: distância real do centro da rua até os VÉRTICES da malha
    `poolWater` (não uma estimativa por raio) = 1,54; descontando a meia-largura da rua (0,85),
    folga de ~0,69 unidades — sem sobreposição.
  - **Folga contra as escolas**: distância mínima de qualquer ponto da rua até qualquer uma das
    21 escolas = 3,29 (escola mais próxima: q01); folga de ~1,64 unidades depois de descontar o
    raio aproximado do prédio e a meia-largura da rua.
  - **Boneco visível em cima do carro**: teleportado o avatar pro lado de um carro (posição
    calculada seguindo a curvatura real do planeta, não um deslocamento arbitrário em X — um
    deslocamento ingênuo deixava o avatar fora do chão real naquele ponto, caindo por física
    antes do próximo passo de teste, um artefato de teste descoberto e corrigido durante a
    própria verificação), despachado `keydown 'e'` — confirmado `figure.root.parent.name ===
    'carroRoot'`, `figure.root.position` = `(0, 0.56, -0.05)` (o offset pretendido exato), e
    `figure.root.isEnabled() === true` (nunca escondida).
  - **Segurar seta com o boneco em cima**: carro mudou de posição de verdade (deslocamento
    multi-unidades confirmado numericamente); `figure.root.position` local permaneceu
    `(0, 0.56, -0.05)` o tempo todo — confirma que a herança de transform do Babylon está
    fazendo o trabalho de "andar junto" sem nenhuma sincronização manual por quadro.
  - **Sair**: `figure.root.parent === null` (desparentado), `figure.root.isEnabled() === true`
    (continua visível), avatar reaparece a 1,43 unidades do carro (bate com o offset de 1,3
    pretendido).

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as três funcionalidades planejadas (rua maior, ondulação orgânica, boneco visível) foram
concluídas e verificadas.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Se o usuário continuar pedindo mais conteúdo/customização: outras sugestões já levantadas
   (mais customização de avatar além de chapéus — ver `labs/lab-24-chapeus/CONTEXT.md`).
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
3. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.
4. Se o usuário pedir mais polimento no carro: pose de "sentado" de verdade pro boneco (fora de
   escopo deste lab, documentado acima).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
