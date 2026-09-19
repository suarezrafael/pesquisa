# Laboratório 198 — Template de arena educativa reutilizável

Status: concluído
Início: 2026-09-19
Fim: 2026-09-19
Commit inicial: d9d10650562d681e7f101697009ff6fcf594c5b5

## Objetivo do laboratório

Criar uma infraestrutura mínima e reutilizável de "arena" (contagem regressiva, estado
`playing/success/fail/retry`, cronômetro opcional, alvos interativos, eventos de analytics comuns)
que os labs 214-216 (Contar/Soletrar/Memória) vão usar depois — sem construir os mini-jogos finais
em si. Prova de conceito: uma versão BEM simples de um deles rodando de verdade sobre o template.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 213 - Template de arena educativa
reutilizável" — próximo item depois do lab-197.

## Decisão de escopo (confirmada com o usuário)

Duas opções levantadas: (a) construir a prova de conceito como uma versão simples de um dos 3
mini-jogos reais, ocupando o portal já existente no centro de jogos (lab-197); ou (b) uma demo
abstrata separada, sem tocar nos 3 portais. Usuário escolheu (a) — reaproveita o portal "Memória"
(atualmente bloqueado/"em breve") com uma versão simples de verdade (poucas cartas, jogo de
memória clássico), em vez de inventar uma demo descartável. Lab-216 (dedicado a Memória) fica livre
pra expandir/polir depois; esta fatia só precisa provar que o template funciona com conteúdo real.

## Investigação prévia

- **Centro de jogos (lab-197)**: 4 placas no saguão (`GAME_CENTER_PORTAL_INFO`, `World3D.tsx`),
  `Memória` hoje com `unlocked: false` e dica "Em breve". Interagir com um portal desbloqueado hoje
  só abre um modal 2D (`onOpenEnvironmentalChallengeRef`, usado pela Lógica) — não serve pra um
  jogo espacial como memória (cartas/alvos no mundo 3D).
- **Contagem regressiva já existente (lab-196)**: `.minigame-countdown-overlay` (`index.css`) +
  `minigamePrompt` (`World3D.tsx`) — genérico o bastante pra reaproveitar visualmente, mas o tipo
  (`'parkour1' | 'ponte-logica'`) e a semântica (sempre TELEPORTA pra outro lugar do planeta) são
  específicos do hub — **decisão**: não estender esse union type pra não arriscar regressão no hub;
  a arena usa seu PRÓPRIO estado de contagem (mesma classe CSS, comportamento mais simples: sem
  teleporte, só entra em modo `playing` no lugar).
- **Decisão de arquitetura — sem sala/interior novo**: em vez de criar um 3º "planetinha de bolso"
  (a casa e o centro de jogos já usam esse padrão, aninhar um terceiro dentro do saguão do centro
  de jogos multiplicaria por 3 toda a lógica de câmera/chuva/pet já condicionada a
  `insideHouseInterior`/`insideGameCenterInterior`, ver comentário na declaração deles) — a arena
  de memória acontece NO PRÓPRIO saguão, perto da placa "Memória": interagir revela um pequeno
  conjunto de cartas ali mesmo, sem teleporte novo. Mantém a fatia pequena (risco do próprio
  backlog: "abstrair cedo demais; mexer demais em `World3D`") e evita uma classe inteira de bug já
  vista nas duas salas existentes.
- **Padrão de módulo de domínio puro**: `state/progression.ts` (+ `.test.ts`) já separa regra de
  jogo de motor 3D, testável sem Babylon (`docs/prompts/03-arquitetura-sistema.md` §1). O template
  de arena e a lógica de memória seguem o mesmo padrão: `state/memoryGame.ts` (lógica de cartas,
  pura) testável isoladamente.

## Funcionalidades planejadas

- [x] Módulo de domínio puro `state/memoryGame.ts` (+ `state/memoryGame.test.ts`, 8 testes): criar
  baralho embaralhado (`random` injetável, mesmo padrão de `selectEnvironmentalChallengeQuest`),
  virar carta, detectar par certo/errado, detectar jogo completo — sem nenhuma dependência de
  Babylon.
- [x] Portal "Memória" desbloqueado no centro de jogos (lab-197): interagir revela 3 pares de
  cartas (placas 3D) perto da placa, com uma contagem regressiva curta (3-2-1) antes de ficarem
  interativas.
- [x] Estado `playing/success/fail/retry`: cronômetro de 45s visível (`gameCenterMemoryStatusLabel`);
  sucesso ao achar todos os pares; falha se o tempo acabar antes; opção de tentar de novo (nova
  contagem + baralho novo) sem sair da arena.
- [x] Cartas interativas por proximidade + tecla `E` (mesmo padrão de interação já usado no resto
  do jogo), com feedback visual (❓ virada/símbolo revelado/escondidas de novo ao terminar).
- [x] Eventos de analytics comuns citados pelo backlog: `minigame_started`/`minigame_completed`
  (já existem, lab-196 — reaproveitados com `minigameId: 'memoria'`) e dois novos,
  `minigame_retried`/`minigame_exited`, com validação server-side (`isValidMinigameId`, ampliado
  pra incluir `'memoria'`) desde o primeiro commit (lição do lab-196/197).
- [x] Verificar ao vivo: entrar no portal Memória mostra as cartas; virar cartas funciona; par
  certo fica marcado; jogo completo mostra sucesso; deixar o tempo acabar mostra falha; "tentar de
  novo" reinicia sem travar câmera/física/labels; sair da arena sem completá-la não deixa nada
  preso (critério de aceite explícito do backlog). Ver "Verificação ao vivo" abaixo — inclui 3
  bugs reais encontrados e corrigidos nessa verificação.

## Verificação ao vivo

Testado no dev server, Chrome automatizado, usando `window.__debugTeleport`/`__debugTeleportExact`,
um `window.fetch` interceptado, e um novo hook de QA (`window.__debugMemoryState`, dev-only —
expõe `arenaPhase`/`arenaSecondsLeft`/`arenaMemoryState` só leitura, necessário porque o baralho é
embaralhado de verdade e não dava pra testar "achar o par certo" às cegas).

**Achado de ferramental (já documentado uma vez no lab-39, redescoberto do zero antes de achar o
comentário antigo)**: teleportar e apertar `E` em sequência via chamadas de ferramenta separadas
(cada uma com uma volta real de rede) intercalava tempo real suficiente pra a física
(`avatarMesh`, atualizada por passos do Havok) divergir visivelmente da malha renderizada
(`__playerFigure.root`, só atualizada em quadros de verdade) — a aba de automação não renderiza
quadro nenhum só esperando, então quando finalmente renderiza, o Havok "recupera o atraso" com um
passo de física grande demais, produzindo uma posição bem diferente da esperada. Sintoma:
`handleInteractPress` via a posição "adiantada" (já fora do raio de gatilho), enquanto qualquer
leitura externa (`__playerFigure`) ainda mostrava a posição "esperada". **Mitigação**: forçar
`scene.render()` várias vezes de forma síncrona (sem `await`/`setTimeout` no meio) logo depois de
cada teleporte, antes de disparar qualquer tecla — resolve de vez, sem exigir tempo real nenhum.

**2 bugs reais encontrados e corrigidos** (mais 1 pista falsa que consumiu boa parte do tempo de
investigação, registrada aqui por honestidade sobre o processo, não porque era um bug de verdade):
1. **"❓" das cartas ficavam visíveis mesmo com a arena `idle`** — `card.setEnabled(false)`
   desabilita a malha, mas o `TextBlock` vinculado via `linkWithMesh` continua projetando a
   posição da malha desabilitada (não "desliga" sozinho). Corrigido: `setMemoryCardsVisible`
   (helper novo) alterna malha E label juntos, chamado nos 4 pontos que antes só mexiam na malha.
2. **Carta próxima ao portal "Lógica" abria o quiz da ponte em vez de virar (real, corrigido)** —
   a carta de índice 2 fica a ~1,57 unidades da placa "Lógica" (vizinha na fileira do saguão),
   dentro de `GAME_CENTER_TRIGGER_DISTANCE` (1.6). Como os PORTAIS eram checados antes das CARTAS
   em `handleInteractPress`, apertar `E` ali sempre abria o quiz, nunca virava a carta. Corrigido
   invertendo a ordem: cartas (só quando `arenaPhase === 'playing'`) são checadas ANTES dos
   portais — seguro porque `MEMORY_CARD_TRIGGER_DISTANCE` (0.4) é bem mais estrito que o raio de
   qualquer portal, então isso nunca "rouba" um aperto de `E` que era de verdade pra um portal
   distante, só resolve o conflito quando as duas zonas coincidem.

**Fluxo completo confirmado, com o `window.fetch` interceptado e `__debugMemoryState` lendo o
estado real**:
- Entrar no saguão → placas mostram estado certo (Contar/Soletrar bloqueadas; Lógica/Memória
  desbloqueadas).
- Interagir com Memória (idle) → contagem 3-2-1 → `playing`, baralho novo, cronômetro em 45s →
  disparou `game_portal_selected`/`minigame_started`.
- Virar as 6 cartas na ordem certa (lida via `__debugMemoryState`) → todos os pares casaram →
  `arenaPhase` virou `success`, mensagem de vitória exibida → disparou `minigame_completed` com
  `{"minigameId":"memoria"}`.
- Interagir com Memória de novo (`success`) → nova contagem, baralho novo → disparou
  `game_portal_selected`/`minigame_started`/`minigame_retried`.
- Sair do saguão (porta interna) NO MEIO de uma tentativa (`playing`, sem terminar) → voltou ao
  planeta → disparou `minigame_exited` (`minigameId: "memoria"`) SEGUIDO de `game_center_returned`,
  na ordem certa.
- Deixar o tempo acabar (esperado passivamente, sem interagir) → `arenaPhase` virou `fail`,
  mensagem de tempo esgotado exibida corretamente.
- Reentrar no saguão depois de sair → arena volta pro estado `idle` limpo (sem cartas nem mensagem
  antiga flutuando) — confirmado visualmente por screenshot.

Câmera/física estáveis em todos os teleports testados. Checagens automatizadas: `npx tsc -b`
limpo; `npm run test` app 221/221 (+8 de `memoryGame.test.ts`); `npm run build` sem erros;
`npm run test` `server-accounts` 161/161 (+1, `isValidMinigameId` cobrindo `'memoria'` e a
allowlist dos 2 eventos novos).

## Fora de escopo (explicitamente adiado)

- Os mini-jogos finais de Contar e Soletrar (labs 214/215) e a versão POLIDA de Memória (lab-216,
  mais pares, temas visuais, dificuldade progressiva) — esta fatia entrega só uma versão simples o
  bastante pra provar o template.
- Multiplayer, ranking global, personalização paga da arena (excluídos explicitamente pelo próprio
  item do backlog).
- Progressão/álbum/recompensas do centro de jogos — Lab 217.
- Recompensa educativa persistida (moeda/XP) por completar a arena — nesta fatia o sucesso é só
  visual/sonoro; conectar a uma recompensa de verdade (`completeQuest`-like) fica pro lab dedicado
  ao mini-jogo (lab-216), quando o conteúdo for polido o bastante pra "valer" uma recompensa.
