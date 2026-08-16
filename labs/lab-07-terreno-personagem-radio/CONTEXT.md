# Contexto — Laboratório 07 — Terreno com relevo, personagem articulado, trilha estilo rádio

Preenchido em: 2026-08-16
Commit inicial → final: d40da20 (fim do lab-06) .. HEAD (commit deste wrap)

## O que foi feito

1. **Terreno com relevo real** (`terrainHeight(dir)` em `World3D.tsx`): função única que combina
   ondulação suave de base (duas senoides/cossenoides em baixa amplitude) com 4 platôs
   (`PLATEAU_CENTERS`, cada um com direção normalizada no planeta, raio angular de influência e
   altura) — topo achatado via `smoothstep` na borda, não penhasco reto. Essa mesma função é
   reaproveitada pra: deformar os vértices da malha do chão (`VertexData.ComputeNormals` depois,
   pra relighting correto), posicionar props/escolas/rio/grama, e posicionar o próprio personagem
   — evita qualquer objeto flutuando ou enterrado por usar fontes de altura diferentes.
2. **Colisor físico acompanha o relevo**: trocado de `PhysicsShapeType.SPHERE` pra
   `PhysicsShapeType.MESH`, usando a geometria já deformada — sem isso o personagem atravessaria
   ou flutuaria sobre os platôs (só o visual mudaria, não a física).
3. **Personagem com joelho e cotovelo articulados**: `buildTwoSegmentLimb()` cria pernas/braços em
   dois segmentos (coxa+canela, braço+antebraço) com uma junta no meio, em vez de um segmento
   rígido só. `KNEE_BEND_MAX` controla o quanto o joelho dobra no ciclo de caminhada — visual
   menos "robotizado", mais parecido com um boneco articulado de verdade.
4. **Trilha "estilo rádio"** (`ambientAudio.ts`): 3 faixas curtas (`TRACKS`), cada uma com clima
   diferente (waveform, nota de baixo, notas da melodia). Ao terminar as notas de uma faixa, troca
   pra próxima (`trackIndex = (trackIndex + 1) % TRACKS.length`) com uma pausa de 900ms simulando
   troca de estação — não repete a mesma faixa em loop infinito como antes.
5. **Moedinhas colecionáveis**: 14 moedas espalhadas pelo planeta (posicionadas com a mesma
   `terrainHeight`), giram e sobem/descem continuamente (`coinPivot` fixo pra alinhamento com a
   superfície + `coinMesh` filho livre pra girar — só Euler `.rotation`, sem `rotationQuaternion`
   no mesmo nó, senão o giro não teria efeito visual). Ao entrar em `TRIGGER_DISTANCE`-like raio
   (1.3), a moeda é marcada coletada, some da cena, toca som (`playCoinCollect`, arpejo
   ascendente) e chama `onCollectCoin` (novo prop de `World3D`, ligado em `App.tsx` a
   `collectCoin()` do `useProgress`, que soma 1 a `progress.coins` e persiste em `localStorage`
   via `applyCoinCollected` em `state/progression.ts`).

## Testado (Chrome automatizado, `npm run dev`)

- **Terreno/platôs**: teleporte de debug (`window.__debugTeleport`) até o centro exato de
  `PLATEAU_CENTERS[0]` (altura configurada 2.4). Distância do personagem até o centro do planeta
  medida via script: 15.92 ≈ `PLANET_RADIUS(13) + AVATAR_RADIUS(0.55) + 2.4` — confirma que o
  personagem senta exatamente na altura do platô, sem flutuar nem afundar. Visualmente, o platô
  aparece como uma elevação clara com o terreno mais baixo caindo pro fundo — efeito de relevo
  correto, não um bug (a primeira leitura do screenshot pareceu "personagem flutuando", mas o
  cálculo confirmou que é a perspectiva normal de estar em cima de um platô).
- **Colisor MESH**: personagem não afunda nem atravessa o chão em nenhum ponto testado (spawn,
  centro do platô, área de moedas).
- **Personagem articulado**: tecla `w` segurada ~1,4s via `KeyboardEvent` sintético — personagem
  andou (posição mudou em relação a props fixas), poses de perna assimétricas visíveis em
  screenshot intermediário (consistente com o ciclo de caminhada com joelho).
- **Moeda**: teleporte até a direção exata de `coin-0` (lida da própria cena, não hardcoded) —
  contador de moedas no HUD foi de `0` pra `1` imediatamente ao chegar perto, confirmando o
  caminho completo (proximidade → som → HUD → `localStorage`).
- **Trilha "rádio"**: não testado por escuta real (sem ferramenta de áudio disponível na
  automação) — verificado por leitura de código, lógica determinística e simples
  (`trackIndex % TRACKS.length`).
- **Console**: recarregada a página do zero com tracking de console ativo — nenhum erro/exceção
  registrado.

## Decisões técnicas tomadas

- **Deformação real de geometria, não normal map/textura** — pedido explícito do usuário
  ("deformacoes no terreno") batia com o padrão de qualidade gráfica já definido em `prompt.md`
  §7.1 (relevo de verdade, não só truque visual).
- **Colisor `MESH` em vez de `SPHERE` apesar do custo extra de física** — necessário pra platôs
  serem navegáveis de verdade; o planeta é pequeno (raio 13, ~443 meshes na cena inteira) então o
  custo permanece aceitável pro alvo de performance do jogo.
- **Moedas com som sintetizado (Web Audio), não asset baixado** — mesmo padrão já usado pro
  vento/passos/trilha desde o lab-04, evita reabrir o ciclo de licença/permissão de asset.
- **"Mais coisas pra interagir" interpretado como moedas colecionáveis** — o pedido do usuário
  não especificou exemplos concretos; moedas foi a interpretação mais direta e de menor risco
  (mecânica simples, reforça o loop de progresso que já existe via `Progress`).

## Pendências / dívidas conhecidas

- **Trilha "rádio" não testada por escuta real** — lógica revisada por código, mas nunca ouvida
  de fato rodando; se o próximo laboratório tocar em áudio, vale confirmar de ouvido (ex.: pedir
  ao usuário) que a troca de faixa não soa abrupta/quebrada.
- **Lição operacional (Windows)**: `TaskStop` num processo em background (ex.: o servidor de
  relay do lab-06, `node server/relay.cjs`) não mata de forma confiável o `node.exe` gerado —
  durante o teste deste laboratório apareceu um jogador "fantasma" (nome "Duda", igual ao perfil
  de teste atual) porque um processo antigo (PID differente a cada sessão) ainda estava escutando
  na porta 3001 e ecoando o próprio estado do jogador local de volta como se fosse remoto.
  Diagnosticado via `Get-NetTCPConnection -LocalPort 3001` e resolvido com
  `Stop-Process -Id <pid> -Force`. **Sempre que o encerramento limpo de um servidor em background
  for importante pra um teste, confirmar no nível do SO** (`Get-NetTCPConnection`/`Stop-Process`),
  não confiar só no `TaskStop` do harness.
- Continuam de pé, sem mudança neste laboratório: chat sem moderação (lab-06), deploy real
  pendente, servidor de relay precisa ser iniciado manualmente/separado do `npm run dev`.

## O que o próximo laboratório deve desenvolver

Não há um pedido novo e específico do usuário ainda em aberto além do que já foi implementado
aqui. Antes de abrir o próximo laboratório, vale:
- Confirmar com o usuário se a trilha "rádio" soa como o esperado (ouvir de verdade).
- Perguntar se "mais coisas pra interagir" (mencionado de forma genérica) tem algo específico em
  mente além das moedas — a interpretação atual foi uma escolha própria, não confirmada.
- Revisitar o tema do deploy real (pendente desde antes do lab-06 — usuário ainda não decidiu/
  criou conta em nenhum provedor).
- Revisitar moderação de chat antes de qualquer uso com crianças reais fora do ambiente de teste
  do próprio usuário.

## Estado do repositório ao final

- Branch: `main`
- Como rodar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev` (em
  outro).
