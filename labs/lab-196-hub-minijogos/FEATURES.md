# Laboratório 196 — Hub de mini-jogos e teleport por botão no chão

Status: em andamento
Início: 2026-09-18
Fim: -
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

- [ ] Achar um local livre pro hub na superfície do planeta principal, usando o mesmo método de
  varredura de distância angular já documentado no comentário do parkour original (lab-11) —
  verificado, não adivinhado às cegas.
- [ ] Construir uma estrutura física pequena do hub: 2 pedestais no chão (parkour + ponte), com
  identidade visual simples (cor/placa) que já indique de longe "aqui tem jogo".
- [ ] Interação nos pedestais (tecla `E`/botão de toque, mesmo padrão já usado no resto do jogo):
  mostra uma explicação curta do mini-jogo, dispara uma contagem regressiva nova (3-2-1), depois
  teleporta (`teleportAvatarTo`) pro início do mini-jogo escolhido.
- [ ] "Voltar ao hub": um gatilho no destino de cada mini-jogo (mesma tecla `E`/toque) que teleporta
  de volta pra posição salva do hub.
- [ ] Eventos novos `minigame_started`/`minigame_completed` (`meta: { minigameId }`) — adicionados à
  allowlist do Worker (`app/server-accounts/src/domain.ts`) e disparados do client
  (`app/src/productAnalytics.ts`, mesmo padrão de `learning_challenge_started/completed`).
  `minigame_completed` da ponte reaproveita o mesmo instante de `learning_challenge_completed`; do
  parkour, o instante em que a moeda do TOPO daquele curso específico é coletada.
- [ ] Verificar ao vivo: interagir com os 2 pedestais abre explicação → contagem → teleporta
  corretamente; câmera/física continuam estáveis depois do teleport (sem atravessar chão/travar);
  voltar ao hub funciona dos dois destinos; toque equivalente ao teclado funciona.

## Fora de escopo (explicitamente adiado)

- Mais de 2 pedestais/mini-jogos nesta fatia (a "Prédio dos Enigmas" — quiz surpresa repetível — e
  os outros 3 parkours ficam candidatos pra um lab futuro de expansão do hub).
- Matchmaking competitivo, monetização, leaderboard global aberto, UGC (excluídos explicitamente
  pelo próprio item do backlog).
- Redesenhar os mini-jogos em si (parkour, missão da ponte) — só linkar, não mudar.
- Progresso/streak/repetição persistida por perfil — os eventos novos servem pra medir uso
  agregado, não pra guardar histórico individual nesta fatia.
- Escolinha/quiz de astronomia como mini-jogo do hub (é gate de uma vez só, não repetível).
