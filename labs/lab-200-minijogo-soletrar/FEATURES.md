# Laboratório 200 — Mini-jogo de soletrar e leitura

Status: concluído
Início: 2026-09-19
Fim: 2026-09-19
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

- [x] Módulo de domínio puro `state/spellingGame.ts` (+ `spellingGame.test.ts`, 9 testes): catálogo
  controlado de 8 palavras curtas e seguras com dica emoji (`SPELLING_WORD_CATALOG`), sorteia uma
  por tentativa (`random` injetável, mesmo padrão de `createMemoryGame`/`createCountingGame`),
  embaralha os azulejos de letra (posição visual) sem afetar a ordem exigida pra soletrar;
  `collectSpellingTile` confere se a letra do azulejo é a PRÓXIMA esperada (por letra, não por
  posição/id — teste dedicado com uma palavra sintética de letra repetida, já que o catálogo real
  não tem nenhuma); errar não perde progresso; `isSpellingGameComplete`; `spellingProgressText`
  (ex.: "G A _ _") pra exibir progresso sem vazar a resposta completa.
- [x] Generalização mínima do controlador (`arenaTargetMeshes`, novo registro): o loop de dica
  "Pressione E" agora pula alvos com a malha desabilitada (`mesh.isEnabled()`) — necessário pra
  Soletrar (nº de azulejos ativos varia 3-6 por palavra); memória/contar continuam se comportando
  exatamente como antes (sempre usam todos os slots do próprio pool).
- [x] Portal "Soletrar" desbloqueado no centro de jogos: interagir sorteia uma palavra, revela até 6
  azulejos de letra numa grade de 3 colunas (mesma forma da grade de cartas de memória, decisão
  tomada durante a implementação pra reduzir risco espacial não verificável ao vivo — ver abaixo) +
  uma placa de status com a dica emoji e o progresso. Coletar (proximidade + `E`) na ordem certa
  avança; letra errada mostra feedback sem penalidade; status inicial já definido no `beginAttempt`
  (não fica preso no "— 0" do fim do countdown, lição já aplicada direto desta vez, achado pelo
  Copilot no lab-199 pra Contar).
- [x] Recompensa real ao completar: `SPELLING_REWARD_COINS` (3), mesmo padrão de
  `COUNTING_REWARD_COINS`/`onCollectCoin` do lab-199.
- [x] Eventos comuns do template (`minigame_started/completed/retried/exited`, `minigameId:
  'soletrar'` — mesmo id do portal) — `'soletrar'` adicionado ao `MINIGAME_IDS`/`isValidMinigameId`
  (server-accounts) desde o primeiro commit.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (3ª vez seguida — mesma limitação exata dos labs 198/199, confirmado com uma aba nova). Documentado
  abaixo; confiado em `tsc`/testes/build + leitura de código, mesmo processo dos labs anteriores.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` do app: 237/237 (+9 de
`spellingGame.test.ts`); `npm run build` sem erros; `server-accounts`: `npx tsc --noEmit` limpo,
`npm run test -- --run` 161/161 (sem teste novo — só um id novo num Set já testado).

Sem poder testar ao vivo, revisei manualmente cada caminho novo:

- **Mapeamento de índice azulejo↔posição-no-array**: `handleSpellingTileInteract(index)` lê
  `arenaSpellingState.tiles[index]` (a posição VISUAL/pool-slot onde a criança interagiu) e passa
  `tile.id` (identidade estável) pra `collectSpellingTile` — o mesmo padrão de duas camadas
  (posição visual embaralhada vs. identidade estável) já usado em `MemoryCard.id`/`flipMemoryCard`.
  Confirmado lendo `renderSpellingRound` (que escreve `gcSpellingTileLabels[i].text =
  tiles[i].letter`, MESMO índice `i`) e `handleSpellingTileInteract` lado a lado — os dois
  concordam sobre o que cada slot pool mostra.
- **Slots do pool além do tamanho da palavra atual**: `renderSpellingRound` desabilita
  explicitamente qualquer slot `i >= tiles.length` (`if (!tile || tile.collected)`); o loop de
  interação genérico ainda itera todos os 6 slots registrados em `arenaTargetPositions.soletrar`
  (não redimensionado por palavra, de propósito — evitar reconstruir o registro a cada tentativa),
  mas `handleSpellingTileInteract` retorna cedo (`if (!tile) return`) pra qualquer índice além do
  comprimento da palavra atual — pressionar `E` perto de um slot vazio não faz nada, só uma checagem
  de distância a mais, sem efeito visível.
- **Achado ANTES de testar (não durante)**: o layout inicial usava uma fileira única de 6 azulejos
  (~3,25 unidades de largura) — quase o dobro da grade de 3 colunas já comprovada das cartas de
  memória (~1,5 unidades). Sem poder confirmar ao vivo que cabe no saguão sem sobrepor a placa
  vizinha, troquei pra uma grade de 3 colunas (mesma fórmula de `MEMORY_CARD_COLUMNS`/
  `MEMORY_CARD_SPACING`, só o material/nome mudam) — reduz o risco espacial a "já testado antes",
  em vez de introduzir uma forma nova sem verificação.
- **Recompensa/eventos**: `trackMinigameCompleted('soletrar')` e o loop de `onCollectCoinRef` só
  disparam dentro do `if (isSpellingGameComplete(state))`, depois de `renderSpellingRound()` já ter
  atualizado os azulejos — mesma ordem de operações do Contar (lab-199), que já passou por 2
  rodadas de review sem achado nessa parte.

**Risco remanescente, honesto**: a posição EXATA da grade de Soletrar dentro do saguão (perto do
próprio portal "Soletrar") não foi confirmada ao vivo — só o raciocínio de que reusar a MESMA forma
já comprovada (grade 3 colunas) reduz bastante a chance de sobreposição, não elimina de vez.

## Fora de escopo (explicitamente adiado)

- Entrada de texto livre, correção ortográfica aberta, IA generativa, chat (excluídos
  explicitamente pelo próprio item do backlog).
- Múltiplas palavras por tentativa / dificuldade progressiva por nível.
- Variações temáticas por planeta (catálogo único nesta fatia).
- Mini-jogo de memória/padrões (lab-201/Lab 216) e progressão/álbum do centro de jogos (Lab 217).
