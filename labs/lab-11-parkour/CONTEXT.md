# Contexto — Laboratório 11 — Parkour

Preenchido em: 2026-08-16
Commit inicial → final: d70199b..bc203c4

## O que foi feito

1. **Bug real corrigido antes de abrir este lab** (commit `d70199b`, fora do escopo formal do lab
   mas na mesma sessão, motivado pelo relato "o pular apertando o espaço não funciona"):
   - **Listener de teclado tardio**: `window.addEventListener('keydown', ...)` era a última coisa
     registrada dentro do `setup()` assíncrono da cena (depois de física WASM, textura HDRI e 18
     modelos glTF de props carregarem) — qualquer tecla pressionada durante esse carregamento
     (vários segundos) era silenciosamente ignorada. Movido pra antes do primeiro `await` de
     `setup()`.
   - **Edge-detection por polling**: a detecção de "acabou de apertar espaço" comparava o estado
     da tecla a cada quadro renderizado; um toque rápido o bastante pra descer E subir entre dois
     quadros nunca era visto como "descendo". Trocado por um latch (`jumpRequested`) setado no
     próprio evento de `keydown`, consumido no quadro seguinte.
   - Ambos confirmados isolando a causa via automação de navegador: um input de teclado real
     chegava em `document.body` normalmente, mas o `keysDown` do jogo continuava vazio até o
     listener ser movido pra cedo; depois da correção, um toque real fez o personagem subir
     (13.551 → 13.643 em dois quadros), sem erros no console.
2. **Parkour** (`World3D.tsx`) — 7 plataformas (`MeshBuilder.CreateBox`, `PhysicsAggregate BOX`)
   subindo em ziguezague num referencial tangente local fixo (mesma aproximação já usada em
   lagoa/piscina — o percurso é pequeno o bastante pra curvatura do planeta ser desprezível ali).
   Espaçamento calculado a partir da física real do pulo (`JUMP_SPEED=5.5`, `GRAVITY=9.81` →
   altura máxima ≈1.54, tempo no ar ≈1.12s): cada degrau sobe 0.85 (bastante folga) e fica a 2.27
   de distância 3D do anterior — dentro do alcance confortável de um pulo normal.
3. **Local do percurso escolhido por busca**, não à mão — varredura de candidatos (grade de
   phi/theta na faixa caminhável) medindo distância angular contra os 4 platôs, lagoa, piscina e
   as 10 escolas/portais, escolhendo o ponto com maior distância mínima (~58° de folga do vizinho
   mais próximo) — mesmo método usado no lab-09 pra achar o lugar da piscina sem esbarrar num
   platô.
4. **Recompensa no topo** — reaproveita o mecanismo de moeda já existente (mesmo array `coins`,
   mesmo material, mesma detecção de proximidade/coleta) em vez de um sistema novo: um item a mais
   no array, zero lógica adicional em outro lugar do código.

## Decisões técnicas tomadas

- **Referencial tangente local fixo pro percurso**, não acompanhando a curvatura da esfera degrau
  a degrau — simplifica a matemática (é só um "staircase" reto num plano) e o erro introduzido pela
  curvatura é desprezível pro tamanho do percurso (~15 unidades de ponta a ponta contra um raio de
  planeta de 13), mesmo raciocínio já usado em lagoa/piscina.
- **Espaçamento derivado das constantes reais de física** (`JUMP_SPEED`/`GRAVITY`/`MAX_SPEED`), não
  um número escolhido de olho — garante que o percurso é literalmente jogável com a mecânica atual,
  não só "parece dar pra pular" visualmente.
- **Recompensa reaproveitando o array `coins`** em vez de um sistema de "conclusão de parkour"
  dedicado — não há necessidade de estado novo (progresso, flag de conclusão) pra um MVP de
  parkour; a moeda no topo já dá o sinal "cheguei" que o `FEATURES.md` pedia.

## Pendências / dívidas conhecidas

- Só um percurso de parkour (não vários, não haviam sido pedidos explicitamente — "ao menos um" no
  `FEATURES.md`).
- Teste de percurso completo (pular plataforma por plataforma até o topo) não foi feito via input
  de jogador de ponta a ponta — verificado por partes: espaçamento calculado e confirmado
  numericamente, colisor confirmado testando o personagem descansando estável sobre a primeira
  plataforma (teleporte via `physicsBody.setTargetTransform`/`disablePreStep` pra testes, não é
  como o jogador chega lá andando), e a mecânica de pulo em si (não a travessia completa) já foi
  extensivamente verificada no bugfix do início desta sessão. Não achado nenhum sinal de problema,
  mas vale um playtest manual de ponta a ponta numa sessão futura.
- Ruas e carros, loja navegável e trovão/raio continuam pendentes (ver lab-10/lab-09).

## Funcionalidades planejadas que NÃO foram concluídas

- **Playthrough real de ponta a ponta** (item 4 do `FEATURES.md`) — parcial. O que foi verificado:
  espaçamento matemático (2.27 entre plataformas, dentro do alcance de pulo), colisor sólido
  (personagem descansa estável sobre a primeira plataforma, testado via teleporte físico), e
  captura de tela confirmando o percurso renderizado. O que falta: um playthrough de verdade
  pulando plataforma por plataforma até o topo com o input real do jogador — não foi feito porque
  reorientar o personagem precisamente em direção a cada próxima plataforma via automação de
  teclado (sem mouse/câmera livre) se mostrou frágil dentro do tempo desta sessão. Recomendo um
  playtest manual (jogador humano) na próxima vez que alguém abrir o jogo.

## O que o próximo laboratório deve desenvolver

Lista pendente, carregada de labs anteriores (nenhum destes foi tocado neste lab):
1. Ruas e carros andando no mundo.
2. Uma loja que dá pra entrar (interior navegável).
3. Trovão/raio como parte do clima dinâmico (chuva já existe desde o lab-10).

Confirmar com o usuário a prioridade — ruas+carros e loja-navegável são bem mais trabalhosos que
trovão/raio.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  avaliar merge/push conforme o usuário preferir).
- Como rodar/verificar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev`
  (em outro). O percurso de parkour fica bem longe do ponto de nascimento — no console do
  navegador (build de DEV), `window.__scene.meshes.filter(m => m.name.startsWith('parkourPlatform'))`
  lista as 7 plataformas.
