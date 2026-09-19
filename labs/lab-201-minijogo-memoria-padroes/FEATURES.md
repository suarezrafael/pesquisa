# Laboratório 201 — Mini-jogo de memória e padrões

Status: em andamento
Início: 2026-09-19
Fim: -
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

- [ ] Módulo de domínio puro `state/patternGame.ts` (+ testes): sequência cresce 1 posição por
  rodada (começa em 3), errar repete a MESMA rodada sem perder progresso, `isPatternGameComplete`
  após `PATTERN_ROUNDS_TO_WIN` rodadas seguidas.
- [ ] Memória "cartas" polida: grade de até 12 cartas (6 pares, 3 colunas x 4 linhas — mesma
  largura já comprovada, só mais fundo), catálogo de temas (símbolos sorteados por tentativa),
  nível de dificuldade que sobe a cada vitória (3→6 pares), recompensa real ao completar
  (`onCollectCoin`, mesmo padrão de Contar/Soletrar), sem cronômetro.
- [ ] Memória "sequência" (novo, mesmo portal): sorteio 50/50 por tentativa entre cartas/sequência;
  4 luzes/pods coloridos no mesmo ponto de ancoragem das cartas (nunca visíveis ao mesmo tempo);
  reproduz a sequência (acender uma a uma) antes de liberar a vez do jogador; repetir na ordem certa
  avança rodada; recompensa real ao completar as `PATTERN_ROUNDS_TO_WIN` rodadas.
- [ ] Eventos comuns do template continuam reaproveitando `minigameId: 'memoria'` pros dois modos —
  nenhuma mudança de allowlist server-side necessária (id já existe desde o lab-198).
- [ ] Verificar ao vivo se o ambiente de automação permitir (travou nas 3 labs anteriores em
  `document.hidden`); documentar e confiar em `tsc`/testes/build + leitura de código se não
  permitir, mesmo processo dos labs 198-200.

## Fora de escopo (explicitamente adiado)

- Som (o backlog cita "luzes/sons" — esta fatia cobre só o feedback visual, mesma contenção de v1
  já aplicada nos labs 199/200, que também não adicionaram efeitos sonoros novos).
- Dificuldade progressiva persistida ENTRE sessões (reseta ao sair da arena, não é um perfil salvo).
- Progresso/álbum/troféus do centro de jogos (Lab 217).
- Multiplayer, ranking global, recompensas pagas (excluídos pelo próprio item do backlog).
