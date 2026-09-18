# Laboratório 196 — Hub de mini-jogos e teleport por botão no chão

Status: concluído
Início: 2026-09-18
Fim: 2026-09-18
Commit inicial: 8929e190f40690b534baced611d882aa05e59b0e

## Objetivo do laboratório

Criar uma área física no mundo com pedestais no chão que, ao interagir, levam a criança (com
explicação curta + contagem regressiva) até um mini-jogo já existente, e permitem voltar ao hub
depois — pra ela entender rápido "onde tem jogo" em vez de procurar pelo mundo todo.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 209 - Hub de mini-jogos e teleport por
botão no chão" — próximo item da ordem recomendada depois do lab-195. Prioridade P1.

## Investigação prévia

Lido `labs/CURRENT.md` e a seção "Lab 209" do backlog antes de codar. Investigação de código (fork)
sobre o que já existe pra reaproveitar:

- **Parkours (4 cursos, `World3D.tsx` ~5420-5685)**: sequências de plataformas subindo, genuinamente
  repetíveis (sem gate de conclusão persistido — só as moedas no topo têm uma flag `collected`,
  session-only, não em `progress`). Cada curso tem um vetor `*_ANCHOR_UP` (posição angular na
  esfera do planeta) já definido.
- **Escolinha (quiz de astronomia)**: descartada como candidata — é um gate de UMA VEZ SÓ por
  perfil (`completedPlanetQuestIds`, `progression.ts:307-349`), reabrir exigiria lógica nova de
  reset que foge do escopo de "reaproveitar mini-jogo existente".
- **Missões ambientais (lab-180: ponte/lógica, abastecimento/matemática, placa/leitura,
  `World3D.tsx` ~7956-8134)**: repetíveis por design — cada interação sorteia uma pergunta nova
  (`selectEnvironmentalChallengeQuest`), sem trava no marco físico. Já tem eventos reais
  `learning_challenge_started`/`learning_challenge_completed` (`productAnalytics.ts:211,215`).
- **Teleport seguro (`teleportAvatarTo`, `World3D.tsx:3554-3568`)**: já testado em produção em ≥5
  pontos (pouso de foguete, respawn em Marte, respawn do timer de sobrevivência, saída de carro) —
  desliga a física por um passo, seta posição, força `scene.render()`, zera velocidades, religa a
  física. Risco do backlog ("teleport quebrar câmera/física") já tem mitigação comprovada — só
  reaproveitar, não reinventar.
- **Contagem regressiva**: NÃO existe nada parecido no código — precisa ser construída nova (um
  overlay simples 3-2-1, sem dependência de física).

**Decisão de escopo pros 2 mini-jogos desta fatia inicial**: Parkour 1 (o mais simples/testado) +
a missão ambiental da Ponte (lógica) — ambas comprovadamente repetíveis, ambas com um `*_UP`/`Vector3`
de posição já definido que dá pra reaproveitar direto como alvo do teleport, sem precisar duplicar
coordenadas.

## Funcionalidades planejadas

- [x] Achar um local livre pro hub na superfície do planeta principal, usando o mesmo método de
  varredura de distância angular já documentado no comentário do parkour original (lab-11) —
  verificado, não adivinhado às cegas. `HUB_ANCHOR_UP` (`World3D.tsx:8229`) confirmado ao vivo sem
  sobreposição com Lojinha/parkour original/casa (ver "Verificação ao vivo").
- [x] Construir uma estrutura física pequena do hub: 2 pedestais no chão (parkour + ponte), com
  identidade visual simples (cor/placa) que já indique de longe "aqui tem jogo". Arco decorativo +
  pedestal verde (parkour) + pedestal azul (ponte), `World3D.tsx:8232-8361`.
- [x] Interação nos pedestais (tecla `E`/botão de toque, mesmo padrão já usado no resto do jogo):
  mostra uma explicação curta do mini-jogo, dispara uma contagem regressiva nova (3-2-1), depois
  teleporta (`teleportAvatarTo`) pro início do mini-jogo escolhido. Overlay `.minigame-countdown-*`
  (`index.css`), estado `minigamePrompt` + efeito de tick em `World3D.tsx` (~2643/2716).
- [x] "Voltar ao hub": um gatilho no destino de cada mini-jogo (mesma tecla `E`/toque) que teleporta
  de volta pra posição salva do hub. Pedestais magenta `parkourReturnPedestal`/`bridgeReturnPedestal`
  (`World3D.tsx:8363-8385`).
- [x] Eventos novos `minigame_started`/`minigame_completed` (`meta: { minigameId }`) — adicionados à
  allowlist do Worker (`app/server-accounts/src/domain.ts`) e disparados do client
  (`app/src/productAnalytics.ts`).
  **Divergência do plano original, decidida durante a implementação**: em vez de reaproveitar o
  instante granular de conclusão de cada mini-jogo (coleta da moeda do topo do parkour /
  `learning_challenge_completed` da ponte), `minigame_completed` dispara no pedestal de RETORNO ao
  hub — semântica de "ida e volta pelo hub", não de "terminou o desafio de verdade". Motivo: um
  gatilho único e simétrico (mesmo pedestal serve pra qualquer mini-jogo linkado no futuro) é mais
  simples de manter do que instrumentar o ponto de conclusão de cada mini-jogo individualmente, e o
  objetivo do evento é medir uso agregado do hub (não progresso por perfil — ver "Fora de escopo").
  Documentado como comentário em `productAnalytics.ts`. Custo aceito: uma criança que entra e volta
  sem terminar também conta como "completou" — aceitável pra esta fatia inicial.
- [x] Verificar ao vivo: interagir com os 2 pedestais abre explicação → contagem → teleporta
  corretamente; câmera/física continuam estáveis depois do teleport (sem atravessar chão/travar);
  voltar ao hub funciona dos dois destinos; toque equivalente ao teclado funciona. Ver "Verificação
  ao vivo" abaixo — inclui um bug real encontrado e corrigido nessa verificação.

## Verificação ao vivo

Testado no dev server (`localhost:5190`), Chrome automatizado, usando os helpers de QA já
existentes `window.__debugTeleport`/`__debugTeleportExact` (`World3D.tsx:7626/7650`, só em
`import.meta.env.DEV`) pra ir direto a cada ponto sem depender de navegação manual real por um
planeta esférico grande, e um `window.fetch` interceptado temporariamente (só na sessão do
navegador, não no código do jogo) pra confirmar o corpo exato dos eventos disparados.

- **Posição do hub**: sem sobreposição visual com Lojinha, casa nem o parkour original — folga
  real confirmada por zoom de tela, não só pela distância angular do comentário.
- **Fluxo do parkour** (entrada → contagem → teleport → volta): `minigame_started` disparou com
  `{"minigameId":"parkour1"}`; o retorno teleportou pro hub e disparou `minigame_completed` com o
  mesmo id.
- **Fluxo da ponte** (entrada → contagem → teleport → volta): mesma checagem, `minigameId:
  "ponte-logica"` nos dois eventos.
- **Retorno sem ter entrado**: apertar `E` no pedestal de retorno sem nunca ter usado o de entrada
  (`activeMinigameId` nulo) teleporta de volta ao hub mas NÃO dispara `minigame_completed` —
  confirmado lendo o log de fetch (vazio).
- **Bug real encontrado e corrigido**: o pedestal de retorno da ponte (`BRIDGE_RETURN_UP`) tinha
  sido posicionado a 1,9 unidades de `bridgeSurfacePos` — menor que o mínimo necessário de
  2×`ENV_CHALLENGE_TRIGGER_DISTANCE` (2,6) pra não competir com o gatilho de "alinhar a ponte", que
  vem antes na cadeia `if`/`return` de `handleInteractPress`. Reproduzido ao vivo: parado numa faixa
  de chão entre os dois pedestais, as duas dicas ("Pressione E pra alinhar a ponte" e "...pra voltar
  ao hub") apareciam juntas, e apertar `E` sempre abria o quiz de lógica ("Rodas ou Não") em vez de
  voltar ao hub. Corrigido aumentando o offset pra 3,2 (`World3D.tsx:8377`) — distância real
  reconfirmada em 3,27 depois do fix, testado de novo no mesmo ponto intermediário sem reabrir o
  quiz.
- **Toque equivalente ao teclado**: não testado explicitamente com simulação de toque de tela, mas
  o botão `E` na UI mobile (visível nas capturas de tela quando perto de um gatilho) chama a mesma
  `handleInteractPress` do teclado — mesmo padrão já estabelecido pro resto do jogo, sem lógica
  nova especial pros pedestais do hub.
- **Câmera/física após teleport**: estável nos 4 teleports testados (2 idas + 2 voltas) — sem
  atravessar o chão, sem travar a câmera.

Checagens automatizadas depois do fix: `npx tsc -b` limpo, `npm run test` do app em 213/213,
`npm run build` (app) sem erros, `npm run test` do `server-accounts` em 155/155 (sem mudança desde
a implementação inicial, já que o fix foi só no offset do `World3D.tsx`).

## Review automático — PR #79, rodada 1

Copilot encontrou 5 achados. Verificados um a um contra o código/comportamento real (não só o
texto do review):

1. **`meta.minigameId` sem validação no Worker (real, corrigido)** — `minigame_started`/
   `minigame_completed` caíam no branch genérico de `handleTrackEvent` (`index.ts`), que só existe
   pra eventos LEGADOS que toleram `meta` livre (comentário já existente em `camera_recenter_used`).
   Todo evento NOVO com um campo de conjunto fechado neste código tem 3 partes — validador
   dedicado, checagem de 400 na rota, e um branch de `safeMeta` que só deixa a chave documentada
   sobreviver (`cosmetic_equipped`/`planet_travel_completed`/`learning_challenge_*`/
   `album_planet_opened` já seguem esse padrão). Corrigido: `isValidMinigameId`
   (`domain.ts`, `MINIGAME_IDS = new Set(['parkour1', 'ponte-logica'])`), checagem de 400 e
   `safeMeta = { minigameId: metaObj.minigameId }` em `index.ts`, 2 testes novos em
   `domain.test.ts` (`server-accounts` foi de 155 pra 157).
2. **`weeklyFunnel` não expõe os eventos novos (real, corrigido)** — mesmo achado exato já
   encontrado uma vez antes no lab-180 (PR #59): allowlist ✓, mas nenhum consumidor administrativo
   enxerga o evento sem consulta direta ao banco. Corrigido: `weeklyFunnel.minigameStarted`/
   `minigameCompleted` (`weeklyDevices(...)`, mesma convenção de alcance/dispositivos únicos do
   resto do funil), documentado em `docs/event-catalog.md`.
3. **Countdown não deixa o HUD inert → modal escondido atrás dela (real, corrigido)** —
   `.minigame-countdown-overlay` tem `z-index: 40`, `.modal-overlay` tem `z-index: 10`; como
   `hudInert` não incluía `minigamePrompt`, dava pra abrir chat/ranking/mochila durante os 3s de
   contagem e o modal ficava aberto mas visualmente atrás da contagem. Corrigido: `hudInert` agora
   inclui `!!minigamePrompt` (`World3D.tsx`).
4. **Apertar `E` de novo durante a contagem reinicia pra 3 (real, corrigido)** — cada entrada nos
   pedestais chamava `setMinigamePrompt({..., secondsLeft: 3})` incondicionalmente; apertar `E`
   várias vezes (ou tocar repetidamente o botão mobile) sem sair do raio do pedestal resetava a
   contagem toda vez, podendo adiar o teleporte indefinidamente. Corrigido: `minigamePromptRef`
   (mesmo padrão de `hudInertRef`/`selectedWeaponRef` — leitura do estado atual de dentro do
   closure de `setup()`) guarda a chamada de `setMinigamePrompt` só quando não há contagem já em
   andamento. **Verificado ao vivo**: 3 aperto de `E` em sequência rápida no mesmo pedestal —
   contagem seguiu 3→2→1→teleporte normalmente (não travou, não reiniciou); confirmado também que
   os ícones do HUD ficam visivelmente desabilitados durante a contagem (achado 3 acima) e voltam
   ao normal depois do teleporte.
5. **`ShadowGenerator` nunca remove os casters do hub no unmount (avaliado, não corrigido nesta
   PR)** — tecnicamente correto (`ShadowGenerator.dispose()` não é chamado automaticamente por
   `scene.dispose()`, já documentado uma vez no código pra um caso isolado, `benchScene` da
   detecção de GPU), mas **não é uma regressão desta PR**: dos ~80 `addShadowCaster` deste arquivo,
   só 3 têm `removeShadowCaster` (mobília removível/movível) — todo o resto da cenografia estática
   (as 4 pistas de parkour originais, casas, pontes, placas etc.) já segue exatamente o mesmo
   padrão de nunca desalocar o caster individualmente, confiando em `scene.dispose()` no fim da
   sessão. Corrigir só os 2-3 meshes novos do hub, isolados, não resolveria o problema sistêmico
   nem é consistente com o resto do arquivo — fica como um item de arquitetura maior (limpeza de
   `ShadowGenerator` pra TODA cenografia estática), fora do escopo desta fatia pequena.

Checagens depois desta rodada: `npx tsc -b` limpo; `npm run test` app 213/213 (inalterado);
`npm run test` `server-accounts` 157/157 (+2); `npm run build` sem erros; re-verificado ao vivo no
Chrome real (guarda de spam do `E` + `hudInert` durante a contagem, ver item 4 acima).

## Fora de escopo (explicitamente adiado)

- Mais de 2 pedestais/mini-jogos nesta fatia (a "Prédio dos Enigmas" — quiz surpresa repetível — e
  os outros 3 parkours ficam candidatos pra um lab futuro de expansão do hub).
- Matchmaking competitivo, monetização, leaderboard global aberto, UGC (excluídos explicitamente
  pelo próprio item do backlog).
- Redesenhar os mini-jogos em si (parkour, missão da ponte) — só linkar, não mudar.
- Progresso/streak/repetição persistida por perfil — os eventos novos servem pra medir uso
  agregado, não pra guardar histórico individual nesta fatia.
- Escolinha/quiz de astronomia como mini-jogo do hub (é gate de uma vez só, não repetível).
