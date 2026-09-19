# Laboratório 199 — Mini-jogo de contar e quantidade

Status: concluído
Início: 2026-09-19
Fim: 2026-09-19
Commit inicial: b93f21f9d42128a8f000cfe4c618c097cb807711

## Objetivo do laboratório

Entregar o primeiro mini-jogo "de verdade" de matemática inicial (contar quantidade) sobre o
template de arena criado no lab-198, e — decisão confirmada com o usuário via `AskUserQuestion`
antes de começar — generalizar de fato a máquina de estado da arena (hoje só com NOMES genéricos,
mas implementação colada à memória) antes de repetir o padrão pela 3ª vez no lab-215 (soletrar).

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 214 - Mini-jogo de contar e quantidade" —
próximo item depois do lab-198 (Lab 213, template de arena).

## Investigação prévia

- **Estado real do "template" do lab-198**: `arenaPhase`/`arenaSecondsLeft` (closure de `World3D.tsx`,
  ~linha 3513) são os únicos nomes genéricos — todo o resto (`arenaMemoryState`,
  `gameCenterMemoryStatusLabel`, `beginMemoryArenaCountdown`, `tickPlayingTimer`,
  `handleMemoryCardInteract`, `MEMORY_TIME_LIMIT_S`) é específico da memória. Só existe UMA arena
  ativa por vez no centro de jogos (não há índice por tipo de jogo). O critério de aceite do
  lab-213 ("adicionar outro mini-jogo exige poucos pontos de código") nunca foi testado de verdade
  até agora.
- **Achado Alto do review do Copilot no lab-198** (`gcMemoryCardPos` usava a posição da carta em
  nível do chão, mas `avatarMesh.position` fica sempre elevado — gap vertical sozinho excedia o
  raio de gatilho): risco real de se repetir em qualquer novo alvo interativo se cada mini-jogo
  reimplementar o cálculo de posição de gatilho do zero. Vira parte da generalização: um helper
  único que sempre usa a posição JÁ ELEVADA da malha.
- **Backlog do Lab 214 é explícito**: "sem tempo punitivo" nos critérios de aceite — logo, ao
  contrário da memória (cronômetro de 45s com falha), a arena de contar não deve ter cronômetro
  nenhum (`timeLimitS: null` na config genérica).
- **Recompensa real**: lab-198 adiou recompensa persistida (moeda/XP) pra memória explicitamente
  pro lab-216 (lab dedicado à polida de memória). O Lab 214 do backlog já É o lab dedicado ao
  mini-jogo de contar (não uma prova de conceito genérica) e seu próprio critério de aceite pede
  "ganha XP/moedas/badge grátis" — então esta fatia conecta a uma recompensa real, via
  `onCollectCoin` (prop já existente em `World3DProps`, mesmo padrão usado em `MARS_COIN_POT_REWARD`
  — várias chamadas em sequência, sem prop nova).
- **Padrão de módulo de domínio puro**: `state/memoryGame.ts` (lab-198) é o modelo a seguir —
  `state/countingGame.ts` fica igualmente puro/testável sem Babylon.

## Decisão de escopo (confirmada com o usuário)

Duas opções levantadas: (a) generalizar agora a máquina de estado da arena (extrair um pequeno
controlador reutilizável a partir do código da memória, migrar a memória pra usá-lo, e construir
Contar em cima dele); ou (b) duplicar por agora uma segunda máquina de estado só pra Contar,
adiando a generalização de verdade pro lab-215/216. Usuário escolheu (a) — maior mexida nesta
fatia, mas evita repetir o padrão memória-colado uma 3ª vez e prova de verdade o critério de
aceite do lab-213.

## Funcionalidades planejadas

- [x] Generalizar o controlador de arena em `World3D.tsx`: `type ArenaId = 'memoria' | 'contar'`
  (nota: usa `'contar'`, não `'contagem'` como rascunhado acima — mesmo id já usado pelo portal
  `GameCenterPortalId`/`GAME_CENTER_PORTAL_IDS`, evita inventar um segundo sinônimo pro mesmo
  conceito), `activeArenaId`, uma `ArenaConfig` por arena (label/emoji, `timeLimitS: number | null`,
  `statusLabel`, `setTargetsVisible`, `beginAttempt`, `resetState`, `onTimeout?`),
  `beginArenaCountdown(id, isRetry)`/`tickArenaTimer()`/`exitActiveArena()` genéricos operando
  sobre `arenaPhase`/`arenaSecondsLeft` (já compartilhados). Memória migrada pra usar o controlador
  (mesmo comportamento visível de antes — `state/memoryGame.ts` não mudou).
- [x] Helper genérico de posição de gatilho (`arenaTargetTriggerPos`) que sempre usa a posição já
  elevada da malha (`gameCenterInteriorRootNode.position.add(mesh.position)`), nunca uma posição em
  nível do chão calculada à parte. `gcMemoryCardPos` e as 3 placas de Contar (`gcCountingOptionPos`)
  usam o mesmo helper.
- [x] Módulo de domínio puro `state/countingGame.ts` (+ `countingGame.test.ts`, 7 testes): gera uma
  rodada (quantidade-alvo 2-6 + 3 opções únicas incluindo a certa — as 2 opções erradas vêm de um
  pool de tamanho fixo embaralhado, não de sorteio repetido, pra nunca travar mesmo com um `random`
  constante), confere resposta, 3 rodadas corretas seguidas (`COUNTING_ROUNDS_TO_WIN`) = jogo
  completo; errar não perde progresso (mesma rodada continua, só o texto de status muda).
- [x] Portal "Contar" desbloqueado no centro de jogos: interagir revela até 6 estrelas decorativas
  (não-interativas — nenhuma malha clicável nem `TextBlock` vinculado, então nada a "vazar" quando
  escondidas) + 3 placas de resposta interativas (mesma interação de proximidade + tecla `E` das
  cartas de memória). Sem cronômetro/estado de falha por tempo (`timeLimitS: null`).
- [x] Recompensa real ao completar: `COUNTING_REWARD_COINS` (3) chamadas de `onCollectCoin()` em
  sequência, mesmo padrão de `MARS_COIN_POT_REWARD`, sem prop nova.
- [x] Eventos comuns do template (`minigame_started/completed/retried/exited`, `minigameId:
  'contar'`) — `'contar'` adicionado ao `MINIGAME_IDS`/`isValidMinigameId` (server-accounts) desde
  o primeiro commit.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (mesma limitação já vista no lab-198 — confirmado com uma aba NOVA, ainda assim travado) antes de
  sair da tela título, sem sequer chegar a montar o mundo 3D — não deu nem pra reproduzir a sessão
  de teste do lab-198 (que ao menos chegou a mover o avatar). Documentado abaixo; confiado em
  `tsc`/testes/build + uma leitura de código linha a linha da lógica nova (ver "Verificação de
  código" abaixo), mesmo processo já usado pra fechar a 2ª rodada de review do lab-198.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run` do app: 228/228 (+7 de
`countingGame.test.ts`); `npm run build` sem erros; `server-accounts`: `npx tsc --noEmit` limpo,
`npm run test -- --run` 161/161 (sem teste novo — só um id novo num Set já testado).

Sem poder testar ao vivo, revisei manualmente cada caminho da generalização, com atenção especial a
um risco que o próprio design introduziu (não existia no lab-198, que só tinha UMA arena):

- **Trocar de arena sem sair do saguão não deve contar como "retentativa" da nova arena.** Terminar
  a memória (`arenaPhase = 'success'`, `activeArenaId = 'memoria'`) e ir direto pra placa de Contar
  tem que iniciar uma tentativa NOVA (`isRetry = false`), não confundir com "tentar de novo a mesma
  arena". `handleGameCenterPortalInteract` decide isso comparando `activeArenaId !== id` (arena
  diferente) antes de checar `success`/`fail` — só conta como retry quando `activeArenaId === id`.
  Tracejado à mão pros 4 casos possíveis (idle; mesma arena success/fail; arena diferente
  success/fail; qualquer arena em countdown/playing) — todos batem com o comportamento esperado.
- **Label de status da arena ANTERIOR não pode ficar preso na tela ao trocar de arena.** Cada arena
  tem seu próprio `TextBlock` de status (vinculado ao próprio conjunto de alvos); o loop de render
  só atualiza a alpha do label da arena ATIVA. Sem limpeza explícita, terminar a memória e começar
  Contar deixaria "🎉 Você venceu!" (memória) congelado e visível pra sempre perto das cartas.
  `beginArenaCountdown` limpa a arena anterior (`setTargetsVisible(false)` + `statusLabel.alpha = 0`)
  antes de ativar a nova, quando `activeArenaId` está mudando.
- **`exitActiveArena` (chamado só ao sair do saguão) vs. a limpeza inline em `beginArenaCountdown`
  (chamada ao trocar de arena) são intencionalmente DIFERENTES** — a de troca não reseta
  `arenaPhase`/dispara `minigame_exited`, porque a arena nova já está prestes a começar (não é um
  abandono de verdade). Comentário corrigido no código pra não sugerir que são a mesma função (achado
  nesta própria revisão, antes de qualquer teste).
- **Achado Alto do Copilot no lab-198 (gap vertical entre altura do avatar e altura do alvo) não se
  repete**: `arenaTargetTriggerPos` sempre usa a posição já elevada da malha
  (`gameCenterInteriorRootNode.position.add(mesh.position)`), usado tanto pelas cartas de memória
  quanto pelas placas de Contar — matematicamente equivalente ao jeito que o lab-198 corrigiu depois
  do review, mas agora é o único caminho possível (não dá pra um mini-jogo futuro reintroduzir o
  mesmo bug calculando a posição de outro jeito, a não ser que ignore o helper de propósito).
- **Mapeamento de índice das placas de resposta**: `handleCountingOptionInteract(index)` lê
  `arenaCountingState.round.options[index]` como "o número mostrado nesta placa"; `renderCountingRound`
  escreve `gcCountingOptionLabels[i].text = String(options[i])` com o MESMO índice — os dois usam a
  mesma correspondência posição-na-fileira ↔ posição-no-array de opções, confirmado lendo os dois
  lados lado a lado.

## Rodada de review — Copilot (PR #82)

2 achados, ambos confirmados contra o código real e corrigidos:

1. **Médio — status da arena Contar ficava congelado em "🔢 Contar — 0"**: sem cronômetro
   (`timeLimitS: null`), nada reescrevia o texto do `statusLabel` depois do fim do countdown — na
   memória isso nunca aparecia porque `tickArenaTimer` sobrescreve o texto 1s depois (com
   "⏱️ 44s"), mas Contar não tem `tickArenaTimer` rodando. Corrigido: `beginAttempt` de Contar agora
   define um texto de instrução ("🔢 Conte as estrelas e escolha a placa certa!") assim que a
   tentativa começa — no lugar certo, já que é comportamento específico de arenas sem cronômetro,
   não do controlador genérico.
2. **Baixo — limpeza de hint labels ainda com uma lista fixa por arena**: o `else` que esconde as
   dicas "Pressione E" fora do estado `playing` percorria `gcMemoryCardHintLabel`/
   `gcCountingOptionHintLabel` na mão — quebra a promessa do template genérico (um mini-jogo novo
   exigiria lembrar de editar esse bloco também). Corrigido percorrendo `arenaTargetHintLabels`
   (já populado por cada arena) genericamente, sem conhecer os arrays específicos.

`npx tsc -b`, `npm run test -- --run` (228/228) e `npm run build` continuam limpos depois das duas
correções.

**2ª rodada (commit `e2cdd27`)**: os 2 achados acima aparecem marcados "Resolved since last
review". 2 achados novos, ambos confirmados contra o código real e corrigidos:

3. **Baixo — estado da arena anterior não era resetado ao trocar de arena** (achado sob "Previously
   missed", já existia desde o primeiro commit): a limpeza inline em `beginArenaCountdown` ao
   trocar de arena escondia os alvos/label da anterior, mas não chamava `resetState()` — o estado de
   domínio antigo (`arenaMemoryState`/`arenaCountingState`) ficava vivo no closure sem necessidade
   até alguém reabrir aquela arena. Não é um bug funcional (o próximo `beginAttempt` sobrescreve
   tudo de qualquer forma), mas evita acúmulo desnecessário à toa — corrigido chamando
   `prevConfig?.resetState()` junto do resto da limpeza.
4. **Baixo — `Object.values(arenaTargetHintLabels)` alocava um array novo a cada quadro**: o `else`
   que zera as dicas roda no loop de render (todo quadro fora do estado `playing`), e
   `Object.values` cria um array novo em cada chamada — GC desnecessário num caminho quente.
   Corrigido trocando por `for...in` sobre as chaves do objeto, sem alocação.

`npx tsc -b`, `npm run test -- --run` (228/228) e `npm run build` continuam limpos depois das
correções.

## Fora de escopo (explicitamente adiado)

- Comparar "mais/menos/igual" e sequências numéricas simples (v1 cobre só "contar e escolher o
  total certo"; expandir fica pra uma iteração futura do próprio Lab 214 se o produto pedir).
- Dificuldade progressiva por nível/perfil.
- Retroagir recompensa real pra memória — decisão já tomada no lab-198, fica pro lab-216.
- Mini-jogo de soletrar (lab-215/Lab 215) e progressão/álbum do centro de jogos (lab-217).
- Multiplayer, ranking global, personalização paga da arena (excluídos pelo próprio item do
  backlog desde o lab-213).
