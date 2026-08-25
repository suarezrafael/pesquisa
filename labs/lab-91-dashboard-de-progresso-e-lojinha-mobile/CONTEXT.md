# Contexto — Laboratório 91 — dashboard de progresso pros responsáveis + lojinha mobile-first

Preenchido em: 2026-08-24
Commit inicial → final: 621ffc3630da026cb601b1e781814906ea47270a..HEAD

## O que foi feito
- **`app/src/state/storage.ts`**: `touchLastPlayed()`/`loadLastPlayedAt()`, novo localStorage key
  `jogo-educativo:lastPlayedAt` — um único timestamp ISO sobrescrito a cada abertura do jogo com
  perfil já criado, não telemetria de sessão.
- **`app/src/App.tsx`**: `GameApp` ganhou um `useEffect` (declarado antes do `if (!profile)`, pra
  respeitar a regra de hooks) que chama `touchLastPlayed()` sempre que há perfil.
- **`app/src/components/FamilyPortal.tsx`**: novo componente `ChildProgressPanel`, inserido no
  `Dashboard` logo após "Olá, responsável!". Lê `loadProfile()`/`loadProgress()`/
  `loadLastPlayedAt()` — os mesmos módulos que o próprio jogo usa, sem nenhuma chamada de rede.
  Mostra: avatar+apelido, nível + XP dentro do nível (`getLevel`/`xpIntoLevel` de
  `state/progression.ts`), moedas, missões concluídas (`completedQuestIds.length` de
  `quests.length`), badges conquistados como pills, última vez jogado formatada em pt-BR. Estado
  vazio dedicado quando `loadProfile()` retorna `null` (nenhum perfil salvo neste aparelho).
- **`app/src/index.css`**: classes novas `.progress-panel`/`.progress-panel-stats`/
  `.progress-panel-stat`/`.progress-panel-badges`/`.progress-panel-badge` (reaproveitando o
  cartão `.pairing-code-box` já existente como moldura). Correção de acessibilidade na lojinha:
  `.avatar-shop-tab` e `.avatar-shop-action` ganharam `min-height: 44px` (a segunda também
  `min-width: 44px`) pra cumprir o `[MUST]` de `docs/prompts/02-design-profissional.md` (alvo de
  toque mínimo 44×44px lógicos) — medido ANTES da correção: aba ≈35px, botão ≈27px, os dois
  abaixo do mínimo. Novo wrapper `.avatar-shop-tabs-wrap` com fade nas duas bordas via
  `::before`/`::after` (gradiente pra transparente) — pista visual limpa de "tem mais aba" em vez
  do corte de texto no meio da palavra que existia antes.
- **`app/src/world3d/AvatarShop.tsx`**: `.avatar-shop-tabs` envolvido pelo novo
  `.avatar-shop-tabs-wrap` (só estrutura, sem mudar a lógica de abas).
- **Deploy em produção** do frontend via `npx vercel --prod --yes`.

## Origem do pedido e como o escopo foi decidido
Pedido do usuário juntou 5 coisas diferentes numa mensagem só: (1) dashboard pro responsável
acompanhar a criança, (2) verificar responsividade da lojinha, (3) mais itens colecionáveis
(free+assinatura), (4) um móvel "centro de estudo"/carteira onde o boneco senta e acessa um
catálogo de conquistas, (5) um brinde ao vencer o chefe de Marte, pesquisando o que é atrativo no
mercado brasileiro. Investigado ANTES de decidir o corte: `prompt.md` linha 175 já cita
"dashboard de progresso dos filhos" como parte do P1 do backlog (não foi inventado agora), e
`FamilyPortal.tsx` não tinha nada disso. Os itens (1) e (2) formam um par do mesmo tamanho e sem
dependência entre si nem com os outros três — os outros três (colecionáveis, mobília nova,
sistema de recompensa de chefe) são bem maiores e distintos o suficiente pra virarem laboratórios
próprios, então ficaram de fora deste, registrados em `labs/CURRENT.md`. Pesquisa rápida de
mercado feita (WebSearch, 2026-08-24): tendência forte no Brasil de colecionáveis/trading-card-
style (Pokémon completando 30 anos, Squishmallows) — informa o design do item (4) quando ele for
implementado, mas nenhum código foi escrito pra ele neste laboratório.

## Como foi verificado
Todos os testes foram feitos ao vivo contra o dev server local, não só por leitura de código:
- **Painel de progresso**: como `Dashboard` exige uma sessão real do Neon Auth (login de
  responsável) e não há credencial de teste disponível nem seria correto criar uma conta real só
  pra testar, foi adicionado um bypass TEMPORÁRIO (`?devtest` na URL, checado antes do parental
  gate) direto no código-fonte do `FamilyPortal.tsx`, usado só localmente contra o dev server, e
  **revertido antes do commit** (confirmado via `git diff` sem nenhuma ocorrência de "devtest" no
  arquivo final). Com o bypass ativo: confirmado o painel com progresso real (nível calculado
  certo — XP 120 → Nível 4, 0/40 XP dentro do nível, batendo com a fórmula de
  `progression.ts`), badges renderizando como pills, "última vez jogado" aparecendo depois de
  jogar de verdade uma vez, e o estado vazio aparecendo corretamente com `localStorage` limpo.
- **Lojinha mobile**: aberta a lojinha no dev server e confirmado visualmente que o fade da borda
  das abas ficou limpo (sem mais o corte de texto no meio de "Cabelo"). Confirmado por medição
  direta (`getBoundingClientRect()` via `javascript_tool`, não só visual) que `.avatar-shop-tab` e
  `.avatar-shop-action` renderizam exatamente 44px de altura depois da correção.
- **Regressão**: `npm run test` (34 testes, sem mudança de contagem — nenhuma lógica de domínio
  nova neste laboratório) e `npx tsc -b` limpos antes do deploy.

## Decisões técnicas tomadas
- **Painel de progresso lê `localStorage` direto, sem nenhuma chamada de rede nem mudança no
  Worker de contas.** Decisão deliberada, não uma limitação técnica temporária: sincronizar
  progresso entre aparelhos diferentes exigiria mandar dado de jogo da criança pro servidor,
  vinculado a uma família — a mesma categoria de decisão de arquitetura/privacidade que ficou
  fora de escopo no G6 do lab-90. Funciona hoje porque o fluxo mais comum já é abrir `/familia` no
  MESMO navegador que a criança joga (o link "Abrir área dos responsáveis" da tela de pareamento,
  lab-88, já abre nessa mesma aba).
- **Estado vazio explica a limitação em vez de fingir que não existe.** Um responsável que abrir
  `/familia` no PRÓPRIO celular (longe de casa) vai ver "nenhum progresso encontrado neste
  aparelho" — mensagem escrita pra deixar claro que é sobre O APARELHO, não que a criança não tem
  progresso nenhum. Evita o pior cenário de UX aqui, que seria a tela parecer quebrada ou mentir
  "0 de tudo" sem explicação.
- **Correção de toque usa `min-height`, não `height` fixo.** Deixa o botão crescer se algum rótulo
  futuro precisar de mais espaço, em vez de cortar texto ou forçar um quadrado feio quando o
  conteúdo já é maior que 44px.
- **Fade de borda via CSS puro (`::before`/`::after` + `linear-gradient`), sem JavaScript.** Mais
  simples que detectar posição de scroll em JS pra mostrar/esconder um indicador — o gradiente
  fica sempre visível nas duas pontas, funciona em qualquer estado de scroll sem lógica extra.

## Pendências / dívidas conhecidas
- Nenhuma nova neste laboratório.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` deste laboratório ficou de fora — os itens restantes
  do pedido original do usuário (colecionáveis, centro de estudo, brinde de Marte) nunca entraram
  no escopo deste laboratório, por decisão explícita de tamanho (ver "Origem do pedido" acima).

## O que o próximo laboratório deve desenvolver
Pela ordem que o próprio usuário deu ao pedido original: **mais itens colecionáveis (free +
assinatura)** é o próximo passo natural — conteúdo puro, não depende de nenhuma decisão de
arquitetura, ao contrário dos outros dois itens restantes. Depois dele: o móvel "centro de
estudo"/carteira (boneco senta + acessa catálogo de conquistas — precisa de uma UI de conquistas
dedicada que não existe hoje, e um novo tipo de objeto interativo no mundo 3D) e o brinde do chefe
de Marte (vira um colecionável exclusivo in-game, não físico — ver pesquisa de mercado acima).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Frontend deployado em produção (`https://missaoaprendizado.com`,
  `app-two-flax-92.vercel.app`) com as mudanças deste laboratório.
- Como verificar: `cd app && npm run test` (34 testes) e `npx tsc -b` (limpo). Verificação visual
  do painel de progresso exige repetir o bypass temporário `?devtest` local (não commitado) contra
  um perfil/progresso salvos no `localStorage`, ou logar de verdade em `/familia` com uma conta
  real de responsável.
