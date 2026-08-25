# Laboratório 91 — dashboard de progresso pros responsáveis + lojinha mobile-first

Status: em andamento
Início: 2026-08-24
Fim: -
Commit inicial: 621ffc3630da026cb601b1e781814906ea47270a

## Objetivo do laboratório
Pedido direto do usuário: quer recursos que ajudem o responsável a acompanhar o que a criança
está fazendo no jogo, além de verificar/corrigir a responsividade da lojinha (que ganhou mais
itens nos últimos laboratórios). O pedido veio junto com outros três pedidos maiores (mais itens
colecionáveis, um móvel "centro de estudo"/carteira com catálogo de conquistas, e um brinde ao
vencer o chefe de Marte) — ver `labs/CURRENT.md` pra onde esses ficaram registrados como próximos
laboratórios. Este aqui cobre só os dois itens abaixo, do tamanho certo pra uma iteração.

### Dashboard de progresso (grounded em prompt.md §15)
`prompt.md` linha 175 já especifica: "Portal dos responsáveis: rota separada dentro do próprio
PWA (`/familia`)... contendo **dashboard de progresso dos filhos** + tela de assinatura." Isso é
P1 do backlog (seção 6), não um "nice to have" — e `FamilyPortal.tsx` hoje (495 linhas) tem ZERO
conteúdo de progresso, só login/assinatura/pareamento.

Restrição de arquitetura que define o design: o jogo não tem conta pra criança nem backend de
gameplay (`localStorage` só, por design — ver `CLAUDE.md`/`README.md`, "nunca gate quests/
progressão... sem PII de criança"). Não dá pra um responsável abrir `/familia` no PRÓPRIO
aparelho (longe de casa) e ver progresso em tempo real sem inventar uma sincronização nova — isso
seria uma mudança de arquitetura grande (dado de criança passando a viver no servidor), a mesma
categoria de decisão que ficou de fora no G6 do lab-90 (progresso sem backup). Fora de escopo
aqui, de propósito.

O que DÁ pra fazer sem tocar em arquitetura nenhuma: `/familia` já é a mesma origem do jogo — o
link "Abrir área dos responsáveis" (lab-88) já abre `/familia` no MESMO navegador, então o
`localStorage` já é compartilhado nesse fluxo mais comum (responsável abre no mesmo
celular/tablet que a criança usa). Ler `profile`/`progress` do `localStorage` local e mostrar num
painel dentro do Dashboard cobre o pedido do usuário sem nenhum dado de criança sair do aparelho.

### Lojinha responsiva/mobile-first (verificação pedida pelo usuário)
Testado ao vivo (dev server): abas já existem desde o lab-87 (`.avatar-shop-tabs`), mas achados
reais:
1. A fila de abas estoura a largura do modal (`Avatares | Chapéus | Roupas | Cabelo` não cabe) e
   depende de scroll horizontal sem nenhuma pista visual limpa — a última aba visível fica cortada
   no meio da palavra.
2. `.avatar-shop-tab` e `.avatar-shop-action` (botão "Usar"/comprar) estão os dois ABAIXO do
   requisito `[MUST]` de `docs/prompts/02-design-profissional.md` linha 35: "Alvos de toque... no
   mínimo 44×44px lógicos". Medido: `.avatar-shop-tab` ≈ 35px de altura, `.avatar-shop-action` ≈
   27px — os dois claramente abaixo do mínimo, mais sério que o corte visual da aba.

## Funcionalidades planejadas
- [ ] **`lastPlayedAt` local**: nova função em `state/storage.ts` (`touchLastPlayed`/
  `loadLastPlayedAt`), gravada uma vez por sessão em `GameApp` quando o perfil existe.
- [ ] **Painel "Progresso" no `/familia`**: novo componente lido a partir de `loadProfile()`/
  `loadProgress()`/`loadLastPlayedAt()` (mesmo `state/storage.ts` do jogo) — mostra avatar/apelido,
  nível + barra de XP, moedas, missões concluídas (X de Y), badges conquistados, última vez
  jogado. Estado vazio explícito quando não há perfil salvo neste aparelho, explicando que o
  painel mostra o progresso DESTE aparelho/navegador, não de um outro.
- [ ] **Corrigir alvo de toque da lojinha**: `.avatar-shop-tab` e `.avatar-shop-action` chegam a
  44×44px lógicos mínimos, sem quebrar o layout em grade de 3 colunas dos itens.
- [ ] **Corrigir overflow das abas**: pista visual limpa de "tem mais abas" (fade na borda) em vez
  de cortar o texto da última aba no meio.
- [ ] **Testar ao vivo** (dev server, viewport ~375-440px, que é a largura real do modal
  independente do tamanho da janela): painel de progresso com perfil real e com `localStorage`
  vazio; lojinha com todas as abas visíveis/alcançáveis e alvos de toque maiores.
- [ ] **Deploy em produção** (só frontend).

## Fora de escopo (explicitamente adiado — ver labs seguintes)
- **Mais itens colecionáveis (free + assinatura)** — próximo laboratório recomendado depois
  deste; conteúdo puro, não depende de nenhuma decisão de arquitetura.
- **"Centro de estudo"/carteira onde o boneco senta + acessa catálogo de conquistas** — peça de
  mobiliário nova (provavelmente um novo tipo de objeto interativo no mundo 3D, parecido com as
  escolinhas) + uma UI de conquistas dedicada (hoje só existe a lista de badges dentro do
  `RankingPanel`/`QuestListOverlay`, não uma tela própria). Laboratório à parte pelo tamanho.
- **Brinde ao vencer o chefe de Marte (ETs + robô)** — pesquisado rapidamente o que é atrativo no
  mercado brasileiro (ver seção acima): tendência forte de colecionáveis/trading-card-style
  (Pokémon, Squishmallows). Como o jogo não coleta endereço/PII de criança, um brinde FÍSICO está
  descartado — vira um colecionável exclusivo dentro do jogo. Fica pro laboratório de
  colecionáveis ou um próprio, a definir.
