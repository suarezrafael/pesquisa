# Laboratório 206 — NPCs vivos nos planetas secundários

Status: concluído
Início: 2026-09-19
Fim: 2026-09-20
Commit inicial: 4425b0ff1c847acb3f69fa2c9328b3f72107536f

## Objetivo do laboratório

Dar vida aos professores das escolinhas dos planetas secundários — hoje são figuras estáticas
("parado ao lado", sem animação nenhuma) — com idle sutil, olhar/virar pro jogador ao se aproximar,
e uma fala catalogada curta que reforça qual matéria aquela escolinha ensina.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 196 - NPCs vivos nos planetas
secundarios" — escolhido entre os itens restantes não bloqueados por medição de FPS ao vivo (Lab
193 drawcalls) depois do lab-205 (Lab 195).

## Investigação prévia

- **Professores das escolinhas SECUNDÁRIAS já existem, mas são estáticos**: `buildPlanetEscolinha`
  (`World3D.tsx`) constrói um totem + `buildStudentFigure` por escolinha de planeta-destino (6 por
  planeta, lab-127), sem nenhuma animação/orientação dinâmica — diferente das escolinhas do
  PLANETA PRINCIPAL (`quests.forEach`, fora de escopo desta lab, que já cita "planetas
  secundarios" explicitamente no backlog).
- **`planetQuestMarkers`** (array já existente, `{ quest, worldPos }`) é consultado num loop de
  proximidade já existente (histerese `triggered`/`RESET_DISTANCE`, mesmo padrão usado em toda
  detecção de proximidade deste arquivo) — estendido aqui pra também carregar `base`
  (`TransformNode`, referencial local da escolinha) e `teacher` (`StudentFigure`), sem precisar de
  um registro paralelo novo.
- **Nenhum NPC deste jogo já vira pra olhar o jogador** (`shopkeeper` tem rotação FIXA) — esta lab
  introduz a primeira instância dessa mecânica. Decisão de escopo: em vez de um giro CONTÍNUO por
  quadro (risco de "tremedeira" perto do raio de gatilho, mesma classe de bug que `RESET_DISTANCE`
  já existe pra evitar em todo o resto do arquivo), o giro é um SNAP único no momento em que o
  jogador entra no raio (mesmo instante da fala), calculado no referencial LOCAL da escolinha
  (`base`) via `atan2`, evitando qualquer conversão de quaternion mundo↔local.
- **`furnitureReactionLabel`** (balão já existente, ligado à cabeça do PRÓPRIO jogador, reaproveitado
  pra várias mensagens ambientais não relacionadas a mobília apesar do nome — "Você está na casa
  de...", etc.) é reaproveitado pra fala do professor, em vez de criar um `TextBlock` novo por
  professor (evitaria até 36 controles de GUI novos, 6 planetas × 6 escolinhas).
- **Fala catalogada por matéria**: `quest.type` (`'logica' | 'matematica' | 'leitura'`) já existe e
  já colore o totem (`questTypeColor`); uma frase curta por tipo reforça "papel claro" e "conecta
  matemática/lógica/leitura" (critério de aceite do backlog) sem inventar um sistema de diálogo
  novo.

## Decisão de escopo

Sem pergunta ao usuário nesta lab (escopo já bem definido pela investigação, baixo risco, reaproveita
100% de padrões já estabelecidos — idle/olhar/fala, sem geometria nova, sem física nova, sem UI
nova). Fora do escopo: as escolinhas do PLANETA PRINCIPAL (não citadas pelo backlog, que é
específico sobre "planetas secundarios"); qualquer "mini pedido/quest ambiental" novo (a própria
escolinha já É a quest ligada àquele professor — não seria uma segunda quest).

## Funcionalidades planejadas

- [x] Idle sutil: balanço vertical suave (seno, fase própria por professor pra não sincronizar
  todos) — sempre ativo, não depende de proximidade.
- [x] Olhar pro jogador: ao entrar no raio de proximidade, o professor gira (snap, não contínuo)
  pra encarar o jogador, calculado no referencial local da escolinha; volta a olhar pra frente
  (identidade) ao se afastar além do raio de reset — mesma histerese `triggered`/`RESET_DISTANCE`
  já usada em todo o arquivo.
- [x] Fala catalogada: junto do giro, uma frase curta por matéria (`quest.type`) aparece no balão já
  existente do jogador (`furnitureReactionLabel`) — sem chat livre, sem texto novo por professor.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (9ª lab seguida — mesma limitação exata, confirmado com uma aba nova). Documentado abaixo;
  confiado em `tsc`/testes/build + leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança —
nenhuma lógica de domínio nova, só animação/gatilho de proximidade); `npm run build` sem erros.

Pontos conferidos por leitura:

- **Convenção de "frente" do rig** (`studentFigure.ts`): comentário confirma olhos posicionados em
  `z: 0.1` ("na frente do rosto (+Z)") — local +Z é a frente do boneco. O próprio código do avatar
  (`Matrix.FromXYZAxesToRef(right, localUp, facing, tmpMatrix)`, `facing` como 3º eixo) confirma que
  +Z-como-frente é a convenção usada em todo o resto do arquivo pro MESMO rig.
- **`base.getWorldMatrix().invertToRef(tmpMatrix)`** confirmado contra a assinatura real do
  `@babylonjs/core` instalado (`math.vector.pure.d.ts`): `invertToRef<T extends Matrix>(other: T):
  T` é método de INSTÂNCIA (inverte a matriz em que é chamada, escreve o resultado em `other`, sem
  mutar a matriz original) — não existe `Matrix.InvertToRef` estático (erro cometido e corrigido
  antes de qualquer verificação externa).
- **`planetRoot` nunca é rotacionado** (comentário já existente no código: "`planetRoot.position` é
  sempre o `*_CENTER` fixo do planeta, nunca rotacionado") — confirma que a rotação MUNDIAL de
  `base` é só a própria `base.rotationQuaternion` (`alignmentQuaternion(localUp)`), sem rotação
  adicional do pai a considerar.

**Risco remanescente, honesto**: o SENTIDO exato do giro (`atan2(dirLocal.x, dirLocal.z)` +
`Quaternion.RotationAxis(Vector3.Up(), yaw)`) não foi confirmado ao vivo — é matematicamente
consistente com a convenção +Z-como-frente confirmada acima, mas um erro de sinal deixaria o
professor olhando na direção OPOSTA (180°) ou de lado (90°) em vez de reto pro jogador. Puramente
cosmético (não afeta gatilho de quiz/fala/idle, que continuam funcionando independente do sentido
do giro) — reduzido, não eliminado, pela verificação matemática acima.

## Rodada de review — Copilot (PR #89)

2 achados: 1 real (confirmado e corrigido), 1 falso positivo (investigado e descartado com
evidência):

1. **Médio — idle sutil congelava com chat aberto ou jogo suspenso (real)**: a primeira versão
   colocava a atualização do balanço vertical DENTRO do bloco `!suspendRef.current &&
   !chatOpenRef.current` (pensado só pra proteger GATILHOS de interação, ex.: abrir um quiz com o
   chat aberto) — contradizia o próprio comentário ("roda sempre, mesmo em escolinha já concluída")
   e congelava a animação toda vez que um painel abria. Corrigido movendo o idle pra um laço
   incondicional separado, no mesmo lugar/padrão das outras animações puramente cosméticas do
   arquivo (nuvens, pulso do portal) — só o giro/fala (interação de verdade) continua atrás da
   guarda.
2. **Alto (FALSO POSITIVO) — "acessa campo `marker.id` inexistente"**: investigado antes de
   corrigir — `marker.id` não aparece em NENHUM lugar do código desta lab (a linha citada usa
   `marker.quest.id`, dentro de `greetTriggerId`, não `marker.id`). `npx tsc -b` continua limpo
   antes E depois da correção do achado real acima, confirmando que não existe erro de TypeScript
   nenhum aqui. Descartado sem alteração de código.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` continuam limpos depois da
correção real.

**Rodada 2**: "🟢 Approval recommended" ("não há problemas pendentes que bloqueiem a aprovação"),
achado real da rodada 1 confirmado como "Resolved since last review". O falso positivo
(`marker.id`) continua listado como "Open" pela 2ª vez seguida, mesmo com o próprio texto do resumo
recomendando aprovação — mesmo padrão de thread persistente já visto em labs anteriores (o comentário
original só some da listagem quando alguém marca "resolved" manualmente na UI do GitHub, não reflete
mais uma reavaliação real). Nenhum comentário inline novo. Pronta pra revisão de merge.

## Fora de escopo (explicitamente adiado)

- Escolinhas do planeta principal (não citadas pelo backlog desta lab).
- Giro contínuo/suave (slerp por quadro) — trocado por snap único no momento do gatilho, mais
  simples e sem risco de tremedeira perto do raio.
- Mini-quest ambiental nova — a própria escolinha já cumpre esse papel.
- Lab 193 (drawcalls), Lab 194 (chat contextual radial), Lab 197 (órbitas), Lab 198 (efeitos
  visuais), Lab 200 (missões físicas por planeta) — candidatos que ficaram de fora desta escolha.
