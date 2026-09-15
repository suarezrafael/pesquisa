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
atrás deles pra interagir mesmo) — mas `chatOpen`/`rankingOpen`/`bagOpen` (mochila) são os ÚNICOS
TRÊS gatilhos que NÃO são tela cheia: usam `.chat-panel` (`position: absolute`, uma caixinha
pequena ancorada num canto), deixando bastante área livre do canvas visível ao redor
(`bagOpen`/`WeaponBagPanel` só foi identificado como parte desse grupo na 2ª rodada de review — a
investigação inicial olhou só `RankingPanel`/`ChatPanel`). Confirmado ao vivo:
`document.querySelector('canvas').inert === true` com o ranking aberto, antes da correção.

**Correção**: `fullScreenInert` novo, isolando só os gatilhos que SÃO tela cheia de verdade
(`!setupReady || suspendTriggers || planetPickerOpen || showParentalGate`) — é a base tanto de
`hudInert = fullScreenInert || chatOpen || rankingOpen || bagOpen` (usado, via `hudInertRef`, pra
suprimir teclado/joystick de movimento durante os 7 gatilhos, achado dos labs 182/183 desta mesma
sessão, não relacionado a este) quanto de `canvasInert = fullScreenInert` (usado SÓ no atributo
`inert` do `<canvas>`). Ou seja: o avatar continua sem se mover atrás de qualquer um dos painéis
pequenos (comportamento já correto, inalterado), mas o `<canvas>` em si volta a aceitar ponteiro/
arrasto na área livre enquanto só chat/ranking/mochila estão abertos. Fatorar as duas fórmulas a
partir da MESMA base (`fullScreenInert`) — em vez de escrever a lista de gatilhos de tela cheia
duas vezes, uma pra cada variável — foi um achado da 2ª rodada de review (a duplicação inicial já
tinha um bug de verdade, ver "Review automático" abaixo).

**Por que isso não reabre o bug original do `inert`** (lab-121: "Tab escapava de um modal aberto
direto pro canvas"): `RankingPanel`/`ChatPanel`/`WeaponBagPanel` já usam o hook compartilhado
`useModalA11y` (`state/useModalA11y.ts`), que tem seu próprio focus trap de Tab (hardenizado em
várias rodadas de review nos labs 182/183 desta mesma sessão, e ganhou um listener de `focusin`
nesta 1ª rodada de review deste lab — ver abaixo) — a prevenção de escape de foco já é
responsabilidade dessa camada, independente do `inert` do canvas. Excluir os três gatilhos de
`canvasInert` não reintroduz o escape; os outros 4 gatilhos de tela cheia continuam com o canvas
`inert`, cobrindo o resto dos casos exatamente como antes.

`npx tsc -b` limpo; testes: app 208/208 (inalterado — mudança é 1 variável derivada + 1 prop JSX,
sem lógica de domínio). `npm run build` sem regressão de bundle.

## Decisões técnicas tomadas

- **Não remover `inert` do canvas por completo, só excluir 3 dos 7 gatilhos.** Os outros 4
  (`!setupReady`, `suspendTriggers`, `planetPickerOpen`, `showParentalGate` — `fullScreenInert`)
  são todos `.modal-overlay` de tela cheia de verdade — não têm área livre visível atrás deles,
  então `inert` no canvas inteiro continua correto e necessário ali (previne Tab escapar E
  qualquer clique fantasma atrás de um overlay opaco).
- **Não mexer em `onCameraPointerDown`/`onCameraPointerMove` etc.** A investigação prévia (leitura
  desses handlers, documentada no `FEATURES.md`) já mostrou que eles não têm nenhuma lógica de
  bloqueio — o problema estava inteiramente na camada HTML/`inert` do canvas, uma camada ACIMA
  desses handlers (se o canvas está `inert`, nenhum desses handlers nem chega a rodar pra eventos
  reais de ponteiro, independente do que eles checam internamente).

## Pendências / dívidas conhecidas

- **Verificação de arrasto real (mouse/toque) não confirmada de forma conclusiva por automação
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

## Review automático do Copilot (PR #66)

- **Rodada 1**: 3 achados reais (mais 2 nits de ortografia corrigidos: "mouse/touque" →
  "mouse/toque" no `CONTEXT.md`/`FEATURES.md`). (1) **O mais sério**: tirar o `<canvas>` do
  `inert` enquanto chat/ranking está aberto reabria uma VARIANTE do bug original que o `inert`
  resolvia (lab-121) — um CLIQUE de mouse no canvas (focável por padrão pelo Babylon.js) rouba o
  foco pra lá diretamente, sem passar pelo trap de Tab de `useModalA11y` nenhuma vez (o trap só
  intercepta Tab quando o foco JÁ está dentro do painel); a partir do canvas focado, o próximo Tab
  segue a ordem padrão do documento e escapa do painel — pior que o bug original, porque nem
  precisa de teclado pra iniciar o escape, só um clique. Corrigido no hook COMPARTILHADO
  `useModalA11y.ts` (beneficia todo painel que usa o hook, não só ranking/chat): um listener de
  `focusin` detecta qualquer foco pousando FORA da raiz do painel e devolve pra raiz
  imediatamente — fecha esse caminho de escape (e qualquer outro "foco pulou pra fora sem passar
  pelo teclado") de uma vez, na mesma camada que já resolve os outros casos de Tab. **Verificado
  ao vivo**: clique real na área livre do canvas com o ranking aberto — `document.activeElement`
  confirmado sendo a raiz do painel, não o canvas (screenshot em
  `evidencias/focus-nao-escapa-do-canvas.jpg`). (2) `canvasInert = hudInert && !chatOpen &&
  !rankingOpen` tinha um bug lógico: se ranking/chat estivesse aberto AO MESMO TEMPO que um
  gatilho de tela cheia (ex. `suspendTriggers`, uma missão ativa), a exclusão derrubava
  `canvasInert` pra `false` mesmo com o overlay de tela cheia por cima — deixando o canvas
  clicável por trás dele. Corrigido reconstruindo `canvasInert` listando só os gatilhos de tela
  cheia direto (`!setupReady || suspendTriggers || bagOpen || planetPickerOpen ||
  showParentalGate`), nunca envolvendo chat/ranking na fórmula, em vez de partir de `hudInert` e
  tentar "subtrair" os dois depois.
- **Rodada 2**: 3 achados reais. (1) **O mais importante**: `WeaponBagPanel` (mochila) TAMBÉM é uma
  caixinha pequena ancorada num canto (`className="chat-panel bag-panel"`, `.bag-panel { top:
  4.6rem; left: 1rem; ... }`, sem nenhum `.modal-overlay`) — exatamente a mesma classe de gap de
  chat/ranking, só que a investigação inicial deste lab (que olhou só `RankingPanel`/`ChatPanel`)
  não pegou. `bagOpen` continuava na lista de gatilhos de `canvasInert` da rodada 1, então abrir a
  mochila ainda deixava o canvas `inert`, bloqueando arrasto na área livre — o próprio bug que este
  lab existe pra corrigir, só que num painel diferente. Corrigido removendo `bagOpen` de
  `canvasInert`. (2) `hudInert`/`canvasInert` duplicavam a lista de gatilhos de tela cheia em dois
  lugares escritos à mão — risco real de divergência futura se alguém adicionasse um gatilho novo
  só numa das duas listas (reabrindo vazamento de input OU bloqueando o mundo à toa). Corrigido
  fatorando `fullScreenInert` compartilhado, do qual as duas derivam
  (`hudInert = fullScreenInert || chatOpen || rankingOpen || bagOpen`,
  `canvasInert = fullScreenInert`). (3) O comentário JSX acima do `<canvas>` (do lab-121) ainda
  dizia que `inert` era sempre necessário "junto com o HUD" pra todo modal, sem mencionar a exceção
  nova de chat/ranking/mochila — contradizia o invariante atual. Corrigido descrevendo os dois
  casos (tela cheia continua com `inert`; painel pequeno não, com o motivo).
- **Rodada 3**: 2 achados reais. (1) **O mais sério**: `chat`/`ranking`/`mochila` têm estados
  independentes em `World3D.tsx` — nada impede, em tese, dois estarem abertos ao mesmo tempo. Com
  dois painéis montados, cada um registra seu PRÓPRIO listener de `focusin` na `window`; um clique
  dentro do painel A dispara um `focusin` cujo alvo está fora da raiz do painel B, o listener de B
  devolve o foco pra raiz de B, o que dispara outro `focusin` cujo alvo (a raiz de B) está fora da
  raiz de A, e o listener de A devolve o foco pra raiz de A — um "ping-pong" que podia travar os
  dois painéis (ou estourar a pilha). Corrigido com um registro COMPARTILHADO (`Set` no escopo do
  módulo, fora do hook) de todas as raízes de painel atualmente montadas — cada instância registra
  a própria raiz ao montar/desmontar, e o `handleFocusIn` só redireciona quando o alvo está fora de
  TODAS as raízes ativas (não só a própria); se o alvo já está dentro de QUALQUER painel aberto,
  ninguém precisa fazer nada — a troca de foco entre dois modais abertos ao mesmo tempo é
  legítima, não um escape. **Verificado ao vivo** que o caso de um painel só continua funcionando
  do mesmo jeito depois da reescrita (clique real no canvas com só o ranking aberto, foco
  confirmado voltando pra raiz do painel); o cenário de dois painéis abertos ao mesmo tempo não foi
  reproduzido ao vivo nesta sessão. **Correção da própria rodada 3**: um teste ao vivo anterior
  parecia mostrar ranking fechando sozinho ao abrir o chat, mas isso NÃO é garantido pelo código —
  `onOpenChat`/`onOpenRanking` (`World3D.tsx`) só chamam `setChatOpen(true)`/`setRankingOpen(true)`
  cada um, nenhum fecha o outro painel, e o CSS compartilhado (`.chat-panel`) comporta os dois
  simultaneamente sem problema (achado da rodada 5 do review, corrigindo esta mesma frase). O botão
  da mochila também só aparece com espada/arma já coletadas, não presentes no perfil de teste — daí
  o cenário de dois painéis simultâneos continuar sem reprodução ao vivo. A correção foi verificada
  por raciocínio passo a passo do algoritmo (rastreado manualmente: a checagem contra o registro
  compartilhado garante terminação em no máximo 1 salto extra por painel, nunca um loop infinito,
  independente de quantos painéis estejam montados).
  (2) Contagem errada no `CONTEXT.md`: "6 gatilhos" onde o certo é 7 (`fullScreenInert`, que já
  soma 4, mais `chatOpen`/`rankingOpen`/`bagOpen`) — corrigido, junto com uma contagem antiga da
  rodada 1 ("2 dos 7"/"outros 5") que também tinha ficado desatualizada depois da rodada 2 (agora é
  "3 dos 7"/"outros 4").
- **Rodada 4**: 1 achado real. `if (rootRef.current) activeModalRoots.delete(rootRef.current)` na
  limpeza do efeito podia falhar silenciosamente — o React pode zerar `ref.current` de um nó sendo
  DESMONTADO antes da função de limpeza de um `useEffect` (não `useLayoutEffect`) rodar, um
  comportamento documentado da biblioteca; se isso acontecer, a checagem `if (rootRef.current)`
  nunca é verdadeira, o `delete` nunca roda, e o nó desmontado fica registrado em
  `activeModalRoots` PRA SEMPRE — abrir/fechar qualquer painel repetidamente faria o `Set` crescer
  sem limite, retendo referências de subárvores DOM já removidas (vazamento de memória) e tornando
  o laço de `handleFocusIn` cada vez mais caro. Corrigido capturando `const root = rootRef.current`
  UMA VEZ no início do efeito (no registro, quando é garantidamente não-nulo) e usando essa
  variável do closure tanto no `.add()` quanto no `.delete()` da limpeza, em vez de reler
  `rootRef.current` nos dois momentos.
- **Rodada 5**: 4 achados (1 sem detalhe novo — "previously missed", código não alterado desde a
  última leitura, sem ação possível) + 3 reais. (1) **O mais importante, arquitetural**: as
  rodadas 3-4 tentaram consertar o problema com um listener de `focusin` POR INSTÂNCIA (um por
  painel), mas isso tem uma falha estrutural própria — com N listeners independentes reagindo ao
  MESMO evento, quem "vence" e pra onde o foco vai depende só da ordem de registro dos hooks, não
  de qual painel é o mais recente/visível; pior, um painel que acabava de MONTAR chamava
  `rootRef.current.focus()` ANTES de se registrar no `Set` compartilhado — se outro painel já
  estivesse aberto, o `focusin` síncrono disparado por esse `.focus()` seria tratado pelo listener
  do painel JÁ existente como "escape total" (a raiz nova ainda não estava no registro), e esse
  listener devolvia o foco pra SI MESMO, roubando o foco inicial do painel recém-aberto antes dele
  conseguir manter o próprio foco. Corrigido com uma reescrita arquitetural: `activeModalRoots`
  virou uma PILHA ordenada (`HTMLElement[]`, não mais um `Set`) e existe um ÚNICO listener de
  `focusin` compartilhado (registrado só quando o primeiro painel monta, removido quando o último
  desmonta) em vez de um por instância — o listener redireciona sempre pro painel do TOPO da pilha
  (o mais recentemente aberto), nunca pra "qualquer um que aconteça de rodar seu próprio código".
  Isso também resolve, de quebra, o achado #2 do review (foco inicial perdido — registrar a raiz na
  pilha ANTES de focá-la garante que o `focusin` do próprio `.focus()` já encontra a raiz nova no
  registro). **Verificado ao vivo** que o caso de painel único continua funcionando exatamente
  igual depois da reescrita (mesmo teste de clique real no canvas + `document.activeElement`
  confirmado na raiz do painel). (3) A frase "a UI atual fecha ranking ao abrir chat — mutuamente
  exclusivos na prática hoje" (registrada na rodada 3) não é garantida pelo código —
  `onOpenChat`/`onOpenRanking` só chamam `setChatOpen(true)`/`setRankingOpen(true)` cada um, nenhum
  fecha o outro painel, e `.chat-panel` comporta os dois ao mesmo tempo sem problema de CSS; um
  teste ao vivo anterior que pareceu mostrar essa exclusão mútua não reflete uma garantia real do
  código. Corrigido removendo a afirmação incorreta. Também atualizada a descrição da PR no GitHub,
  que ainda só mencionava excluir `chatOpen`/`rankingOpen` (sem `bagOpen`) e não mencionava o
  mecanismo de registro compartilhado de foco.

## Estado do repositório ao final

- Branch: `lab-186-ranking-nao-bloqueia-arrasto` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (208/208, inalterado).
  - `cd app && npm run build` (build de produção limpo).
  - `cd app && npm run dev`, abrir o ranking, e no console do navegador rodar
    `document.querySelector('canvas').inert` — deve ser `false` com o painel aberto (era `true`
    antes da correção).
