# Laboratório 186 — Modal de ranking não bloqueia arrasto do planeta

Status: concluído
Início: 2026-09-15
Fim: 2026-09-15
Commit inicial: 768b9f3ca7669afb6c033ea3709b082176308eac

## Objetivo do laboratório

Investigar e, se ainda reproduzível, corrigir o relato de `docs/gameplay-market-expansion-backlog.md`
("Lab 201"): com o painel de ranking aberto, a área livre do planeta à direita não aceitaria
clique/arrasto — o painel sequestraria o input do canvas inteiro, prejudicando câmera/exploração.

Origem: `docs/gameplay-market-expansion-backlog.md`, seção 4 ("Backlog ampliado"), "Lab 201 -
Modal de ranking não bloqueia arrasto do planeta" — primeiro item da "Recomendação priorizada"
(seção 7) do documento, o único backlog de código ainda não mapeado em nenhum lab existente
(`docs/growth-retention-monetization-backlog.md` e `docs/market-metrics-engagement-backlog.md`
já estão esgotados de itens de código — ver `labs/lab-184-qualidade-visual-planetas/CONTEXT.md` e
o histórico em `labs/CURRENT.md`). Numeração do lab segue a sequência real do repositório (185 já
usado por um lab anterior fora de ordem), não o número "201" do documento — mesma convenção já
usada em vários labs passados (ex. "Lab 165" do documento virou lab-166 no repo).

## Investigação prévia (leitura do código, antes de codar)

Lida a implementação atual do ranking (`RankingPanel.tsx`, montagem em `World3D.tsx` linha
~12704, `hudInert`/`rankingOpen` linha ~12521) e do giro de câmera por arrasto (`onCameraPointerDown`
em `World3D.tsx`, ~linha 3083):

- **`RankingPanel` NÃO é um `.modal-overlay` de tela cheia** — usa a classe `.chat-panel`
  (`position: absolute; right: 1rem; bottom: 1rem; width: min(320px, ...)`, `z-index: 20`), o
  mesmo padrão do painel de chat: uma caixa pequena ancorada no canto inferior direito, sem
  nenhum backdrop cobrindo o resto da tela. Diferente de outros painéis do jogo
  (`AvatarShop`/`PlanetPickerPanel`/etc.), que usam `.modal-overlay` (tela cheia).
- **`onCameraPointerDown` (o handler que inicia o giro de câmera) não checa `rankingOpen` nem
  `hudInert` em lugar nenhum** — só decide entre joystick (metade esquerda do canvas) e câmera
  (metade direita), sem nenhuma condição de "painel aberto". `rankingOpen` só entra em `hudInert`,
  que gate teclado/joystick de MOVIMENTO (achado dos labs 182/183 desta mesma sessão), não o giro
  de câmera por arrasto do mouse/touch.
- **Achado real (encontrado só depois de olhar o `<canvas>` em si, não os handlers de câmera)**:
  `<canvas ref={canvasRef} className="world3d-canvas" inert={hudInert} />` — o CANVAS INTEIRO
  recebe o atributo HTML `inert` sempre que `hudInert` é `true`, e `rankingOpen`/`chatOpen` fazem
  parte de `hudInert`. Por spec, `inert` desabilita foco E EVENTOS DE PONTEIRO no elemento inteiro
  (não só nos filhos focáveis) — então o canvas inteiro, incluindo toda a área livre do planeta,
  fica não-interativo pra clique/arrasto real enquanto QUALQUER gatilho de `hudInert` está ativo,
  não só os modais de tela cheia onde isso faz sentido (não tem área livre visível atrás deles).
  `chat`/`ranking` são os ÚNICOS dois gatilhos que NÃO são um `.modal-overlay` de tela cheia — são
  uma caixinha pequena ancorada num canto, com bastante área livre do canvas visível ao redor.
  Confirmado ao vivo: `canvas.inert === true` com o ranking aberto (antes da correção).

## Funcionalidades planejadas

- [x] Verificação ao vivo (Chrome real): abrir o ranking e ler `canvas.inert` direto no
  `window.__scene`/DOM — confirmado `true` com o ranking aberto (achado real, ver acima).
  Tentativas de medir o efeito exato num arrasto simulado via automação deram resultados
  inconsistentes entre os dois métodos disponíveis (despachar `PointerEvent` direto no canvas via
  JS ignora `inert` por completo, do mesmo jeito que `.click()` ignora `pointer-events: none`; já
  o clique/arrasto sintético da ferramenta de automação girou a câmera mesmo com `inert=true`,
  sugerindo que o mecanismo de input de baixo nível usado pela automação também não respeita
  `inert` da mesma forma que um clique real de hardware respeitaria) — nenhum dos dois métodos
  desta sessão consegue confirmar com certeza o comportamento de UM CLIQUE REAL de mouse/touque
  contra um elemento `inert`. A confiança na correção vem da leitura da especificação HTML (`inert`
  documentado como desabilitando eventos de ponteiro no elemento) e da mudança de estado
  verificável (`canvas.inert` volta a `false` com ranking/chat abertos, depois da correção).
- [x] **Corrigido**: `canvasInert` novo (exclui `chatOpen`/`rankingOpen` de `hudInert`) usado só no
  atributo `inert` do `<canvas>`; `hudInert` (com os dois gatilhos) continua valendo pra tudo mais
  (`hudInertRef`, supressão de teclado/joystick de movimento no loop de física, e o resto do HUD de
  toque) — critérios de aceite do backlog atendidos por construção: painel continua sendo um
  elemento DOM normal (não-inert) capturando seus próprios cliques; canvas fora do painel volta a
  aceitar ponteiro; fechar o painel continua funcionando (não mexido); mobile não verificado (ver
  pendência).

## Fora de escopo (explicitamente adiado)

- Redesenhar o ranking (dados exibidos, abas online/local) — só o comportamento de captura de
  input, se houver um achado real.
- Liberar chat/ranking sem auditoria de segurança (fora de escopo do próprio item do backlog).
- Os outros itens do mesmo lote recomendado (Lab 202-205) — cada um vira seu próprio lab, mesma
  convenção de manter cada laboratório pequeno o suficiente pra caber num `CONTEXT.md` legível.
