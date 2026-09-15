# Contexto — Laboratório 186 — Modal de ranking não bloqueia arrasto do planeta

Preenchido em: 2026-09-15
Commit inicial → final: 768b9f3ca7669afb6c033ea3709b082176308eac..(commit deste lab, ver PR)

## O que foi feito

Investigado e corrigido o relato de `docs/gameplay-market-expansion-backlog.md` ("Lab 201"): com o
painel de ranking aberto, a área livre do planeta não aceitava clique/arrasto.

A causa raiz real só apareceu depois de olhar o próprio elemento `<canvas>`, não os handlers de
câmera (que não têm nenhum achado — ver abaixo): `World3D.tsx` tem
`<canvas ref={canvasRef} className="world3d-canvas" inert={hudInert} />`, e
`hudInert = !setupReady || suspendTriggers || chatOpen || rankingOpen || bagOpen ||
planetPickerOpen || showParentalGate`. O atributo HTML `inert`, por especificação, desabilita foco
E EVENTOS DE PONTEIRO no elemento inteiro (não só em filhos focáveis) — então o `<canvas>` inteiro
ficava não-interativo pra clique/arrasto sempre que QUALQUER gatilho de `hudInert` estava ativo.
Isso é o comportamento certo pros gatilhos que são um `.modal-overlay` de tela cheia (nada visível
atrás deles pra interagir mesmo) — mas `chatOpen`/`rankingOpen` são os ÚNICOS DOIS gatilhos que NÃO
são tela cheia: usam `.chat-panel` (`position: absolute`, uma caixinha pequena ancorada num canto),
deixando bastante área livre do canvas visível ao redor. Confirmado ao vivo:
`document.querySelector('canvas').inert === true` com o ranking aberto, antes da correção.

**Correção**: `canvasInert` novo, derivado de `hudInert` mas excluindo `chatOpen`/`rankingOpen`,
usado SÓ no atributo `inert` do `<canvas>`. `hudInert` em si não muda — continua sendo usado (via
`hudInertRef`) pra suprimir teclado/joystick de movimento no loop de física durante os 7 gatilhos,
incluindo chat/ranking (achado dos labs 182/183 desta mesma sessão, não relacionado a este). Ou
seja: o avatar continua sem se mover atrás do painel de chat/ranking (comportamento já correto,
inalterado), mas o `<canvas>` em si volta a aceitar ponteiro/arrasto na área livre enquanto só
chat/ranking estão abertos.

**Por que isso não reabre o bug original do `inert`** (lab-121: "Tab escapava de um modal aberto
direto pro canvas"): `RankingPanel`/`ChatPanel` já usam o hook compartilhado `useModalA11y`
(`state/useModalA11y.ts`), que tem seu próprio focus trap de Tab (hardenizado em várias rodadas de
review nos labs 182/183 desta mesma sessão) — a prevenção de Tab escapar já é responsabilidade
dessa camada, independente do `inert` do canvas. Excluir só esses dois gatilhos do `canvasInert`
não reintroduz o escape de Tab; os outros 5 gatilhos (`.modal-overlay` de tela cheia) continuam
com o canvas `inert`, cobrindo o resto dos casos exatamente como antes.

`npx tsc -b` limpo; testes: app 208/208 (inalterado — mudança é 1 variável derivada + 1 prop JSX,
sem lógica de domínio). `npm run build` sem regressão de bundle.

## Decisões técnicas tomadas

- **Não remover `inert` do canvas por completo, só excluir 2 dos 7 gatilhos.** Os outros 5
  (`!setupReady`, `suspendTriggers`, `bagOpen`, `planetPickerOpen`, `showParentalGate`) são todos
  `.modal-overlay` de tela cheia de verdade — não têm área livre visível atrás deles, então
  `inert` no canvas inteiro continua correto e necessário ali (previne Tab escapar E qualquer
  clique fantasma atrás de um overlay opaco).
- **Não mexer em `onCameraPointerDown`/`onCameraPointerMove` etc.** A investigação prévia (leitura
  desses handlers, documentada no `FEATURES.md`) já mostrou que eles não têm nenhuma lógica de
  bloqueio — o problema estava inteiramente na camada HTML/`inert` do canvas, uma camada ACIMA
  desses handlers (se o canvas está `inert`, nenhum desses handlers nem chega a rodar pra eventos
  reais de ponteiro, independente do que eles checam internamente).

## Pendências / dívidas conhecidas

- **Verificação de arrasto real (mouse/touque) não confirmada de forma conclusiva por automação
  de navegador** — achado ambiental novo desta sessão, registrado aqui pra futuras sessões de QA
  visual: `canvas.dispatchEvent(new PointerEvent(...))` disparado direto via JS IGNORA `inert`
  por completo (mesma classe de bypass já documentada nesta sessão pra `.click()` ignorar
  `pointer-events: none`) — então não serve pra testar o comportamento real de um clique
  verdadeiro contra um elemento `inert`. Já o clique/arrasto sintético da própria ferramenta de
  automação do navegador (`computer` tool) girou a câmera mesmo com `canvas.inert === true` (antes
  da correção), sugerindo que o mecanismo de injeção de input de baixo nível usado pela automação
  TAMBÉM não respeita `inert` da mesma forma que um clique real de hardware respeitaria. Ou seja:
  nenhum dos dois métodos de teste disponíveis nesta sessão consegue confirmar com certeza o
  comportamento de um clique/toque REAL contra um elemento `inert`. A confiança nesta correção vem
  de duas fontes independentes da automação: (1) a especificação HTML documenta explicitamente que
  `inert` desabilita eventos de ponteiro no elemento; (2) o estado do próprio atributo
  (`canvas.inert`) foi confirmado mudando de `true` pra `false` com ranking/chat abertos, antes e
  depois da correção — a MUDANÇA DE ESTADO em si é verificável mesmo quando o EFEITO fim-a-fim não
  é. Ver `evidencias/ranking-canvas-nao-inert.jpg`.
- **Verificação em viewport mobile/touch não feita** — mesma limitação de ferramental já conhecida
  dos labs 177/178/184.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — a investigação prévia já antecipava os dois desfechos possíveis (reproduzível ou não);
  o achado real foi encontrado (só não exatamente onde a investigação inicial apontou — não nos
  handlers de câmera, mas no atributo `inert` do canvas) e corrigido.

## O que o próximo laboratório deve desenvolver

Próximo item da "Recomendação priorizada" (seção 7) de `docs/gameplay-market-expansion-backlog.md`,
depois deste: **Lab 202 - Objetos do mundo alinhados ao relevo** (numeração do documento —
renumerar pra sequência real do repo ao iniciar, mesma convenção deste lab). Ver seção 4 do
documento pro escopo completo desse item.

## Estado do repositório ao final

- Branch: `lab-186-ranking-nao-bloqueia-arrasto` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (208/208, inalterado).
  - `cd app && npm run build` (build de produção limpo).
  - `cd app && npm run dev`, abrir o ranking, e no console do navegador rodar
    `document.querySelector('canvas').inert` — deve ser `false` com o painel aberto (era `true`
    antes da correção).
