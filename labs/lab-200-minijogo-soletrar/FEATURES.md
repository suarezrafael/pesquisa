# Laboratório 200 — Mini-jogo de soletrar e leitura

Status: em andamento
Início: 2026-09-19
Fim: -
Commit inicial: f5bf4f94028d99b9a81e89d63070ec53546fecf3

## Objetivo do laboratório

Entregar o segundo mini-jogo "de verdade" sobre o template de arena generalizado no lab-199 (Contar
foi o primeiro) — provar de vez o critério de aceite do lab-213 ("adicionar outro mini-jogo exige
poucos pontos de código") com uma arena de soletrar/leitura: coletar letras flutuantes na ordem
certa pra formar uma palavra de um catálogo controlado.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 215 - Mini-jogo de soletrar e leitura" —
próximo item depois do lab-199 (Lab 214, mini-jogo de contar).

## Investigação prévia

- **Template já generalizado no lab-199**: `ArenaId`/`ArenaConfig`/`arenaConfigs`,
  `beginArenaCountdown`/`tickArenaTimer`/`exitActiveArena`, `arenaTargetPositions`/
  `arenaTargetInteract`/`arenaTargetHintLabels`, helper `arenaTargetTriggerPos` — Soletrar só
  precisa de um módulo de domínio puro novo + um objeto de config + os alvos 3D dele, sem tocar no
  controlador genérico (a menos que um achado real exija — ver abaixo).
- **Backlog é explícito**: "sem texto livre digitado pela criança no primeiro lab", "letras
  físicas/flutuantes", "montar na ordem correta", "erro mostra dica sem punição", "palavra-alvo por
  imagem/contexto" (pareia cada palavra com uma dica visual/emoji), "funciona em mobile" (já coberto
  pela interação de proximidade + tecla `E` reaproveitada de toda a arena — sem código novo de
  toque, o botão de ação móvel já existente cobre isso).
- **Decisão de design (sem necessidade de perguntar ao usuário — segue precedente direto dos labs
  198/199, não um fork de arquitetura)**: 1 palavra por tentativa (não várias rodadas como Contar);
  sem cronômetro (`timeLimitS: null`, mesmo raciocínio do Contar: "erro sem punição" não combina com
  pressão de tempo); recompensa real ao completar (`onCollectCoin`, mesmo padrão do Contar — Lab 215
  é o próprio lab dedicado ao mini-jogo, não uma prova de conceito genérica, mesma lógica já usada
  no lab-199 pra justificar recompensa real).
- **Letras repetidas na mesma palavra** (ex.: nenhuma no catálogo escolhido, mas o módulo de domínio
  trata o caso corretamente de qualquer forma): cada "azulejo" de letra tem uma identidade estável
  (`id`, mesma convenção de `MemoryCard.id`) separada da posição visual (embaralhada) — combinar por
  LETRA (não por `id`) contra a próxima letra esperada da palavra, já que a criança não tem como
  distinguir visualmente duas letras iguais.
- **Achado de design ANTES de escrever código** (evita repetir a limpeza tardia de hint labels do
  lab-199): como o número de azulejos varia por palavra (3-6 letras, catálogo de tamanho fixo de
  slots pra caber a maior palavra), o loop genérico de dica "Pressione E" (por distância, no
  controlador do lab-199) precisaria mostrar a dica em cima de um slot de azulejo DESABILITADO
  (palavra mais curta que o pool) se nada verificasse se aquele alvo está mesmo ativo nesta rodada —
  memória/contar nunca bateram nesse caso porque os dois sempre usam TODOS os slots do pool a cada
  rodada. Corrigido generalizando o próprio controlador: um novo registro `arenaTargetMeshes` (malha
  de cada alvo) permite ao loop de dica pular alvos com `mesh.isEnabled() === false`, benefício que
  vale pra qualquer arena futura com contagem de alvos variável, não só Soletrar.

## Funcionalidades planejadas

- [ ] Módulo de domínio puro `state/spellingGame.ts` (+ testes): catálogo controlado de palavras
  curtas e seguras com dica emoji (`SPELLING_WORD_CATALOG`), sorteia uma por tentativa
  (`random` injetável, mesmo padrão de `createMemoryGame`/`createCountingGame`), embaralha os
  azulejos de letra (posição visual) sem afetar a ordem exigida pra soletrar; `collectSpellingTile`
  confere se a letra do azulejo é a PRÓXIMA esperada (por letra, não por posição/id — trata letras
  repetidas corretamente); errar não perde progresso; `isSpellingGameComplete`;
  `spellingProgressText` (ex.: "G A _ _") pra exibir progresso sem vazar a resposta completa.
- [ ] Generalização mínima do controlador (`arenaTargetMeshes`, novo): loop de dica "Pressione E"
  ignora alvos com a malha desabilitada — necessário pra Soletrar (nº de azulejos variável por
  palavra), sem quebrar memória/contar (sempre usam todos os slots, comportamento idêntico de
  antes).
- [ ] Portal "Soletrar" desbloqueado no centro de jogos: interagir sorteia uma palavra, revela até 6
  azulejos de letra (pool fixo, só os da palavra atual ficam ativos) + uma placa de status com a
  dica emoji e o progresso ("🐱 G A _ _"). Coletar (proximidade + `E`) na ordem certa avança; letra
  errada mostra feedback sem penalidade.
- [ ] Recompensa real ao completar: mesmo padrão de `COUNTING_REWARD_COINS`/`onCollectCoin` do
  lab-199.
- [ ] Eventos comuns do template (`minigame_started/completed/retried/exited`, `minigameId:
  'soletrar'` — mesmo id do portal) — adicionar `'soletrar'` ao allowlist server-side
  (`isValidMinigameId`) desde o primeiro commit.
- [ ] Verificar ao vivo se o ambiente de automação permitir (nas 2 labs anteriores travou em
  `document.hidden`); documentar e confiar em `tsc`/testes/build + leitura de código se não permitir,
  mesmo processo já usado nos labs 198/199.

## Fora de escopo (explicitamente adiado)

- Entrada de texto livre, correção ortográfica aberta, IA generativa, chat (excluídos
  explicitamente pelo próprio item do backlog).
- Múltiplas palavras por tentativa / dificuldade progressiva por nível.
- Variações temáticas por planeta (catálogo único nesta fatia).
- Mini-jogo de memória/padrões (lab-201/Lab 216) e progressão/álbum do centro de jogos (Lab 217).
