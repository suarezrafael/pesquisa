# Contexto — Laboratório 259 — Âncora que limita o giro da câmera de vez

Preenchido em: 2026-10-05
Commit inicial → final: 2bfd0a975127b035b17c0e6239ff6bf44a4fb619..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx`:
  - Nova constante `CAMERA_UP_ANCHOR_RADIUS = 2` (metros), perto de `CAMERA_DISTANCE`/
    `CAMERA_HEIGHT`.
  - Novo estado persistente `let cameraUpAnchor = spawnUp.clone()` e
    `let cameraUpAnchorPos = avatarMesh.position.clone()`, declarado junto da inicialização da
    câmera (`camera.upVector = spawnUp`).
  - No laço de atualização da câmera a pé: antes de `camera.upVector = Vector3.Lerp(...)`, checa
    `Vector3.Distance(pos, cameraUpAnchorPos)` contra `CAMERA_UP_ANCHOR_RADIUS` — se excedeu,
    reancora (`cameraUpAnchor.copyFrom(localUp)`, `cameraUpAnchorPos.copyFrom(pos)`). A câmera
    então faz lerp pra `cameraUpAnchor` (não mais direto pro `localUp` exato do jogador).

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

- **Âncora por DISTÂNCIA percorrida, não por tempo parado.** Cogitei (e descartei) uma referência
  com atraso baseado em tempo (ex.: lerp bem mais lento) — isso só atrasa, nunca limita de
  verdade, como já provado insuficiente pelo próprio lab-258. Uma âncora por distância dá um
  limite de verdade: parado (distância não muda), a âncora nunca se move, então a câmera nunca
  ultrapassa o ângulo que a âncora representa.
- **Reancorar é automático, sem tratamento especial em nenhum ponto de transição.** Validei esse
  raciocínio ao vivo: teleportar pra longe e checar de novo mostra a âncora se atualizando sozinha
  assim que a distância excede o raio — nenhum reset explícito foi necessário em nenhum lugar do
  código pra portais/carro/foguete/interior de casa, porque QUALQUER mudança grande de posição
  (inclusive instantânea) já dispara a mesma checagem de distância no quadro seguinte.
- **Raio de 2 metros**, escolhido pelo mesmo raciocínio geométrico do lab-258: dá até
  `2/13 ≈ 0,154 rad ≈ 8,8°` de inclinação residual nos arredores imediatos do jogador — valor
  pequeno o bastante pra ficar sutil perto dos próprios pés, mas que já corta a maior parte dos
  ~25° medidos originalmente pra objetos a 6-7m de distância.
- **Teste ao vivo com movimento de verdade, não teleporte instantâneo.** Primeira tentativa de
  teste usou `__debugTeleportExact` direto no ponto final — isso SEMPRE reancora exatamente no
  alvo (gap 0 por construção), mascarando completamente o comportamento real. Corrigido simulando
  a entrada de teclado (`keydown`/`keyup` de "w") a partir de um ponto mais distante, deixando o
  personagem andar e parar sozinho — só assim o teste reproduz honestamente o caso "parei no meio
  do caminho entre duas âncoras", que é o caso comum de verdade.
- **Medição de pixel/ângulo real, não só leitura de código.** Confirmado com raycast/matemática ao
  vivo que o ângulo pendente agora PLATEIA (1,93° estável por 2-5s, diferente de convergir a 0,00°
  como acontecia antes) e com uma captura de tela mostrando a escolinha/Torre do Tesouro
  visivelmente mais retas no mesmo cenário do print do usuário.

## Pendências / dívidas conhecidas

- **O valor do platô pode variar um pouco com o tempo mesmo "parado de verdade"** (medido: 1,93°
  em 5s, 4,25° em 10s) — provavelmente um pequeno drift de posição (animação de respiração/balanço
  do personagem parado, não física/gravidade — já confirmado que a física fica congelada depois de
  `__debugTeleportExact`). Não invalida a conclusão principal (nunca converge a zero), só significa
  que o ângulo residual não é um número fixo único, varia dentro de uma faixa pequena.
- Validação do usuário, no mesmo cenário do print (a escolinha "28"), continua sendo o critério
  final.
- A descoberta do `?gpuTier=strong` deveria ser adicionada à documentação de ambiente de sessões
  futuras (não só aqui) — considerar mencionar em `CLAUDE.md` ou numa nota de memória, já que é
  genuinely útil pra qualquer investigação futura que esbarre no mesmo travamento.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as marcadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

- Aguardar confirmação do usuário depois do deploy, no mesmo cenário da escolinha "28".
- Se o usuário ainda achar o tombo perceptível, considerar reduzir `CAMERA_UP_ANCHOR_RADIUS` (dá
  menos inclinação residual nos arredores do jogador, mas objetos um pouco mais distantes ainda
  mostrariam algum tombo) — ajuste de um único número, fácil de iterar.
- Se o usuário notar o CHÃO perto dos próprios pés parecendo errado/inclinado de um jeito
  perceptível e incômodo, é sinal de que o raio de 2m está grande demais — mesma mudança, direção
  oposta.

## Estado do repositório ao final

- Branch: `lab-259-ancora-giro-camera`.
- Suite: 377/377. Lint: zero avisos. `tsc -b`: limpo. Build sem erro novo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
