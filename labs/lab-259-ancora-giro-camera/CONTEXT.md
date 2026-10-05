# Contexto — Laboratório 259 — Correção direcional que reduz o giro da câmera de vez

Preenchido em: 2026-10-05
Commit inicial → final: 2bfd0a975127b035b17c0e6239ff6bf44a4fb619..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx`:
  - Nova constante `CAMERA_UP_LOOK_AHEAD_ANGLE = 0.2` (radianos), perto de `CAMERA_DISTANCE`/
    `CAMERA_HEIGHT` — puramente angular, sem metros nem raio de planeta.
  - No laço de atualização da câmera a pé: o alvo do `Vector3.Lerp(camera.upVector, ..., ...)`
    deixou de ser `localUp` puro e virou `cameraTargetUp` — `localUp` rotacionado
    `CAMERA_UP_LOOK_AHEAD_ANGLE` radianos em direção a `camFacing` (eixo de rotação =
    `Vector3.Cross(localUp, camFacing)` normalizado; `Matrix.RotationAxis` + `TransformCoordinates`,
    mesmo idioma já usado em outros pontos deste arquivo pra rotacionar uma direção em torno de um
    eixo arbitrário).

**Esta é a SEGUNDA versão deste laboratório.** A primeira versão (âncora por distância andada,
`CAMERA_UP_ANCHOR_RADIUS`) foi implementada, testada ao vivo e até peer-reviewed via PR — mas o
review automático do Copilot achou dois problemas reais na v1 (ver "Por que a v1 foi substituída"
abaixo) que motivaram reprojetar a correção do zero antes de mesclar. Nenhum vestígio da v1 (nem a
constante, nem o estado de âncora) sobrou no código final.

## Como a causa foi encontrada

Minutos depois do deploy do lab-258, o usuário mandou outro print circulando a MESMA escolinha
("28", perto da "Torre do Tesouro") — ainda visivelmente tombada. Reconfirmado ao vivo que a
escolinha continua matematicamente correta (0,000° de erro no próprio `rotationQuaternion`,
checagem idêntica à do lab-258). Isso é exatamente o limite já documentado no lab-258: a
suavização só ATRASA a convergência, não a limita — parado tempo suficiente olhando pra algo
próximo, o tombo completo (determinado pela curvatura real do planeta) sempre volta a aparecer.

Perguntei explicitamente ao usuário: suavizar mais (sem eliminar de vez) OU implementar um limite
de verdade, com o trade-off exposto (o chão perto dos PRÓPRIOS pés do jogador pode passar a
parecer levemente inclinado, já que a câmera deixaria de bater exatamente com o `localUp` do
jogador o tempo todo). Usuário escolheu o limite de verdade.

## Por que a v1 (âncora por distância) foi substituída

A v1 foi implementada, testada ao vivo (confirmou que o ângulo pendente PLATEIA em vez de
convergir a zero) e aberta em PR. O review automático do Copilot achou dois problemas reais antes
da mesclagem:

1. **(Severidade alta) A âncora não garantia o corte de tombo pretendido.** A v1 só limitava o
   ângulo entre a câmera e o `localUp` do PRÓPRIO jogador — sem nenhuma relação direta com o
   ângulo até o PRÉDIO específico que motivou a reclamação. Se o jogador parasse de andar bem na
   hora de cruzar o raio de reancoragem, a âncora batia exatamente com a posição atual (gap zero,
   igual a antes da correção) e o tombo completo do prédio voltava — nenhuma garantia contra isso.
   Pior: como o deslocamento entre âncora e `localUp` tem uma direção essencialmente ARBITRÁRIA
   (depende de onde o jogador calhou de parar, não de pra onde ele está olhando), a v1 podia tanto
   reduzir quanto AUMENTAR o tombo aparente de um prédio específico, dependendo do acaso.
2. **(Severidade média) O raio de 2 metros não escalava com o tamanho do planeta.** Em planetas-
   destino menores que o principal (Mercúrio, raio 4 — `World3D.tsx:684`), os mesmos "2 metros"
   correspondem a um raio ANGULAR bem maior (~24° em vez dos ~8,8° pretendidos pro planeta
   principal, raio 13) — o limite pretendido ficava destruído lá.

Essas duas críticas se resolvem com uma mudança de abordagem, não só de número: em vez de uma
âncora congelada (posição arbitrária, sem relação com o que o jogador está olhando), a v2 inclina
`localUp` continuamente EM DIREÇÃO a `camFacing` — a direção que a câmera já aponta. Isso:
- Resolve o problema 1 porque a correção está sempre alinhada com O QUE O JOGADOR ESTÁ OLHANDO
  (o prédio em questão), não com uma posição congelada arbitrária — reduz o tombo de QUALQUER
  COISA à frente, de forma consistente, não dependente de sorte de onde o jogador parou.
- Resolve o problema 2 porque é uma operação puramente ANGULAR (rotacionar um vetor por um ângulo
  fixo) — não envolve nenhuma distância em metros nem precisa saber o raio do planeta atual.

## Obstáculo de ambiente encontrado (novo, diferente do já conhecido)

Testar ao vivo esbarrou numa trava NUNCA vista antes nesta sessão: o navegador de automação ficou
preso 3+ minutos (em mais de uma tentativa, inclusive numa aba NOVA, com baixo uso de memória —
116MB de 4GB) numa tela "Carregando o mundo 3D..." sem `window.__engine`/`window.__scene` nunca
aparecerem. Isolado como DIFERENTE do bloqueio já conhecido de `waitForVisible()` (que só afeta a
fase de construção da cena, DEPOIS de `new Engine()`/`new Scene()`): desta vez a trava era ANTES
disso, na fase de BENCHMARK DE GPU (`gpuTier === 'pending'`, roda num `Engine`/canvas sintéticos
separados, antes da cena de verdade existir) — benchmark baseado em medir frames reais via loop de
render, que também sofre o mesmo throttle de `requestAnimationFrame` de aba em segundo plano já
documentado na memória desta sessão pro RESTO do jogo, só que num estágio anterior que eu nunca
tinha precisado contornar antes (os bypasses anteriores só cobriam `waitForVisible`).

Contornado sem nenhuma mudança de código: o próprio projeto já tem um parâmetro de URL de
depuração pronto para isso, `?gpuTier=strong` (função `developmentGpuTierOverride`, só ativa em
`import.meta.env.DEV`), que pula o benchmark inteiro. Descoberta útil registrada aqui pra sessões
futuras — evita repetir minutos de investigação do mesmo sintoma.

## Decisões técnicas tomadas

- **Correção angular fixa (`CAMERA_UP_LOOK_AHEAD_ANGLE = 0.2` rad) em vez de uma âncora por
  posição.** Ver "Por que a v1 foi substituída" acima — resolve os dois achados do Copilot pela
  raiz, não só ajustando números.
- **0,2 rad (~11,5°) escolhido por medição ao vivo, não só cálculo.** Testado em 3 abordagens
  diferentes (ângulos/distâncias de caminhada variados) até parar perto da escolinha: o ângulo até
  o `localUp` real da escolinha caiu de forma CONSISTENTE em todos os casos — 25,3°→12,8°,
  16,4°→4,3°, 7,5°→4,0° — nunca piorou, diferente da v1 (que podia piorar dependendo de onde o
  jogador parasse).
- **Reaproveitado o idioma já existente no arquivo pra rotacionar um vetor em torno de um eixo
  arbitrário** (`Vector3.TransformCoordinates(dir, Matrix.RotationAxis(eixo, ângulo))`, mesmo
  padrão já usado nas linhas ~7462/~7526 deste arquivo) em vez de introduzir uma técnica nova.
- **Medição com movimento de verdade, não teleporte instantâneo.** Mesma lição do lab-258/da v1
  descartada: `__debugTeleportExact` direto no ponto final não reproduz honestamente "o jogador
  andou e parou nesse lugar" — os testes usaram `keydown`/`keyup` de "w" a partir de pontos mais
  distantes, deixando o personagem andar e parar sozinho.

## Pendências / dívidas conhecidas

- **Redução medida varia com a geometria do caso (25-73% de corte no ângulo pendente), não é um
  valor fixo.** Esperado — a correção é uma INCLINAÇÃO FIXA de 0,2 rad, então o quanto ela ajuda
  depende de quão alinhado `camFacing` já está com a direção do prédio. Quando o jogador olha
  quase direto pra ele, a correção ajuda bastante (medido: até 73% de redução); quando já estava
  quase alinhado por acaso, ajuda menos (medido: ~47%) — mas nunca piorou em nenhum teste.
- **Não testei ao vivo o efeito em seções de parkour** (mesma pendência do lab-258) — inclinar o
  `localUp` na direção de `camFacing` durante um pulo pode, em teoria, ajudar (antecipar o chão à
  frente) ou atrapalhar (se `camFacing` mudar bruscamente no ar); 0,2 rad é um valor moderado
  escolhido pra não ser agressivo demais, mas não foi validado especificamente nessa mecânica.
- Validação do usuário, no mesmo cenário do print (a escolinha "28"), continua sendo o critério
  final.
- A descoberta do `?gpuTier=strong` deveria ser adicionada à documentação de ambiente de sessões
  futuras (não só aqui) — considerar mencionar em `CLAUDE.md` ou numa nota de memória, já que é
  genuinely útil pra qualquer investigação futura que esbarre no mesmo travamento.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as marcadas em `FEATURES.md` foram concluídas (a v1 foi substituída pela v2 antes
de mesclar, não deixada pra trás incompleta).

## O que o próximo laboratório deve desenvolver

- Aguardar confirmação do usuário depois do deploy, no mesmo cenário da escolinha "28".
- Se o usuário ainda achar o tombo perceptível, considerar aumentar `CAMERA_UP_LOOK_AHEAD_ANGLE`
  (ajuste de um único número) — mas medir de novo o efeito em pelo menos 2-3 pontos de parada
  diferentes antes de concluir que ajudou, como feito aqui.
- Se o usuário notar pulos de parkour "estranhos"/desalinhados, é sinal de que a inclinação em
  direção a `camFacing` atrapalha ali — considerar zerar/reduzir a correção especificamente
  enquanto o personagem está no ar.

## Estado do repositório ao final

- Branch: `lab-259-ancora-giro-camera`.
- Suite: 377/377. Lint: zero avisos. `tsc -b`: limpo. Build sem erro novo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
