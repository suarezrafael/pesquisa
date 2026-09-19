# Laboratório 198 — Template de arena educativa reutilizável

Status: em andamento
Início: 2026-09-19
Fim: -
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

- [ ] Módulo de domínio puro `state/memoryGame.ts` (+ testes): criar baralho embaralhado, virar
  carta, detectar par certo/errado, detectar jogo completo — sem nenhuma dependência de Babylon.
- [ ] Portal "Memória" desbloqueado no centro de jogos (lab-197): interagir revela N pares de
  cartas (placas 3D) perto da placa, com uma contagem regressiva curta antes de ficarem
  interativas.
- [ ] Estado `playing/success/fail/retry`: cronômetro visível com limite de tempo; sucesso ao
  achar todos os pares; falha se o tempo acabar antes; opção de tentar de novo sem sair da arena.
- [ ] Cartas interativas por proximidade + tecla `E` (mesmo padrão de interação já usado no resto
  do jogo), com feedback visual (virada/par encontrado/errado).
- [ ] Eventos de analytics comuns citados pelo backlog: `minigame_started`/`minigame_completed`
  (já existem, lab-196 — reaproveitados com `minigameId: 'memoria'`) e dois novos,
  `minigame_retried`/`minigame_exited`, com validação server-side desde o primeiro commit (lição
  do lab-196/197).
- [ ] Verificar ao vivo: entrar no portal Memória mostra as cartas; virar cartas funciona; par
  certo fica marcado; jogo completo mostra sucesso; deixar o tempo acabar mostra falha; "tentar de
  novo" reinicia sem travar câmera/física/labels; sair da arena sem completá-la não deixa nada
  preso (critério de aceite explícito do backlog).

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
