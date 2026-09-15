# Laboratório 190 — Preview fixo na lojinha durante scroll

Status: em andamento (PR aberta)
Início: 2026-09-15
Fim: -
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
  chapéus), rolar até o fim, confirmar hoje que preview E botão fechar somem de vista (achado
  prévio) antes de aplicar qualquer correção.
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
- [x] Confirmado ao vivo (grade cheia de 25+ itens em "Roupas") que o cabeçalho fixo não cobre
  itens/botões da grade — a grade nasce logo abaixo do cabeçalho fixo, nunca por baixo dele.
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

**Antes da correção** (antes deste lab existir): não aplicável, esta é a primeira verificação —
a investigação prévia (leitura de código) já tinha identificado a causa raiz corretamente.

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

## Fora de escopo (explicitamente adiado)

- Novo catálogo de cosméticos, checkout, mudança de entitlement (explicitamente fora de escopo no
  próprio item do backlog).
- Layout desktop separado com coluna lateral fixa — o modal inteiro já é de largura única e
  estreita em qualquer tela (ver investigação prévia acima), não há "modo desktop" real pra
  desenhar.
- Verificação em viewport mobile/touch real — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão (a verificação de layout sticky em si pode ser feita no navegador
  desktop, já que o modal sempre renderiza na largura estreita; só a parte de toque/gesto real de
  scroll em touchscreen físico fica de fora).
