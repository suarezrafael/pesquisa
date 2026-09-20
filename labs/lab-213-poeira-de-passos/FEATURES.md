# Laboratório 213 — Poeira de passos ao caminhar/correr

Status: concluído
Início: 2026-09-20
Fim: 2026-09-20
Commit inicial: ed10f1ab346be482d22fade089e9e11b748f9a6b

## Objetivo do laboratório

Backlog "Lab 198 - Efeitos visuais de recompensa, movimento e interacao": pacote de efeitos leves
(landing puff, footstep dust/grass, brilho em interativo, pulso de recompensa, trail de foguete/
cometa, feedback de puzzle). Landing puff (lab-207), brilho em interativo (lab-211) e pulso de
recompensa (lab-212) já estão feitos; esta lab fecha a peça "footstep dust/grass" — uma nuvem
pequena de poeira nos pés do avatar a cada passada real (caminhando ou correndo), reaproveitando a
técnica de partícula já madura do landing puff (lab-207).

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — escolhido autonomamente (mesmo espírito de baixo risco já aceito pros
labs 207/211/212) depois do lab-212, com o usuário optando por continuar via `AskUserQuestion`.

## Investigação prévia

- **Gatilho de passada já existe e é preciso**: `playFootstep()` (linha ~13752 de `World3D.tsx`) já
  dispara exatamente no cruzamento de zero do `swing` (`footSign !== lastFootSign`) dentro do bloco
  `moving`, cujo avanço de fase (`walkPhase += dt * speedRatio * ...`) usa `tangentialSpeed`
  derivada de `currentVel` — a MESMA lição da correção de moonwalk do lab-194 (seguir a física real,
  não o input bruto). Reaproveitar esse EXATO ponto de disparo pra poeira, em vez de criar uma nova
  lógica de cadência, garante que a poeira nunca aparece "deslizando" (pé animando sem o corpo se
  mover de verdade).
- **Só dispara com `grounded === true`**: o bloco `moving` (ciclo de perna) roda mesmo no ar (salto),
  porque é controlado por `throttle`, não por `grounded` — sem essa guarda extra, apareceria poeira
  "flutuando" durante um pulo/queda. `grounded` já é calculado ali perto (raycast físico, mesmo
  usado pelo pulo e pelo landing puff).
- **Sistema de partícula PRÓPRIO, não reaproveitar `landingPuffSystem`**: mesma textura
  (`dustTexture`, já criada) mas parâmetros bem menores (poucas partículas, burst pequeno) — evita
  qualquer risco de um passo e um pouso disputarem os mesmos parâmetros (`emitter`/`direction`/
  `manualEmitCount`) no mesmo quadro, e mantém cada sistema com um único responsável, mesmo padrão
  já usado no arquivo (`rocketFlameSystem`, `landingPuffSystem` como sistemas dedicados).
- **Sem diferenciação de superfície (grama vs. deserto vs. rocha)**: o próprio `landingPuffSystem`
  já usa uma poeira terrosa única em qualquer superfície/planeta, sem variar por bioma — replicar
  essa mesma simplificação aqui evita introduzir detecção de tipo de terreno (que não existe hoje)
  só por causa do efeito, respeitando "Fora de escopo: shader pesado... particulas sem budget" do
  próprio item do backlog. O nome do item ("dust/grass") vira só "poeira" na prática, igual ao
  pouso.
- **Critério de aceite do próprio item — "efeitos desligam/reduzem em mobile"**: burst de poeira só
  dispara quando `!isLowEndDevice`; em aparelho fraco, o passo continua tocando som
  (`playFootstep`, custo desprezível) mas sem nenhuma partícula nova.

## Decisão de escopo

Sem pergunta ao usuário sobre a forma exata do efeito (reaproveitar o disparo de passada já
existente e a textura de poeira já existente reduz a decisão a "criar um segundo `ParticleSystem`
pequeno", baixo risco). Fora de escopo: trail de foguete/cometa e feedback de puzzle (as duas peças
restantes do Lab 198) e qualquer variação de poeira por bioma/superfície.

## Funcionalidades planejadas

- [x] `footstepDustSystem`: segundo `ParticleSystem` dedicado, reaproveitando `dustTexture`,
  capacidade pequena (20), burst pequeno (`manualEmitCount = 4`) por passada.
- [x] Disparo no mesmo ponto onde `playFootstep()` já é chamado (`footSign !== lastFootSign`),
  condicionado a `grounded && !isLowEndDevice`.
- [x] Direção/gravidade calculadas a partir do `localUp` do ponto de contato (mesmo idioma já usado
  pelo landing puff), emitidas na posição do pé do avatar.
- [x] Verificar ao vivo: **desta vez o `document.hidden` NÃO travou** — sobrescrever
  `document.hidden`/`visibilityState` via `Object.defineProperty` + `dispatchEvent(new
  Event('visibilitychange'))` no console do DevTools (antes desta lab só `document.hidden` era
  testado, sem forçar o `visibilitychange`) foi suficiente desta vez pra sair de "Carregando o mundo
  3D..." — mundo carregou, avatar visível, planeta principal renderizado. Consegui andar com W
  (tecla real via `computer` tool, repetida) sem nenhum erro no console, sem crash, câmera/avatar se
  movendo normalmente. **Mas o próprio ambiente de automação reporta GPU fraca** (HUD de debug:
  `fraco=true`) — ou seja, o burst de poeira de passo fica DESLIGADO de propósito nesse ambiente
  (mesmo comportamento que rodaria num celular fraco de verdade), então não foi possível CONFIRMAR
  VISUALMENTE a partícula em si aparecendo; só que o código novo (incluindo o ramo
  `grounded && !isLowEndDevice`) não quebra nada durante caminhada real. `gpuTier` é estado React
  fechado dentro do `useEffect` de setup — não há um jeito simples de forçá-lo pra `'strong'` depois
  que a cena já montou, então não persegui mais que isso.

## Verificação de código

Checagens automatizadas: `npx tsc -b --force` limpo (lição do lab-212: `--force` ignora o cache
incremental, que já se mostrou não confiável pra `noUnusedLocals`/`noUnusedParameters` neste
repositório); `npm run test -- --run`: 257/257 (sem mudança — efeito puramente cosmético, nenhuma
lógica de domínio nova); `npm run build` sem erros.

Pontos conferidos por leitura:

- **Sem conflito com `landingPuffSystem`**: sistemas separados, cada um com seu próprio
  `emitter`/`direction`/`manualEmitCount` — mesmo se os dois dispararem no mesmo quadro (pouso bem
  na troca de perna), nenhum sobrescreve o outro.
- **`grounded` já calculado antes deste ponto no laço** (raycast físico, usado também pelo pulo e
  pelo landing puff) — reaproveitado sem custo adicional de raycast.
- **`isLowEndDevice` acessível no mesmo escopo de função** — mesmo padrão já usado pelo brilho do
  baú (lab-211) e por toda decisão de performance do `setup()`.

## Rodada de review — Copilot (PR #96)

**Rodada 1**: 1 achado real, confirmado e corrigido:

1. **Médio — poeira emitida do centro do colisor, não do pé que pisou**: confirmado contra o
   código — `studentFigure.ts` posiciona as pernas com deslocamento lateral (`upperPivot.position
   = new Vector3(side * 0.1, hipY, 0)`, `side` -1 = `legPivotL`/esquerda, +1 = `legPivotR`/
   direita), mas o emissor usava `pos` (centro do colisor físico) direto, sem esse deslocamento —
   a poeira sempre nascia no meio do avatar, nunca alternando de lado, visivelmente deslocada do
   sapato em câmera próxima. Corrigido deslocando o ponto de emissão por
   `right.scale(footSign * FOOT_X_OFFSET)` antes de projetar no chão — `right` já é o mesmo eixo
   usado pra orientar o personagem visual (`Vector3.Cross(localUp, facing)`, calculado mais acima
   no mesmo laço) e `footSign` já é ±1 na mesma convenção de `side` (-1 esquerda/+1 direita), então
   reaproveita variáveis existentes sem introduzir estado novo.

`npx tsc -b --force`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da
correção.

**Rodada 2 nunca aconteceu — reviewer automático travado, não ciclo longo**: depois de corrigir e
subir o commit da rodada 1, pedir uma nova revisão do Copilot (mesmo método usado com sucesso nas
labs 210-212: `requested_reviewers` POST) não disparou nenhuma revisão nova em ~40 minutos, mesmo
tentando 3 formas diferentes (re-pedir via API, remover e re-adicionar o reviewer, comentário
`@copilot review`). Diferente de um ciclo de review longo (onde o Copilot responde mas continua
achando coisa) — aqui o reviewer automático simplesmente não respondeu de novo. Usuário consultado
via `AskUserQuestion`: optou por mesclar sem esperar a rodada 2, já que o único achado real da
rodada 1 foi confirmado por leitura de código E corrigido, com `tsc`/testes/build limpos depois.

## Fora de escopo (explicitamente adiado)

- Trail de foguete/cometa e feedback de puzzle (peças restantes do Lab 198, cada uma merece sua
  própria lab).
- Variação de cor/textura de poeira por bioma (grama, deserto, rocha, gelo).
- Poeira ao correr vs. andar com intensidade diferente (mesmo burst pequeno pros dois, controlado
  só pela cadência real de passada, que já é mais rápida correndo).
