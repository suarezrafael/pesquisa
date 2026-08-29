# Contexto — Laboratório 120 — Auditoria de acessibilidade WCAG AA

Preenchido em: 2026-08-29
Commit inicial → final: 4153c2f..HEAD (mudança de código concentrada num único arquivo,
`app/src/index.css`, commitada ao final deste laboratório)

## O que foi feito

Auditoria sistemática (nunca antes feita neste projeto) de todo `app/src/index.css` contra os 3
requisitos `[MUST]` de `docs/prompts/02-design-profissional.md` §3: contraste AA, alvo de toque
44×44px, nunca transmitir informação só por cor. Medição real via scripts Node (fórmula oficial de
luminância relativa do WCAG), não estimativa visual — ver `FEATURES.md` para a lista completa dos
9 pares texto/fundo medidos como reprovados antes da correção.

Correções aplicadas em `app/src/index.css`:
- **Tokens de design escurecidos no `:root`** (preservando matiz/saturação, escurecendo só
  luminosidade via HSL, com margem de segurança ~4.5-4.7:1): `--primary-dark`
  (`#d9457f`→`#d63473`), `--accent-dark` (`#4a9fac`→`#35717a`), `--success` (`#4caf50`→`#39843c`),
  `--danger` (`#e05454`→`#db3636`). `--primary` (cor de fundo dos botões) ficou intocada — só os 2
  usos dela como TEXTO (`.reward-bonus-line`, `.ranking-row-self`) foram trocados pra
  `var(--primary-dark)`.
- **3 cores soltas substituídas por tom equivalente escurecido** (sem virar token novo — poucos
  usos cada, criar token seria over-engineering pra este laboratório): `#6b76a0`→`#68739e` (4 usos:
  `.field-hint`, `.text-button`, `.progress-panel-stat span`, `.legal-updated`),
  `#8a94b8`→`#6774a3` (3 usos: `.modal-close`, `.ranking-place`, `.chat-empty`),
  `#9a6b1a`→`#845c16` (2 usos: `.progress-panel-badge`, `.avatar-shop-tag.subscription-lock`).
- **`.modal-close`** (× de fechar, presente em todo modal do jogo) ganhou `min-width`/
  `min-height: 44px` + centralização flex do glifo — mesmo padrão já usado em
  `.avatar-shop-action` (lab-91).
- **`.help-button`** (todos os ícones da fileira do HUD) teve o piso do `clamp()` subido de
  `1.4rem`/`22.4px` pra `2.75rem`/`44px` (width/height) e o `font-size` recalibrado
  proporcionalmente; **`.hud-top-row`** ganhou `flex-wrap: wrap` como rede de segurança contra
  estouro de tela em telas mais estreitas que as já testadas nos labs 57-59.

## Decisões técnicas tomadas

- **Escurecer os TOKENS, não sobrescrever caso a caso**: os 4 tokens são reutilizados em várias
  telas — exatamente o padrão que `02-design-profissional.md` §4 pede ("tokens... com contraste já
  validado"). Confirmado usage-por-usage antes de escurecer que nenhum dos 4 é usado como FUNDO de
  um jeito que escurecer prejudicaria (`--success`/`--danger` só em borda+texto; `--accent-dark`
  tem um uso de fundo, `.xp-bar-fill`, uma barra sem texto em cima; `--primary-dark` nunca é fundo).
- **`.help-button` + `.hud-top-row`**: a tensão real era 44px MUST vs. o bug de estouro de tela já
  resolvido nos labs 57-59 numa tela física estreita ("Poco C75"). Resolvido com as DUAS mudanças
  juntas (piso maior + `flex-wrap`) em vez de escolher uma: na pior das hipóteses os ícones quebram
  pra uma segunda linha em vez de estourar/cortar.
- **Sem mudança em `.quest-choice`/mensagem de feedback além de cor** — a combinação
  texto+emoji já existente em `QuestModal.tsx` ("Isso aí!... ✨" vs "Quase!... 💪") já evita
  depender só de cor; considerado suficiente pro 3º MUST, sem código novo.
- **Limitação de ferramenta descoberta durante a verificação**: `mcp__claude-in-chrome__resize_window`
  não teve NENHUM efeito no viewport real deste ambiente (`window.innerWidth`/`innerHeight`
  inalterados em 3 tentativas — 360×700, 380×720, 800×600 — com `outerWidth` inclusive menor que
  `innerWidth`, uma combinação logicamente impossível num navegador normal, indicando que o
  tamanho de janela reportado está desacoplado do viewport de renderização real). Contornado com
  (a) o argumento matemático de que `clamp(MIN, preferred, MAX)` nunca cai abaixo de MIN
  independente do termo do meio, e (b) forçando `document.querySelector('.hud-overlay').style.width
  = '340px'` via `javascript_tool` pra simular um contêiner estreito e confirmar visualmente que o
  `flex-wrap` quebra pra 2 linhas sem cortar/sobrepor ícone nenhum, revertendo o estilo logo depois.

## Pendências / dívidas conhecidas

- Nenhuma dívida nova introduzida por este laboratório.
- Itens `[SHOULD]` de `02-design-profissional.md` §3 (zoom de fonte do sistema sem quebrar layout,
  navegação por teclado/leitor de tela nos painéis 2D) ficaram fora de escopo — ver "Fora de
  escopo" em `FEATURES.md`.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Sem uma prioridade única e óbvia — o backlog de itens que dependem só de código (sem credencial ou
decisão de produto pendente do usuário) está mais curto agora. Candidatos remanescentes documentados
em `labs/CURRENT.md`: (1) itens `[SHOULD]` de acessibilidade não cobertos aqui (zoom de fonte,
navegação por teclado/leitor de tela); (2) o bug de morros/platôs invisíveis do lab-95, que ficou
sem resolver e sem resposta do usuário sobre o aparelho afetado; (3) revisitar o code-splitting de
`studentFigure.ts` (chunk de 3,68MB, identificado no lab-117 como acoplamento interno do próprio
Babylon.js, fora de escopo daquele laboratório). Perguntar ao usuário antes de escolher, como de
costume.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 47/47 passando (nenhum teste novo — mudança é só CSS, sem lógica de
  domínio nova).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local, `npm run dev`, porta 5186 + browser automation): perfil de
  teste "LigeiroEstrela" (criado nesta sessão de verificação, descartável) usado para: (1) responder
  quest q01 corretamente e confirmar `.reward-bonus-line` renderizando na cor `--primary-dark` nova,
  mais legível; (2) abrir modal da quest q02 e confirmar a etiqueta `.quest-type-tag` escurecida;
  (3) ler `getComputedStyle(document.documentElement)` direto e confirmar os 4 valores de `:root`
  (`--success`, `--danger`, `--accent-dark`, `--primary-dark`) batendo exatamente com os novos hex;
  (4) simular um contêiner HUD estreito via DOM e confirmar o `flex-wrap` funcionando sem estouro;
  (5) checar console sem erros/exceções após todas as interações acima.
- Como verificar de novo: `cd app && npm run dev`, abrir o jogo, forçar qualquer resposta de quest
  e observar a cor do texto de recompensa/feedback; inspecionar `.help-button`/`.modal-close` com
  as devtools do navegador confirmando `min-width`/`min-height` ≥44px computados.
