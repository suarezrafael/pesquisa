# Laboratório 201 — Mini-jogo de memória e padrões

Status: concluído
Início: 2026-09-19
Fim: 2026-09-19
Commit inicial: b5ee32c61cd7dcfa7d832f80d53274f5e9b0e3ee

## Objetivo do laboratório

Fechar a dívida deixada pelo lab-198 (a arena de Memória de 3 pares fixos, sem moedas, foi sempre
uma prova de conceito do template) E entregar a segunda metade do próprio nome do item do backlog
("memória E padrões"): um segundo mini-jogo de repetir sequência (tipo Genius/Simon), decisão
confirmada com o usuário via `AskUserQuestion` (escopo maior, com os dois modos, em vez de só polir
Memória).

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 216 - Mini-jogo de memoria e padroes" —
próximo item depois do lab-200 (Lab 215, soletrar).

## Investigação prévia

- **Dívida do lab-198**: `state/memoryGame.ts` já é genérico o bastante (`createMemoryGame(symbols)`
  aceita qualquer array de símbolos, nenhuma mudança necessária ali) — a arena em `World3D.tsx` é
  quem está fixa em 3 pares/6 cartas/1 tema/sem recompensa/com cronômetro de 45s.
- **Sem portal novo**: o saguão do centro de jogos (lab-197) só tem 4 portais fixos
  (`Contar`/`Soletrar`/`Memória`/`Lógica`), sem slot reservado pra um 5º. Em vez de redesenhar o
  saguão (mudança estrutural bem maior, fora do escopo confirmado), o modo "sequência" vive DENTRO
  do próprio portal/arena "Memória" — cada tentativa sorteia (50/50) entre "cartas" e "sequência",
  os dois contam como `minigameId: 'memoria'` (o backlog já trata os dois como o mesmo tema/lab).
- **Achado de design que resolve o risco espacial de ter 2 conjuntos de alvos numa arena só**:
  cartas e sequência NUNCA ficam visíveis ao mesmo tempo (um sorteio decide qual roda nesta
  tentativa) — os azulejos/pods do modo sequência podem ocupar o MESMO ponto de ancoragem das
  cartas sem risco de colisão visual de verdade (só um dos dois conjuntos está com `setEnabled(true)`
  a qualquer momento). O filtro genérico `mesh.isEnabled()` no loop de dica E de interação (ambos já
  corrigidos no lab-200, achados do Copilot) cobre os dois conjuntos de graça, sem generalizar o
  controlador de novo.
- **Cronômetro removido de Memória (mudança deliberada, não regressão)**: o próprio Lab 216 lista
  "tempo punitivo" em "Fora de escopo" — contradiz o cronômetro de 45s com falha que o lab-198
  criou. Alinha Memória com Contar/Soletrar (nenhum dos dois tem cronômetro) — `timeLimitS: null`.
  Sem cronômetro, nenhuma das duas variantes (cartas ou sequência) alcança mais o estado `fail`; só
  `success` ou abandono (mesmo padrão já estabelecido pelas 2 labs anteriores).
- **Sem punição em sequência**: errar uma tecla no meio da sequência não reinicia a dificuldade —
  só repete a MESMA rodada (mesmo comprimento) até acertar, sem perder o progresso de rodadas já
  ganhas. Sequência "ganha" ao completar `PATTERN_ROUNDS_TO_WIN` rodadas seguidas (dificuldade sobe:
  cada rodada adiciona 1 posição na sequência).
- **Nível de dificuldade de cartas** (persistido só durante a visita ao saguão, não entre sessões):
  começa em `MEMORY_MIN_PAIRS` (3) pares; cada VITÓRIA em modo cartas sobe 1 par (até
  `MEMORY_MAX_PAIRS`, 6); resetado ao sair da arena (`resetState`, mesmo padrão de
  `arenaCountingState`/`arenaSpellingState`). Tema (conjunto de símbolos) sorteado a cada tentativa
  entre um catálogo pequeno (frutas/planetas/pets/números/formas) — cobre o critério "usar temas do
  jogo" do backlog sem precisar de conteúdo novo (reaproveita emoji já usados em outros lugares do
  jogo).
- **Risco espacial do grid de cartas maior (6 pares = 12 cartas, dobro do original)**: em vez de
  crescer em LARGURA (risco de encostar nos portais vizinhos, Contar/Soletrar), a grade cresce só em
  PROFUNDIDADE — continua com as mesmas 3 colunas já comprovadas do lab-198 (`MEMORY_CARD_COLUMNS`
  inalterado), só ganha mais linhas (2→4). Reduz o risco de sobreposição lateral a "já testado
  antes", igual à decisão do lab-200 pro grid de Soletrar.
- **Módulo de domínio puro novo**: `state/patternGame.ts` (sequência de luzes) — mesmo padrão de
  `random` injetável, sem dependência de Babylon.

## Funcionalidades planejadas

- [x] Módulo de domínio puro `state/patternGame.ts` (+ `patternGame.test.ts`, 6 testes): sequência
  cresce 1 posição por rodada (começa em 3), errar repete a MESMA rodada sem perder progresso,
  `isPatternGameComplete` após `PATTERN_ROUNDS_TO_WIN` (5) rodadas seguidas. Achado escrevendo o
  próprio teste (antes de rodar, não um bug de produção): um loop de teste que reavaliava
  `state.sequence.length` a cada iteração rodava um aperto extra na rodada NOVA assim que a
  sequência crescia — corrigido travando o comprimento da rodada ANTES do loop.
- [x] Memória "cartas" polida: grade de até 12 cartas (6 pares, 3 colunas x 4 linhas — mesma
  largura já comprovada do lab-198, só mais fundo), catálogo de 5 temas (frutas/planetas/pets/
  números/formas, sorteado por tentativa), nível de dificuldade que sobe a cada vitória (3→6
  pares, reseta ao sair da arena), recompensa real ao completar (`onCollectCoin`, mesmo padrão de
  Contar/Soletrar), sem cronômetro.
- [x] Memória "sequência" (novo, mesmo portal): sorteio 50/50 por tentativa entre cartas/sequência;
  4 pods coloridos no MESMO ponto de ancoragem das cartas (nunca visíveis ao mesmo tempo);
  reproduz a sequência (acende uma posição de cada vez) antes de liberar a vez do jogador; errar
  não perde rodadas ganhas, só repete a sequência atual; recompensa real ao completar as
  `PATTERN_ROUNDS_TO_WIN` rodadas.
- [x] Eventos comuns do template continuam reaproveitando `minigameId: 'memoria'` pros dois modos —
  nenhuma mudança de allowlist server-side necessária (id já existe desde o lab-198;
  `server-accounts` 161/161, sem teste novo).
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (4ª lab seguida — mesma limitação exata, confirmado com uma aba nova). Documentado abaixo;
  confiado em `tsc`/testes/build + leitura de código, mesmo processo dos labs 198-200. Achei e
  corrigi 2 bugs reais nessa própria revisão de código, ANTES de qualquer review externo (ver
  "Verificação de código" abaixo).

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` do app: 243/243 (+6 de
`patternGame.test.ts`); `npm run build` sem erros; `server-accounts`: `npx tsc --noEmit` limpo,
`npm run test -- --run` 161/161 (sem mudança — `'memoria'` já estava na allowlist desde o lab-198).

Sem poder testar ao vivo, revisei manualmente cada caminho novo — 2 bugs reais encontrados e
corrigidos NESTA PRÓPRIA revisão (antes de qualquer review externo):

1. **`sequencePlaybackTimeout` não era cancelado no `teardown` principal de `World3D`** — exatamente
   a mesma classe de bug que o Copilot achou no lab-198 pra `arenaCountdownTimeout`/
   `arenaTimerInterval` (já corrigida ali), só que eu esqueci de estender a correção pro handle NOVO
   desta lab. Sem isto, desmontar `World3D` com uma reprodução de sequência pendente deixaria o
   `setTimeout` disparar depois, mexendo em materiais/malhas já descartados por `scene.dispose()`.
   Corrigido adicionando ao mesmo bloco de limpeza.
2. **Um segundo handle solto (`patternPressFlashTimeout`, o "flash" de confirmação ao tocar um pod)
   tinha o mesmo risco** — era um `setTimeout` bruto, não rastreado em nenhuma variável, então nem
   `resetState` nem o `teardown` principal conseguiam cancelá-lo. Corrigido dando a ele seu próprio
   handle rastreado, limpo nos mesmos dois lugares que `sequencePlaybackTimeout`.

Outros pontos conferidos por leitura:

- **Despacho de índice combinado** (`handleMemoryArenaInteract`): cartas ocupam os índices
  `0..MEMORY_CARD_COUNT-1` (12), pods vêm logo depois (`MEMORY_CARD_COUNT..MEMORY_CARD_COUNT+3`) —
  conferido que `arenaTargetPositions.memoria`/`arenaTargetHintLabels.memoria`/
  `arenaTargetMeshes.memoria` (todos `[...cartas, ...pods]`, nessa ordem) usam a MESMA convenção de
  offset que o dispatcher espera.
- **Nível de dificuldade não deixa cartas "fantasma" visíveis**: `setMemoryCardsVisible` calcula
  `activeCount = memoriaLevel * 2` toda vez que é chamada (não guarda um valor antigo) — chamar com
  `visible=false` desabilita os 12 slots incondicionalmente (curto-circuito do `&&`), então não há
  como um nível antigo deixar cartas extras visíveis ao esconder tudo.
- **`resetState` cobre os dois modos**: zera `arenaMemoryState` E `arenaPatternState` juntos,
  independente de qual estava ativo — não deixa o modo NÃO jogado nesta tentativa com lixo de uma
  tentativa anterior (mesmo que, na prática, cada `beginAttempt` já sobrescreva o estado do modo
  escolhido de qualquer forma).

**Risco remanescente, honesto**: a grade de cartas cresceu de 2 pra 4 linhas (dobro da profundidade
original do lab-198) — mantive a mesma LARGURA (3 colunas, já comprovada), só estendi profundidade,
mas essa extensão em si não foi confirmada ao vivo nesta sessão. Os pods de sequência reaproveitam o
mesmo ponto de ancoragem das cartas (risco zero de sobreposição NOVA, já que os dois conjuntos nunca
ficam habilitados ao mesmo tempo).

## Fora de escopo (explicitamente adiado)

- Som (o backlog cita "luzes/sons" — esta fatia cobre só o feedback visual, mesma contenção de v1
  já aplicada nos labs 199/200, que também não adicionaram efeitos sonoros novos).
- Dificuldade progressiva persistida ENTRE sessões (reseta ao sair da arena, não é um perfil salvo).
- Progresso/álbum/troféus do centro de jogos (Lab 217).
- Multiplayer, ranking global, recompensas pagas (excluídos pelo próprio item do backlog).
