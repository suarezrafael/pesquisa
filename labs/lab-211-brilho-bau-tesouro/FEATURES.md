# Laboratório 211 — Brilho pulsante nos baús de tesouro

Status: em andamento
Início: 2026-09-20
Commit inicial: 684bad21fa7343d51eec23f2def753ec6cc8e043

## Objetivo do laboratório

Backlog "Lab 198 - Efeitos visuais de recompensa, movimento e interacao": pacote de efeitos leves
(landing puff, footstep dust/grass, brilho em interativo, pulso de recompensa, trail de foguete/
cometa, feedback de puzzle). O landing puff já foi feito no lab-207; esta lab fecha a peça "brilho
em interativo" com um brilho pulsante no fecho dourado dos baús de tesouro (lab-131) — os únicos
colecionáveis do jogo com recompensa real que ainda não tinham nenhum brilho, diferente das moedas
(`coinMat.emissiveColor` já estático desde sempre).

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — escolhido com o usuário via `AskUserQuestion` entre "mais uma peça do Lab
198" e "pausar" depois do lab-210; usuário escolheu continuar.

## Investigação prévia

- **Moedas já têm brilho, mas ESTÁTICO** (`coinMat.emissiveColor` fixo desde a criação, sem
  animação nenhuma) — confirmado por leitura antes de escolher o alvo desta lab, pra não duplicar
  o que já existe. Baús de tesouro (`buildTreasureChest`, lab-131) não tinham `emissiveColor`
  nenhum no fecho dourado (`buckleMat`) — alvo escolhido por ser o único colecionável de recompensa
  real ainda sem brilho nenhum, e por diferenciar de verdade da moeda com um brilho PULSANTE (efeito
  de verdade, não só ajuste de material estático).
- **Critério de aceite do próprio item — "efeitos desligam/reduzem em mobile"**: `isLowEndDevice`
  (já existente, `gpuTier === 'weak'`) usado pra decidir se a animação por quadro roda ou não — em
  aparelho fraco, o material nasce já no valor de PICO do brilho (constante, sem custo por quadro
  nenhum depois disso), continuando visualmente "brilhando" sem nenhuma animação.
- **Animação incondicional, mesmo lugar/padrão de toda outra animação cosmética do laço principal**
  (nuvens, luas, idle dos professores) — nunca atrás de guarda de chat/suspensão, mesma lição já
  aprendida e documentada em labs anteriores (achado do review automático do Copilot no lab-206:
  animação cosmética presa atrás de uma guarda de interação é o bug, não o padrão certo).
- **`treasureChestGlowMats` só recebe baús AINDA NÃO achados**: um baú já achado fica
  `base.setEnabled(false)` (invisível) — animar a cor do material dele seria trabalho sem efeito
  visual nenhum, então não entra na lista.
- **Sem geometria/partícula nova**: só a cor emissiva de um material já existente (`buckleMat`),
  orçamento mínimo — respeita "Fora de escopo: shader pesado, bloom/orbs decorativos excessivos,
  particulas sem budget" do próprio item.

## Decisão de escopo

Sem pergunta ao usuário sobre QUAL peça específica de "brilho em interativo" (escopo já reduzido
o bastante — 1 propriedade de material animada, sem geometria nova — pra decidir sozinho, mesmo
espírito de baixo risco já aceito pro landing puff do lab-207). Fora de escopo: as outras 4 peças
restantes do Lab 198 (footstep dust, pulso de recompensa, trail de foguete/cometa, feedback de
puzzle) e brilho em qualquer OUTRO objeto interativo além do baú (escolinhas, mobília, etc.) — cada
um merece sua própria decisão de escopo/verificação numa lab futura.

## Funcionalidades planejadas

- [x] `TREASURE_CHEST_GLOW_PEAK`/`TREASURE_CHEST_GLOW_LOW`/`TREASURE_CHEST_GLOW_SPEED`: constantes
  de cor/velocidade do pulso.
- [x] `treasureChestGlowMats`: array populado em `buildTreasureChest`, só com baús ainda não
  achados.
- [x] Laço por quadro incondicional (`Color3.LerpToRef`, seno) — só roda em `!isLowEndDevice`;
  em aparelho fraco, o material fica estático no valor de pico definido na construção.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (14ª lab seguida — mesma limitação exata). Documentado abaixo; confiado em `tsc`/testes/build +
  leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança —
nenhuma lógica de domínio nova, só efeito visual puramente cosmético); `npm run build` sem erros.

Pontos conferidos por leitura:

- **`Color3.LerpToRef(left, right, amount, ref)`**: API padrão do `@babylonjs/core` (mesmo padrão
  já usado neste arquivo por `Vector3.LerpToRef`, ex. no seguimento suave do pet) — interpola entre
  `TREASURE_CHEST_GLOW_LOW`/`PEAK` e escreve o resultado direto em `mat.emissiveColor` (mutação in-
  place, sem alocar um `Color3` novo por quadro por baú).
- **`isLowEndDevice` acessível no escopo do laço principal**: confirmado — já é usado por outras
  decisões de performance no mesmo `setup()` (amostragem do pipeline de pós-processamento,
  `engine.setHardwareScalingLevel`, etc.), mesmo escopo de função que a nova animação.

## Rodada de review — Copilot (PR #94)

**Rodada 1**: 1 achado real, confirmado e corrigido:

1. **Médio — material continuava animando depois do baú ser achado**: confirmado contra o código
   — `treasureChestGlowMats` só excluía baús já achados no momento da CONSTRUÇÃO (`alreadyFound`);
   um baú achado DURANTE a sessão (`chest.pivot.setEnabled(false)` no gatilho de proximidade)
   deixava o material dele no array pra sempre — o laço de brilho por quadro continuava
   interpolando a cor de um material invisível, sem efeito visual nenhum, só trabalho
   desperdiçado. Corrigido guardando `buckleMat` direto no marcador (`treasureChestMarkers`) e
   removendo-o de `treasureChestGlowMats` no exato momento em que o baú é achado.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da correção.

**Rodada 2**: "🟢 Approval recommended", "Findings: None", achado da rodada 1 confirmado "Resolved
since last review". Contagem bruta de comentários (1) confere com o único id já conhecido/corrigido
— nenhum comentário genuinamente novo. Ciclo de review encerrado (2 rodadas). Pronta pra revisão de
merge.

**Risco remanescente, honesto**: a aparência exata do pulso (velocidade, contraste entre pico/vale)
não foi confirmada ao vivo — valores escolhidos por analogia com o brilho estático já existente das
moedas (mesma faixa de matiz dourada), ajustados pra oscilar visivelmente sem ficar "piscando"
rápido demais (2,2 rad/s, período de ~2,9s), mas sem confirmação visual real.
