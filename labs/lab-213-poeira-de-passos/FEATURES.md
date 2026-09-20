# Laboratório 213 — Poeira de passos ao caminhar/correr

Status: em andamento
Início: 2026-09-20
Fim: -
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

- [ ] `footstepDustSystem`: segundo `ParticleSystem` dedicado, reaproveitando `dustTexture`,
  capacidade pequena (~20), burst pequeno (`manualEmitCount` ~3-4) por passada.
- [ ] Disparo no mesmo ponto onde `playFootstep()` já é chamado (`footSign !== lastFootSign`),
  condicionado a `grounded && !isLowEndDevice`.
- [ ] Direção/gravidade calculadas a partir do `localUp` do ponto de contato (mesmo idioma já usado
  pelo landing puff), emitidas na posição do pé do avatar.
- [ ] Verificar ao vivo: ambiente de automação desta sessão provavelmente trava de novo em
  `document.hidden` (mesma limitação de todas as labs anteriores) — se acontecer, documentar e
  confiar em `tsc`/testes/build + leitura de código cuidadosa.

## Fora de escopo (explicitamente adiado)

- Trail de foguete/cometa e feedback de puzzle (peças restantes do Lab 198, cada uma merece sua
  própria lab).
- Variação de cor/textura de poeira por bioma (grama, deserto, rocha, gelo).
- Poeira ao correr vs. andar com intensidade diferente (mesmo burst pequeno pros dois, controlado
  só pela cadência real de passada, que já é mais rápida correndo).
