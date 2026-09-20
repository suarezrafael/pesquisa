# Laboratório 190 — Preview fixo na lojinha durante scroll

Status: concluído (PR #70 mesclada em `main`)
Início: 2026-09-15
Fim: 2026-09-15
Commit inicial: 65b696f370a7c3311ad20db1b669f7b7e8286ac9

## Objetivo do laboratório

Manter o preview 3D do avatar sempre visível ao rolar abas com muitos itens (calças/roupas/chapéus)
na lojinha — hoje o preview rola pra fora da tela junto com a lista, e a criança perde a referência
visual de como o boneco vai ficar antes de escolher.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 205 - Preview fixo na lojinha durante
scroll" (renumerado pra lab-190 na sequência real do repo, mesma convenção de labs anteriores) —
próximo item da "Recomendação priorizada" (seção 7) depois do lab-189, prioridade P0/P1.

## Investigação prévia (leitura do código, antes de codar)

- **Achado real, confirma o backlog**: `AvatarShop.tsx` renderiza `.avatar-preview-3d-wrap` (o
  preview) e `.avatar-shop-grid` (a lista de itens) como filhos NORMAIS, um atrás do outro, dentro
  do MESMO container que rola — `.avatar-shop-modal` (`index.css:1529-1532`,
  `max-height: 80vh; overflow-y: auto`). Sem nenhum `position: sticky`/`fixed` em lugar nenhum —
  rolar a lista rola o preview junto, exatamente como o backlog descreve.
- **Achado real, relacionado ao critério de aceite "botão fechar continua funcionando"**:
  `.modal-close` (`index.css:1266`, o "×") é `position: absolute` — mas seu ancestral posicionado
  mais próximo é o PRÓPRIO `.avatar-shop-modal` (`.modal avatar-shop-modal` na mesma tag,
  `position: relative` vindo de `.modal`), que também é o elemento com `overflow-y: auto`. Nesse
  caso, o `top`/`right` do botão são relativos à caixa de conteúdo do próprio scroll — ou seja, o
  botão de fechar TAMBÉM rola pra fora de vista ao descer a lista, hoje, antes de qualquer mudança
  deste lab. Precisa de verificação ao vivo pra confirmar se isso já é um problema reproduzível (e,
  se for, corrigir junto — está diretamente coberto pelo próprio critério de aceite do backlog).
- **Não existe distinção real de "layout desktop vs. mobile" pra fazer aqui**: o modal inteiro já é
  limitado a `max-width: 440px` (comentário em `index.css:1568-1572`: "o modal da lojinha nunca
  passa de ~440px de largura... mesmo testado numa janela grande de desktop, o conteúdo do modal já
  reflete a largura real de um celular"). O backlog sugere "avaliar coluna fixa/sticky no desktop e
  preview compacto/sticky no mobile", mas como o jogo inteiro já usa um modal estreito de coluna
  única em qualquer tela, a solução converge pra UMA coisa só: preview `sticky` no topo do scroll
  vertical, igual em qualquer largura de viewport — não precisa de um layout lado-a-lado
  separado pro desktop.
- **Performance (risco citado no backlog: "canvas sticky consumir FPS")**: `AvatarPreview3D.tsx`
  já roda `engine.runRenderLoop` continuamente enquanto o modal está aberto (`useEffect` em
  `AvatarPreview3D.tsx:74-165`), INDEPENDENTE de scroll/visibilidade — o canvas já desenha todo
  quadro o tempo inteiro, mesmo hoje (antes deste lab), rolado pra fora de vista ou não. `position:
  sticky` é resolvido pelo motor de layout do navegador (mesma categoria de custo de qualquer
  `position: fixed`/`absolute`, bem mais barato que recalcular posição via JS a cada evento de
  scroll) — não adiciona nenhum custo de RENDER 3D novo, só muda onde o elemento aparece na tela.
  O risco real citado no backlog só se materializaria com uma implementação diferente (JS
  recalculando posição a cada scroll); `sticky` evita isso por construção.

## Funcionalidades planejadas

- [x] Verificação ao vivo (Chrome real): abrir a lojinha numa aba com muitos itens (ex. calças/
  chapéus), rolar até o fim. A correção do preview já estava aplicada quando a verificação
  começou (não houve uma rodada isolada medindo o bug original antes de qualquer código) — o
  achado do botão de fechar sumindo de vista surgiu como efeito colateral observado NESSA mesma
  verificação, não de um teste dedicado ao comportamento antigo (ver "Verificação ao vivo" abaixo).
- [x] Tornar `.avatar-preview-3d-wrap` `position: sticky` no topo do scroll de `.avatar-shop-modal`,
  com fundo sólido (não transparente) pra itens da grade não aparecerem "atrás" dele ao rolar por
  baixo.
- [x] Abas (`.avatar-shop-tabs-wrap`) também ficam `sticky`, junto do preview e do saldo — os três
  agrupados num único wrapper novo (`.avatar-shop-sticky-header`) em vez de 3 `position: sticky`
  separados, evita cálculo de empilhamento manual de `top`/z-index entre eles.
- [x] Corrigido o botão de fechar (`.modal-close`) sumindo de vista ao rolar — confirmado ao vivo
  que reproduzia hoje (ver "Verificação ao vivo" abaixo), critério de aceite explícito do backlog.
- [x] Confirmado ao vivo que trocar de item (cor de mochila) atualiza o preview instantaneamente com
  o novo posicionamento `sticky`, inclusive rolado até o fim da lista.
- [x] Confirmado ao vivo (grade cheia de 25+ itens em "Roupas") que a grade nasce logo abaixo do
  cabeçalho fixo, nunca por baixo dele, NA POSIÇÃO INICIAL de cada rolagem — durante a rolagem em
  si, itens passam transitoriamente por baixo do cabeçalho fixo (característica inerente de
  qualquer cabeçalho `sticky` sobre a mesma lista rolável, ver "Rodada 2" abaixo, não um bug deste
  lab).
- [ ] Regressão do bug do lab-176 (vazamento de material/textura) não teve uma verificação
  dedicada nesta rodada — mudança é 100% CSS/estrutura de wrapper, não mexe em nenhum ponto de
  `dispose()`/troca de peça do `studentFigure.ts`/`World3D.tsx`; risco avaliado como baixíssimo por
  construção, mas sem medição própria (diferente do lab-176/189, que mediram contagem de materiais
  antes/depois).

## Implementação

- `AvatarShop.tsx`: o botão de fechar (`.modal-close`) ganhou um wrapper novo de altura zero
  (`.avatar-shop-close-anchor`, `position: sticky; top: 0; height: 0`) — só existe pra dar ao botão
  (que continua `position: absolute`, inalterado) um ancestral `sticky` próprio, sem empurrar
  `<h2>` pra baixo nem mudar nada visualmente antes do primeiro scroll.
- Preview 3D + saldo de moedas + abas foram agrupados num wrapper novo (`.avatar-shop-sticky-header`,
  `position: sticky; top: 0; background: var(--card)`) — um wrapper só (não 3 `sticky` separados)
  evita ter que calcular manualmente o empilhamento (`top` cumulativo) entre eles.
- `index.css`: as duas classes novas acima, mais um fundo sólido explícito no PRÓPRIO
  `.modal-close` quando dentro da âncora (achado ao vivo, ver rodada abaixo).

## Verificação ao vivo (Chrome real, antes e depois da correção)

Perfil de teste existente (`8e4a3309-dfc2-454e-8c17-3dfbb2f26387`) com `coins` elevado pra 9999
via `localStorage` (só pra desbloquear moeda suficiente pra fluir pelas compras durante o teste,
restaurado ao valor original ao final) — aba "Roupas" escolhida por ter 43 itens no catálogo
(camisa+calça+sapato+mochila), a mais longa da lojinha, mesmo caso citado no próprio backlog.

**Depois de aplicar `position: sticky` no preview/saldo/abas, mas ANTES do fundo sólido no botão de
fechar**: preview/saldo/abas confirmados fixos durante o scroll (rolagem até `scrollHeight` total,
grade de "Mochila" no final da lista visível corretamente por baixo do cabeçalho fixo). Achado real
NOVO nesta verificação: o botão de fechar realmente sumia — não por não estar mais clicável (a
sticky funcionava, `getBoundingClientRect()` confirmou a posição correta), mas porque ele é
`background: none` (estilo `.modal-close` padrão, compartilhado por todo modal do jogo) — assim que
gruda no topo, o texto do parágrafo de instruções que rola por baixo dele passa a aparecer
visualmente colado/misturado com o "×", tornando os dois ilegíveis (confirmado via `zoom` numa
região de 159×122px). Corrigido com fundo sólido (`var(--card)`) + sombra sutil só no `.modal-close`
quando dentro da âncora nova — não afeta o `.modal-close` de nenhum outro modal do jogo.

**Depois da correção completa**: re-verificado do zero — scroll até o fim da lista de "Roupas"
(grade de "Mochila" visível), botão de fechar legível e sem sobreposição de texto por baixo;
clique no botão de fechar FUNCIONOU corretamente mesmo com o modal rolado até o fim (fechou a
lojinha, voltou pro mundo 3D); troca de item (mochila) atualizou o preview instantaneamente com o
modal ainda rolado. Perfil de teste restaurado ao estado original (`coins: 22`,
`unlockedBackpackColorIds: ['mochila_padrao']`, etc.) ao final.

**Pendência disclosed**: viewport mobile/touch real não verificado (mesma limitação de ferramental
já conhecida de vários labs anteriores desta sessão — a verificação de scroll/sticky em si já cobre
o cenário real, já que o modal inteiro sempre renderiza na largura estreita de celular, mesmo em
desktop, ver investigação prévia acima; só o gesto de toque físico em si fica de fora).

## Review automático do Copilot (PR #70)

**Rodada 1** — 1 comentário gerado + 3 suprimidos, todos avaliados individualmente contra o código
e o comportamento real (não só o texto do review):

- **Real, corrigido**: o comentário gerado apontou que `.avatar-shop-close-anchor` (âncora nova do
  botão de fechar) vive DENTRO do padding do `.modal` (1.5rem/1.25rem) — sem compensar, o botão
  herdaria esse padding como recuo extra (antes, sendo filho direto de `.avatar-shop-modal`, ele era
  medido da borda do card, que elementos absolutos ignoram por padrão). Verificado ao vivo via
  `getBoundingClientRect()` ANTES da correção: botão a 25.6px do topo do modal (esperado: 1.6px) e
  a 38.2px da borda direita (esperado: ~3-5px) — confirma exatamente a magnitude apontada pelo
  review. Corrigido com `top`/`right` compensando o padding (`calc(0.1rem - 1.5rem)` /
  `calc(0.2rem - 1.25rem)`). Reverificado ao vivo: topo bate exato (1.6px); direita ficou com um
  resíduo de ~15px a mais que o original — rastreado até a barra de rolagem clássica do Windows/
  Chrome desktop (~15-17px), que reduz a largura de conteúdo disponível pra um elemento de fluxo
  normal (a âncora) mas NÃO reduz a "padding box" que um elemento absoluto usa como referência (o
  botão original, antes deste lab, ignorava esse recorte). Em dispositivos com barra de rolagem
  overlay (a maioria dos celulares/tablets — o público real do jogo), esse resíduo é zero. Aceito
  como resíduo cosmético desktop-only, não perseguido adiante (exigiria JS/`ResizeObserver` pra
  medir a barra de verdade, desproporcional ao ganho).
- **Real, corrigido (achado suprimido, mas avaliado como válido)**: navegar só por teclado (Tab) até
  um botão perto do topo da grade rolava ele só até a borda do container, deixando-o fisicamente
  embaixo do cabeçalho fixo (visível pro mouse, invisível pra quem navega só com teclado) — um
  problema real de acessibilidade, coerente com o critério `[MUST]` de
  `docs/prompts/02-design-profissional.md`. Corrigido com `scroll-margin-top` (18rem, medido ao
  vivo como a altura real do cabeçalho fixo) em `.avatar-shop-modal .avatar-shop-action` — escopado
  só à lojinha, já que outros painéis reaproveitam a mesma classe de botão sem ter cabeçalho fixo
  algum. Verificado ao vivo: focar um botão no fim da lista de "Roupas" agora rola o suficiente pra
  deixá-lo visível claramente ABAIXO do cabeçalho fixo (~180px de folga), não mais escondido.
- **Real, mas não corrigido nesta rodada (achado suprimido)**: em telas de toque, um arrasto vertical
  que comece exatamente sobre o canvas do preview (`touch-action: none`, usado pro giro da câmera)
  não rola mais o modal — antes deste lab isso só acontecia enquanto o preview ainda não tinha
  rolado pra fora de vista; agora é permanente, já que o preview fica sempre fixo no topo. Avaliado
  e não corrigido: (a) a maior parte da largura do modal fora do canvas de 180px continua
  perfeitamente arrastável, (b) o MESMO trade-off já existe hoje em produção sempre que o preview
  está visível na tela (não é um comportamento novo, só passa a ser permanente em vez de temporário),
  (c) sem um dispositivo de toque real pra testar (limitação de ferramental já conhecida de vários
  labs anteriores desta sessão), uma mudança às cegas no gesto do preview arrisca quebrar o giro de
  câmera que já funciona. Disclosed como trade-off aceito, não como bug ignorado.
- **Real, mas não corrigido nesta rodada (achado suprimido)**: em viewports muito baixos (celular
  em paisagem), o cabeçalho fixo (~282px) pode se aproximar ou exceder a altura útil do modal
  (`max-height: 80vh`), deixando pouco ou nenhum espaço pra grade de itens. Este é exatamente o
  risco que o próprio backlog (`docs/gameplay-market-expansion-backlog.md`, "Lab 205") já nomeava
  como "avaliar" antes de resolver de forma definitiva — sem um dispositivo/emulador real de
  viewport baixo (mesma limitação de ferramental de vários labs anteriores), não há como validar
  com confiança uma correção de media query às cegas. Disclosed como risco conhecido, não corrigido.

**Rodada 2** — 0 comentários novos, 6 suprimidos (2 repetiram achados já disclosed acima sem
mudança — arrasto de toque sobre o preview, e viewport baixo; ambos permanecem cientes e não
corrigidos pelo mesmo motivo já registrado). Dos 4 restantes, avaliados individualmente:

- **Falso positivo, investigado e descartado**: o review alegou que o `top: calc(0.1rem - 1.5rem)`
  (correção da rodada 1) empurra o botão de fechar PRA CIMA da borda visível do scrollport ao
  rolar, fazendo-o "desaparecer depois de rolar mesmo estando visível na posição inicial". Testado
  ao vivo contra essa alegação específica: `modal.scrollTop` ajustado pra 300 e depois pro máximo
  (`scrollHeight`, ~2198px) — em ambos os casos, `getBoundingClientRect()` do botão confirma
  `top: 93px` (dentro do `modal.top: 91.4px`, ou seja, DENTRO do scrollport, não acima) E
  `document.elementFromPoint()` no centro do botão confirma que o próprio `.modal-close` é o
  elemento realmente clicável naquele ponto (não coberto por outra coisa). O botão nunca some —
  a alegação não reproduz. Nenhuma mudança de código.
- **Real, corrigido**: `FEATURES.md` marcava como concluído (`[x]`) um item que descrevia uma
  verificação "antes de aplicar qualquer correção" que na prática nunca aconteceu como uma etapa
  isolada — a implementação (CSS/JSX) já estava escrita antes da primeira abertura do navegador
  nesta rodada, e o achado do botão de fechar surgiu como efeito colateral observado durante a
  verificação do preview, não de um teste dedicado ao comportamento antigo. Reescrito pra refletir
  o que de fato aconteceu.
- **Real, mas fora do que dá pra corrigir com confiança nesta sessão**: o `scroll-margin-top`
  (correção da rodada 1) só afeta rolagem disparada por FOCO de teclado — durante rolagem manual
  comum (roda do mouse/arrasto de toque), o cabeçalho fixo continua sendo desenhado por CIMA de
  qualquer item da grade que passe por baixo dele, já que os dois vivem no MESMO container de
  scroll. Tecnicamente correto: o `background` sólido do cabeçalho MASCARA visualmente a
  sobreposição (os itens ficam escondidos atrás dele, não "por baixo" de forma transparente), mas
  não impede que eles fiquem temporariamente inacessíveis ao mouse/toque enquanto passam por trás.
  Isso é uma característica INERENTE de qualquer cabeçalho `sticky` sobre uma lista rolável (o
  mesmo padrão já usado, por exemplo, em cabeçalhos fixos de tabela em qualquer app) — resolver de
  verdade exigiria mover a GRADE pra um scroller secundário separado (o cabeçalho fora do scroll
  container), uma mudança estrutural maior que o escopo deste lab, arriscando quebrar o fade
  visual das abas (`.avatar-shop-tabs-wrap::before/::after`) e o comportamento de `overflow-y` já
  testado. Avaliado como um trade-off aceito do padrão "cabeçalho fixo", não um bug introduzido por
  engano — mas registrado aqui como dívida real, não descartado.

**Rodada 3** — 0 comentários novos, 6 suprimidos (3 marcados "previously missed" — repetição
literal dos 3 trade-offs já disclosed na rodada 2: toque sobre o preview, viewport baixo, e
cabeçalho mascarando itens durante rolagem manual — sem mudança de código, permanecem cientes pelo
mesmo motivo já registrado). Dos 3 restantes, 2 são genuinamente novos:

- **Real, corrigido**: como as abas agora ficam fixas (rodada anterior), dá pra trocar de aba de
  QUALQUER ponto do scroll — antes deste lab, as abas só eram alcançáveis perto do topo (rolavam
  junto com a lista), então esse caso não era prático de acontecer. Trocar de aba não zerava
  `.avatar-shop-modal.scrollTop`, então sair de "Roupas" rolado até o fim pra "Avatares" abria a
  aba nova já no fim dela, escondendo os primeiros itens. Corrigido com um `handleTabClick` novo em
  `AvatarShop.tsx` que zera o scroll ao trocar de aba. Verificado ao vivo:
  `.avatar-shop-modal.scrollTop` medido em 2198 (fim da lista de "Roupas"), cai pra 0 imediatamente
  após clicar em "Avatares".
- **Real, corrigido**: `FEATURES.md` afirmava que a grade "nunca" fica por baixo do cabeçalho fixo,
  contradizendo o próprio trade-off já documentado na rodada 2 (rolagem manual pode mascarar itens
  temporariamente atrás do cabeçalho). Reescrito pra qualificar a afirmação como válida só pra
  posição inicial de cada rolagem, não durante o gesto de rolar em si.

**Rodada 4** — 0 comentários novos, 2 suprimidos, ambos repetição literal de trade-offs já
avaliados e disclosed nas rodadas 2-3 (arrasto de toque sobre o preview; viewport baixo/paisagem
podendo deixar a grade sem área útil) — sem achado novo. Convergência: mesmo critério já usado em
labs anteriores desta sessão (uma rodada que só repete pendências já documentadas, com 0
comentários novos, encerra o ciclo de review).

- Novo catálogo de cosméticos, checkout, mudança de entitlement (explicitamente fora de escopo no
  próprio item do backlog).
- Layout desktop separado com coluna lateral fixa — o modal inteiro já é de largura única e
  estreita em qualquer tela (ver investigação prévia acima), não há "modo desktop" real pra
  desenhar.
- Verificação em viewport mobile/touch real — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão (a verificação de layout sticky em si pode ser feita no navegador
  desktop, já que o modal sempre renderiza na largura estreita; só a parte de toque/gesto real de
  scroll em touchscreen físico fica de fora).
