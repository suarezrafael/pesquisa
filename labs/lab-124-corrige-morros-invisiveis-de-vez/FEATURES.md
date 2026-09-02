# Laboratório 124 — Corrige morros invisíveis (retomada do lab-95, sem solução até aqui)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 3dc84f70fcf2d020b3998730384c7b5db1150b4b

## Objetivo do laboratório

Retomar o bug do lab-95, deixado explicitamente sem solução: "morros/platôs aparecem invisíveis
('flutuando no espaço') em certos ângulos", relatado pelo usuário num aparelho específico, nunca
reproduzido pela própria sessão que investigou originalmente. A tentativa anterior
(`planetMat.backFaceCulling = false`) foi confirmada funcionando num CENÁRIO DE TESTE isolado, mas
o usuário testou de novo no jogo real e o morro continuou invisível — ficou registrado como bug
aberto, com a suspeita de que fosse algo específico de aparelho/GPU do usuário.

## Investigado antes de planejar

- **Duas perguntas feitas ao usuário antes de investigar** (informação que a sessão anterior não
  tinha e não conseguiu obter): (1) aparelho/navegador — resposta: **celular Android, Chrome**;
  (2) dá pra ANDAR através do morro invisível, ou ele continua sólido? — resposta: **continua
  sólido**. Essa segunda resposta é decisiva: confirma que é um problema PURAMENTE de
  renderização (a física/colisão do morro está correta), não um buraco real na geometria — a
  mesma conclusão do lab-95, agora confirmada pelo usuário em vez de só suposta.
- **Não dá pra reproduzir um bug específico de GPU/driver móvel neste ambiente** (automação roda
  em Chrome desktop) — a estratégia foi auditar o código em busca de causas conhecidas e
  documentadas que expliquem por que `backFaceCulling = false` sozinho pode não ser suficiente,
  em vez de tentar reproduzir visualmente o sintoma exato.
- **Achado 1 (a causa mais provável)**: `planetMat` é um `PBRMaterial` com `backFaceCulling =
  false` (linha ~3253) mas **nunca teve `twoSidedLighting = true`** — grep confirmou que essa
  propriedade não é usada em NENHUM lugar do arquivo. Isso é um gotcha bem documentado do
  Babylon.js: `backFaceCulling = false` só manda a GPU DESENHAR a face de trás; sem
  `twoSidedLighting`, a iluminação dessa face continua calculada com a normal ORIGINAL (de
  frente), que aponta pro lado errado da luz pra geometria virada ao contrário — o triângulo
  desenha, mas com um resultado de iluminação quase preto. Isso explica tanto por que a correção
  do lab-95 pareceu funcionar num teste isolado (ângulo/luz específicos podem ter mascarado o
  escurecimento) quanto por que continuou falhando no jogo real, e por que seria mais perceptível
  num celular (GPUs móveis arredondam contraste escuro de jeito diferente de desktop — inconsistência
  de renderização entre GPUs é bem documentada pra esse tipo de caso).
- **Achado 2 (confirmado empiricamente, não só por hipótese)**: `ComputeNormals` pode devolver uma
  normal de comprimento ~0 pra um vértice cujos triângulos vizinhos degeneraram (ficaram quase
  colineares por causa da dobra na rampa íngreme, mesma causa raiz já documentada no lab-95).
  **Medido ao vivo** (log temporário, removido depois de confirmar): a malha real do planeta,
  no perfil de teste usado, tem **1 normal genuinamente degenerada em 5151** — prova concreta
  (não suposição) de que o dobramento de triângulo realmente produz pelo menos um vértice quebrado
  na malha atual. Uma normal de comprimento zero vira `NaN` ao ser normalizada (pela GPU, no
  shader) — diferentes GPUs/drivers tratam `NaN` de formas diferentes ao colorir o fragmento
  (mais uma explicação plausível pra "só nesse aparelho").

## Decisões técnicas tomadas

- **Duas correções complementares, ambas de baixo risco** (nenhuma pode piorar o que já
  funcionava, só corrigir casos que já estavam errados):
  1. `planetMat.twoSidedLighting = true` — junto do `backFaceCulling = false` já existente.
  2. Depois de `ComputeNormals`, uma passagem que detecta qualquer normal com comprimento ao
     quadrado ≤ 0.01 (não-unitária de verdade) e substitui pela direção radial pra fora (`dir`,
     sempre um fallback razoável nesse planeta aproximadamente esférico).
- **Não foram tocados**: `terrainHeight()`/`PLATEAU_CENTERS`/número de segmentos da malha — mudar
  a INTENSIDADE do relevo ou a resolução da malha (a causa raiz mais profunda do dobramento) é uma
  mudança bem maior, de impacto visual em todo o planeta, e já estava deliberadamente fora de
  escopo desde o lab-95 ("Meta de 'escolinhas menores' segue em aberto"). Este laboratório ataca
  as CONSEQUÊNCIAS da dobra (iluminação/normal quebradas), não a dobra em si.
- **Sem tentativa de reproduzir o bug original visualmente** — decisão consciente, dado que é
  específico de GPU/driver móvel e este ambiente de verificação é Chrome desktop; a validação
  ficou em (a) confirmar as duas causas são reais e presentes no código/malha atual, (b) build/
  testes limpos, (c) nenhuma regressão visual no desktop.

## Funcionalidades planejadas

- [x] `World3D.tsx`: `planetMat.twoSidedLighting = true`.
- [x] `World3D.tsx`: substituir normais degeneradas (comprimento ~0) pela direção radial após
      `ComputeNormals`.
- [x] Verificação: `npm run build`/`npm run test` sem erros; medição ao vivo (log temporário,
      removido depois) confirmando que normais degeneradas realmente existem na malha atual;
      verificação visual de que o planeta continua renderizando normalmente no desktop (sem
      regressão), sem erro de console.

## Pendências / dívidas conhecidas

- **Não há confirmação de que o bug do usuário está 100% resolvido** — impossível de confirmar
  sem o usuário testar de novo no mesmo aparelho Android/Chrome onde viu o problema. As duas
  correções atacam causas REAIS e CONCRETAS (uma delas medida, não só hipotética) que combinadas
  cobrem os dois mecanismos mais conhecidos pra esse tipo de sintoma («textura escura demais» e
  «normal inválida/NaN»), mas se o usuário reportar que ainda vê o problema depois de testar em
  produção, os próximos passos seriam: (a) pedir um print com o número da escolinha mais próxima
  (mesmo pedido já registrado no lab-95); (b) considerar que a causa real pode ser outra (ex.:
  compressão de precisão de ponto flutuante em GPUs móveis de gama baixa, diferente de qualquer
  coisa testável neste código).
- O diagnóstico temporário no HUD (`ENTERRADAS:...`, mencionado no lab-95 como pendente de
  remoção após confirmação continuada) **não foi tocado neste laboratório** — continua no HUD.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas foram concluídas.

## O que o próximo laboratório deve desenvolver

Sem uma prioridade única e óbvia — perguntar ao usuário antes de escolher, como de costume.
Candidatos: (1) confirmar com o usuário se o bug de morros sumiu de vez (precisa dele testar no
aparelho real); se sim, remover o diagnóstico `ENTERRADAS:...` do HUD; (2) code-splitting real do
chunk `studentFigure` (3,68MB) — investigação já feita, aguardando decisão se vale o
risco/esforço do refactor de 3 arquivos.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 47/47 passando (sem teste novo — mudança de material/normal de
  renderização 3D, sem lógica de domínio pura testável em isolamento).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation, Chrome desktop): confirmado 1 normal
  degenerada real na malha atual (medição temporária, log removido antes do commit final); planeta
  renderizando normalmente após as duas correções, sem regressão visual perceptível, sem erro de
  console.
- Como verificar de novo: `cd app && npm run dev`, andar pelo planeta observando os morros/platôs
  de ângulos variados. Confirmação definitiva do bug relatado depende do usuário testar no mesmo
  aparelho Android/Chrome onde viu o problema originalmente.
