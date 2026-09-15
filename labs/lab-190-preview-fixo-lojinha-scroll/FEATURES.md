# Laboratório 190 — Preview fixo na lojinha durante scroll

Status: em andamento
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

- [ ] Verificação ao vivo (Chrome real): abrir a lojinha numa aba com muitos itens (ex. calças/
  chapéus), rolar até o fim, confirmar hoje que preview E botão fechar somem de vista (achado
  prévio) antes de aplicar qualquer correção.
- [ ] Tornar `.avatar-preview-3d-wrap` `position: sticky` no topo do scroll de `.avatar-shop-modal`,
  com fundo sólido (não transparente) pra itens da grade não aparecerem "atrás" dele ao rolar por
  baixo.
- [ ] Avaliar (decidir com base em como fica visualmente) se as abas (`.avatar-shop-tabs-wrap`)
  também devem ficar `sticky` logo abaixo do preview — evita ter que rolar de volta ao topo só pra
  trocar de aba, mesmo espírito do critério de aceite, mesmo não sendo o pedido literal do backlog.
- [ ] Corrigir o botão de fechar (`.modal-close`) sumindo de vista ao rolar, se a verificação ao
  vivo confirmar que isso reproduz hoje — critério de aceite explícito do backlog.
- [ ] Confirmar que trocar de item (roupa/chapéu/cor) atualiza o preview instantaneamente mesmo com
  o novo posicionamento `sticky` (não deveria mudar nada nesse comportamento, já que
  `AvatarPreview3D` não muda de lógica, só de posição CSS — mas verificar ao vivo pra ter certeza).
- [ ] Confirmar que o preview `sticky` não cobre botões nem itens da grade (critério de aceite) —
  checar com uma grade de 3 colunas cheia, não só poucos itens.
- [ ] Confirmar que não há regressão no bug corrigido do lab-176 (vazamento de material/textura ao
  trocar peças rapidamente) — esse lab só mexeu em CSS/posicionamento, não na lógica de troca de
  peça em si, mas vale confirmar ao vivo.

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
