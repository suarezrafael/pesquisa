# Contexto — Laboratório 252 — Alternativas embaralhadas nas perguntas

Preenchido em: 2026-10-03
Commit inicial → final: d620866223710233b8593ea72dc638185b59e3bb..(ver PR)

## O que foi feito

- `app/src/state/questChoiceOrder.ts`: nova função pura `shuffleQuestChoices(choices, random)`
  (Fisher-Yates), fonte de aleatoriedade injetável (default `Math.random`, mesmo padrão já usado
  em `logicGame.ts` desde o lab-251) — copia o array de alternativas, nunca muta o original.
- `app/src/components/QuestModal.tsx`: `orderedChoices = useMemo(() => shuffleQuestChoices(quest.
  choices), [quest.choices])` substitui `quest.choices` na renderização das opções. A validação
  de resposta continua comparando `choice.id` contra `quest.correctChoiceId` — a ordem visual
  nunca influencia a lógica de acerto/erro/recompensa.
- `app/src/state/questChoiceOrder.test.ts`: prova que a resposta certa pode cair nas 3 posições
  (controlando a fonte aleatória) e que o catálogo original (`planetQuests.mercurio[0].choices`)
  nunca é mutado.
- `app/src/components/QuestModal.test.tsx`: testes existentes adaptados de seleção por ÍNDICE
  fixo (`.quest-choice`[0]/[1]) para seleção por IDENTIDADE (procurar o botão cujo texto bate com
  o `label` do `correctChoiceId`) — a ordem agora é aleatória, então um índice fixo não identifica
  mais "a resposta certa" nem "uma errada". Teste novo confirma que uma pergunta de planeta
  (catálogo onde 35/36 respostas certas ficavam na posição 1) ainda é respondida corretamente
  depois da reordenação.
- `app/src/components/ModalInitialFocus.test.tsx`: mesmo ajuste de índice-fixo para
  identidade-por-texto no teste de foco inicial.

## Achado que motivou o lab (confirmado de novo nesta sessão)

Contei de novo, independente do que o `FEATURES.md` já afirmava: 35 das 36 perguntas em
`app/src/data/planetQuests.ts` têm `choices[0].id === correctChoiceId`. Qualquer criança (ou
adulto) that notasse esse padrão podia resolver a escolinha de qualquer planeta sem ler a
pergunta — sempre clicando a primeira opção. Isso contraria o próprio propósito educativo do
catálogo.

## Decisões técnicas tomadas

- **Embaralhar no componente de apresentação (`QuestModal.tsx`), não no catálogo de dados.** A
  ordem visual é preocupação de apresentação; `quest.choices`/`correctChoiceId` continuam sendo a
  fonte de verdade do domínio, intocados — mesma separação já estabelecida pra outras regras de
  jogo (`docs/prompts/03-arquitetura-sistema.md` §1).
- **`useMemo` com `quest.choices` como dependência, não um `useEffect`/estado próprio.** Isso
  reaproveita de propósito o fix dos labs 246/247: cada chamador de `QuestModal` agora é
  remontado por `key` a cada NOVA tentativa (attemptId ou `quest.id`), então um `useMemo` keyed em
  `quest.choices` recalcula exatamente uma vez por tentativa — estável durante toda a pergunta
  aberta (re-renders de `selectedId`/`feedback` não recalculam), e uma ordem nova a cada reabertura
  genuína. Sem o fix anterior, a mesma instância reaproveitada entre tentativas teria preso a
  ordem embaralhada da tentativa antiga — essa dependência entre os labs está documentada aqui
  para quem for tocar em qualquer um dos dois de novo.
- **Fisher-Yates com fonte injetável, não `Array.sort(() => Math.random() - 0.5)`.** O `sort`
  com comparador aleatório é um viés conhecido (não produz distribuição uniforme); Fisher-Yates
  é correto e já é o padrão estabelecido em `logicGame.ts` (lab-251) — reaproveitar a mesma técnica
  em vez de inventar outra.

## Pendências / dívidas conhecidas

- Lab 240 (validação física no Redmi Pad 2) continua aberto — não testado aqui.
- Nenhuma outra fonte de "atalho de posição" foi auditada neste lab além de `planetQuests.ts`
  (que motivou o lab) — `quests.ts` (escolinhas principais) e o catálogo de Lógica (já corrigido
  no lab-251) não foram recontados; se um padrão parecido for suspeitado em outro catálogo,
  contar de novo antes de assumir.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — as 3 funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

- Lab 240 (validação física no Redmi Pad 2) continua sendo a prioridade maior se houver
  dispositivo disponível.
- Sem dispositivo: auditar `quests.ts` (as missões principais das escolinhas, catálogo distinto
  de `planetQuests.ts`) pra confirmar se tem o mesmo padrão de posição fixa — só vale a pena se
  alguém contar de verdade primeiro, não assumir.

## Estado do repositório ao final

- Branch: `lab-252-alternativas-embaralhadas`.
- Suite: 371/371 (36 arquivos, 3 testes novos: 2 em `questChoiceOrder.test.ts`, 1 em
  `QuestModal.test.tsx`). Lint: zero avisos. Build: TypeScript + Vite + PWA sem erro novo (mesmo
  aviso preexistente de chunk >500kB).
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
