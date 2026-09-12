# Laboratório 180 — Missões ambientais de aprendizagem

Status: em andamento
Início: 2026-09-12
Fim: -
Commit inicial: 6114f8e3dcc5124422a0819148edd22451b7b91d

## Objetivo do laboratório

Fazer parte do aprendizado acontecer como ação natural do mundo, não como uma pausa pra responder
quiz: 3 landmarks novos no planeta principal (ponte, posto de abastecimento do foguete, placa)
que abrem o MESMO `QuestModal` de sempre com uma pergunta do tipo certo (lógica/matemática/leitura),
usando os dados já existentes de `data/quests.ts` — sem inventar física de puzzle nem conteúdo novo.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 180", próximo item recomendado após
o lab-179 (ver `CONTEXT.md` do lab-179, seção "O que o próximo laboratório deve desenvolver", e a
ordem sugerida do documento, item 6).

## Investigação prévia (antes de codar)

- Não existe nenhuma geometria de ponte/posto de abastecimento/placa no `World3D.tsx` hoje — os 3
  landmarks descritos no documento ("alinhar pontes por lógica, abastecer foguete com matemática,
  decifrar placas por leitura, abrir portas por padrões") são construções NOVAS, não uma
  reformulação de algo existente.
- O padrão mais próximo já no código é a "carteira de estudos" e o "desafio em dupla" (lab-172):
  um `TransformNode` fixo posicionado com `terrainGroundRadial` + `settleMeshOnTerrain`, um emoji
  flutuante (`TextBlock`/GUI), uma dica "Pressione E" que só fica visível dentro de uma distância
  de gatilho, e um handler de tecla `E` que abre um `QuestModal` já existente. Vou replicar esse
  mesmo padrão pros 3 landmarks novos — não precisa de nenhum sistema novo, só reaproveitar o que
  já existe.
- `state/useProgress.ts`'s `completeQuest` é idempotente (responder uma missão já concluída de
  novo não premia XP/moeda de novo, `applyQuestCompletion`) — dá pra sortear entre missões
  incompletas do tipo certo e cair de volta pro pool inteiro se todas já tiverem sido respondidas,
  mesmo padrão já usado pelo "desafio em dupla" (`quests.filter(!completedQuestIds.includes)`,
  fallback pro pool inteiro).
- `data/quests.ts` tem só 3 tipos (`logica`/`matematica`/`leitura`) — os MESMOS 3 que
  `skillBreakdown` (lab-167) já rastreia em `/familia`. Cada landmark fica com um tipo fixo.
- O 4º item do documento ("abrir portas por padrões") fica fora de escopo — o critério de aceite
  pede só 3 missões ambientais, e o documento já autoriza "transformar PARTE dos quizzes", não
  todos os 4 temas.

## Funcionalidades planejadas

- [ ] **Ponte (lógica)** — landmark novo no planeta principal; ao apertar `E` perto, abre
  `QuestModal` com uma pergunta sorteada do tipo `logica` (prioriza incompleta, cai pro pool
  inteiro se todas já feitas); resposta certa credita XP/moeda via `completeQuest`, igual a
  responder numa escolinha.
- [ ] **Posto de abastecimento do foguete (matemática)** — landmark perto da plataforma de
  lançamento; mesmo mecanismo, tipo `matematica`.
- [ ] **Placa decifrável (leitura)** — landmark novo; mesmo mecanismo, tipo `leitura`.
- [ ] Erro nunca pune — reaproveita o `QuestModal` já existente, que já só dá feedback ("Quase!
  Tente outra opção") e deixa tentar de novo, sem penalidade nenhuma.
- [ ] Eventos novos de analytics: `learning_challenge_started` (ao abrir o desafio, antes de
  responder) e `learning_challenge_completed` (na resposta certa) — nomes exatos citados pelo
  documento —, ambos com `meta.kind` identificando o landmark (`bridge`/`rocket_fuel`/`plaque`,
  allowlist fixa em `server-accounts/src/domain.ts`, mesmo padrão de `PLANET_INTERACTION_KINDS` do
  lab-179).
- [ ] `retry_without_quit_rate` citado pelo documento como métrica esperada é uma métrica DERIVADA
  (proporção de `learning_challenge_started` que eventualmente vira `learning_challenge_completed`
  pelo mesmo dispositivo, sem desistir) — não existe um evento próprio pra "tentativa errada" além
  do feedback visual já existente no `QuestModal`, então essa taxa se calcula comparando os dois
  eventos acima numa consulta, mesmo espírito de outras métricas "aproximadas" já documentadas em
  `docs/event-catalog.md` (ex.: `weeklyFunnel.houseVisited`). Documentar isso no
  `docs/event-catalog.md` deste lab, não construir um evento novo só pra essa taxa.
- [ ] `docs/event-catalog.md` atualizado com as 2 linhas novas.
- [ ] Testes novos em `server-accounts` (allowlist de `kind`) se alguma função pura nova for
  criada — avaliar durante a implementação; é possível que não precise de função pura nova além da
  allowlist (mesmo caso de `isValidPlanetInteractionKind`).

## Fora de escopo (explicitamente adiado)

- "Abrir portas por padrões" (4º tema do documento) — não conta pro critério de aceite (só pede 3),
  fica pra um lab futuro se o usuário priorizar.
- IA generativa de conteúdo, dificuldade adaptativa complexa — explicitamente fora de escopo no
  próprio documento.
- Substituir os quizzes existentes (escolinhas continuam existindo do jeito que são) — os
  landmarks são um caminho ADICIONAL pra responder o mesmo tipo de pergunta, não uma migração.
