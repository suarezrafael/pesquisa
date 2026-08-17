# Laboratório 28 — Relevo de água (rio/piscina), rua sem risco de afundar, boneco sentado

Status: em andamento
Início: 2026-08-17
Commit inicial: c58f79329bb0d67884bb7697f1d4532c8a6c774e

## Objetivo do laboratório
Cinco relatos diretos do usuário jogando a build atual, em duas mensagens seguidas:

1. "parece que a piscina não é um buraco na terra" — confirmado ao vivo (teleporte +
   screenshot): a piscina lê como chão plano com um disco azul em cima, sem nenhuma leitura de
   depressão/buraco.
2. "a estrada está abaixo da terra, ela não aparece" — testado em 3 pontos diferentes do laço
   novo (lab-27, phi=25°+ondulação): a rua renderizou normalmente nos três. Não reproduzido como
   "invisível", mas a margem de altura (`+0.02`) é bem fina — aumentada por segurança mesmo sem
   reprodução clara de bug (pode ser sensível a ângulo de câmera/momento específico não
   capturado nesta verificação).
3. "o rio... deveria ser em baixo relevo, ter margens marrom de terra e a água mais abaixo com
   reflexo de água" — confirmado ao vivo: o rio hoje é só uma faixa azul chata rente ao chão, sem
   depressão, sem margem de terra, grama encostando direto na água.
4. "o boneco deve ir sentado em cima do carro" — hoje (lab-27) o boneco fica visível em cima do
   carro, mas na pose padrão em pé, não sentado.
5. "a casa número 4 está em cima de um morro, mas o morro é invisível, a grama está sobre ele mas
   o morro não aparece" — investigado ao vivo: a cor do vértice no topo do platô ONDE a escola
   fica está correta (`[0.2, 0.38, 0.2]`, exatamente `hillGreenColor` do lab-18) — não é bug de
   cor. A causa real: a grama (2600 tufos, densidade uniforme no planeta inteiro) cobre o platô
   igual a qualquer chão plano, escondendo visualmente a cor distinta que já existe por baixo.

## Funcionalidades planejadas
- [ ] Rio com relevo de verdade: bacia rebaixada ao longo do trajeto (profundidade por distância
      PERPENDICULAR à linha central, não um único centro como lagoa/piscina — o rio é uma faixa
      longa), margem de terra marrom por cor de vértice na borda da bacia, superfície da água
      reposicionada mais abaixo que a margem (não rente ao nível do chão vizinho), material da
      água mais reflexivo (metallic/roughness ajustados, aproveitando o `environmentTexture` HDRI
      já carregado).
- [ ] Piscina com leitura de buraco: mesmo tratamento de margem de terra marrom por cor de
      vértice ao redor do disco de água (a bacia de terreno já existe via `applyBasin`, só não
      tem cor distinta pra ficar visível — mesma causa raiz do rio).
- [ ] Rua: margem de altura acima do terreno aumentada (de `+0.02` pra uma folga maior),
      reduzindo risco de coincidir com a malha do planeta em qualquer ponto do laço.
- [ ] Grama não nasce em cima dos platôs (raio de cada um dos 4 `PLATEAU_CENTERS`, mesmo padrão
      de reamostragem já usado pro bioma de deserto, lab-23) — deixa a cor de morro (já correta)
      finalmente visível, em vez de escondida por baixo de grama uniforme.
- [ ] Boneco sentado de verdade no carro: pernas/braços em ângulo de "sentado" (coxa pra frente,
      joelho dobrado ~90°) aplicado uma vez ao entrar no carro, não a pose parada padrão.
- [ ] Verificação: `npm run build` passa; testar ao vivo com teleporte + screenshot em cada um
      dos pontos (rio, piscina, um platô, a rua) confirmando visualmente a mudança; confirmar
      numericamente que a rua não perde folga em nenhum ponto do laço.

## Fora de escopo (explicitamente adiado)
- Aumentar `PLANET_RADIUS` — resolveria de vez a limitação de curvatura de horizonte que também
  contribui pra dificuldade de perceber relevo à distância, mas é uma mudança grande (afeta
  posição de todo marco existente); a combinação de cor de morro já correta + grama removida do
  topo deve ser suficiente pra resolver o relato sem essa mudança maior.
- Física de água de verdade (correnteza, nadar) — só visual/relevo, igual ao padrão de "polimento
  visual, não sistema novo" já usado em labs anteriores (ex. lab-18 cor de morro).
