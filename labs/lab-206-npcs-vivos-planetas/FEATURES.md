# Laboratório 206 — NPCs vivos nos planetas secundários

Status: em andamento
Início: 2026-09-19
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

- [ ] Idle sutil: balanço vertical suave (seno, fase própria por professor pra não sincronizar
  todos) — sempre ativo, não depende de proximidade.
- [ ] Olhar pro jogador: ao entrar no raio de proximidade, o professor gira (snap, não contínuo)
  pra encarar o jogador, calculado no referencial local da escolinha; volta a olhar pra frente
  (identidade) ao se afastar além do raio de reset — mesma histerese `triggered`/`RESET_DISTANCE`
  já usada em todo o arquivo.
- [ ] Fala catalogada: junto do giro, uma frase curta por matéria (`quest.type`) aparece no balão já
  existente do jogador (`furnitureReactionLabel`) — sem chat livre, sem texto novo por professor.
- [ ] Verificar ao vivo (ver limitação conhecida) e, na falta dela, revisão de código cuidadosa —
  atenção especial à convenção de "frente" de `buildStudentFigure` (risco documentado abaixo).

## Fora de escopo (explicitamente adiado)

- Escolinhas do planeta principal (não citadas pelo backlog desta lab).
- Giro contínuo/suave (slerp por quadro) — trocado por snap único no momento do gatilho, mais
  simples e sem risco de tremedeira perto do raio.
- Mini-quest ambiental nova — a própria escolinha já cumpre esse papel.
- Lab 193 (drawcalls), Lab 194 (chat contextual radial), Lab 197 (órbitas), Lab 198 (efeitos
  visuais), Lab 200 (missões físicas por planeta) — candidatos que ficaram de fora desta escolha.
