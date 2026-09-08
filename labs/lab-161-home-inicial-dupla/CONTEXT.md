# Contexto — Laboratório 161 — Home inicial dupla (criança + responsável)

Preenchido em: 2026-09-08
Commit inicial → final: d32659a12d9f285e03e12c71cf1a9e18139bb6bf..HEAD

## Pergunta de mercado que este lab ajuda a responder

Registrada explicitamente por pedido do usuário, vinda de `docs/business-analyst-prompt-backlog.md`
§6 (recomendação de próximo passo do próprio backlog de análise de negócio/UX):

> "Quando alguém cai no site, entende rápido por que a criança deveria querer jogar e por que o
> responsável deveria permitir/pagar?"

Ou, na formulação exata pedida para este `CONTEXT.md`: **"A primeira impressão faz a criança
querer jogar e o responsável confiar o suficiente para permitir ou assinar?"**

Este lab constrói a resposta de produto a essa pergunta (a tela em si); a resposta de *evidência*
(se funciona de verdade) depende de pesquisa ainda não feita — ver "Pendências" abaixo.

## O que foi feito

- `app/src/components/TitleScreen.tsx`: reescrito.
  - Subtítulo trocado de "um mini-planeta cheio de missões escondidas... resolva desafios" (leitura
    de "quiz com cenário") para "Explore planetas, cuide do seu bichinho, troque de visual na
    lojinha e faça amigos — no caminho, resolva desafios..." — a aventura/exploração/customização/
    social vem primeiro na frase, o desafio pedagógico aparece como parte do caminho, não como o
    produto inteiro.
  - Botão "Jogar 🚀" mantido idêntico em comportamento e posição — continua a ação mais forte e
    visualmente dominante da tela (sem mudança de `onPlay`, só um `trackPlayClick()` adicional
    antes de chamá-lo).
  - `<ul className="title-trust-signals">` nova: 4 sinais de confiança em formato de pill curta,
    lidos num relance — "Aprendizado sempre grátis", "Sem chat livre", "Assinatura só para itens
    visuais", "Feito para jogar no navegador".
  - `<div className="title-parent-band">` nova: separada do resto da tela por uma linha divisória
    (`border-top`), com "Responsável por quem vai jogar?" + link real pra `/familia`
    (`target="_blank" rel="noreferrer"`, mesma classe `.nickname-generate-btn` já usada em
    `PairingScreen.tsx` pro mesmo link) — registro visual mais calmo de propósito, pra não competir
    com o CTA da criança na mesma tela.
- `app/src/index.css`: duas classes novas (`.title-trust-signals`, `.title-parent-band`) — nada
  fora do escopo de `.title-screen` foi tocado.
- `app/src/productAnalytics.ts`: `trackPlayClick()`/`trackParentAreaClick()` novos, mesmo padrão de
  `trackQuestCompleted()` (sem `meta`, só o tipo do evento).
- `app/server-accounts/src/domain.ts`: `PRODUCT_EVENT_TYPES` ganhou `play_click`/
  `parent_area_click` — sem isso, `POST /events` devolveria 400 pros dois eventos novos (allowlist
  fechada, mesmo mecanismo do lab-99). 1 teste novo em `domain.test.ts`.

## Decisões técnicas tomadas

- **Tocar `server-accounts/src/domain.ts` foi necessário, não um desvio de escopo**: o pedido do
  usuário foi "se já houver productAnalytics, adicionar eventos" — mas o mecanismo existente
  (`isValidProductEventType`, allowlist fechada) rejeita silenciosamente qualquer tipo não
  cadastrado. Sem esse ajuste, os dois eventos novos nunca apareceriam na tabela de eventos
  (o client não erra visivelmente — `trackEvent` falha em silêncio de propósito, lab-99 — mas o
  dado simplesmente nunca seria gravado). Escopo mantido mínimo: só a allowlist, nenhuma rota/
  schema/entitlement nova, consistente com "Fora de escopo" do `FEATURES.md`.
- **Sem `meta` nos eventos novos**: diferente de `session_end` (que carrega `durationMs`),
  `play_click`/`parent_area_click` não precisam de contexto adicional agora — contá-los já
  responde a pergunta de negócio ("quantos cliques em cada CTA"). Se uma pergunta futura precisar
  de mais contexto (ex.: de qual dispositivo), adicionar `meta` depois é aditivo, não uma mudança
  de schema.
- **Link pra `/familia` reaproveita a classe/padrão já existente**, não um componente/estilo novo
  — mesma âncora (`target="_blank" rel="noreferrer"`) já usada duas vezes em `PairingScreen.tsx`;
  consistência de comportamento (abre em aba nova, nunca navega a criança pra longe do jogo) importa
  mais aqui do que uma variação visual.
- **Faixa do responsável separada por `border-top`, não por cor de fundo diferente**: a paleta do
  jogo é vibrante de propósito para a criança (`--primary` rosa, emojis grandes) — um bloco de cor
  visivelmente diferente abaixo teria criado a impressão de "anúncio" colado na tela, o oposto do
  efeito de confiança desejado. Uma divisória simples + texto menor/mais neutro (`#4a5b8c`, mesmo
  tom já usado em `.subtitle`) já cria a separação de registro pedida sem parecer um bloco de venda.

## Pendências / dívidas conhecidas

- **Os eventos `play_click`/`parent_area_click` só serão gravados de verdade depois do deploy
  deste lab** — testado ao vivo contra produção (`curl` direto no Worker já deployado) que o tipo
  novo ainda devolve `400` (allowlist antiga, esperado antes do merge); confirmado que o mecanismo
  de rejeição silenciosa do client (`trackEvent` engole o erro) já funciona como esperado.
- **Nenhum teste de 5 segundos com crianças/responsáveis de verdade foi feito** — este lab constrói
  a hipótese de produto/copy; validar se ela funciona de verdade é o item de pesquisa (não de
  implementação) já registrado em `docs/business-analyst-prompt-backlog.md` §5, item 2 ("teste de
  5 segundos da home"). Continua pendente, fora do escopo de um lab de engenharia.
- Não foi criado um dashboard/consulta pra ler os eventos `play_click`/`parent_area_click`
  gravados — a única forma de consultar hoje é `GET /admin/metrics` (se já expuser eventos
  agregados por tipo) ou uma query direta no Postgres; instrumentar antes de saber que dado vai
  responder qual pergunta seria prematuro (mesmo princípio "Evidence-first" do próprio prompt
  operacional do backlog).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` deste laboratório foram concluídos dentro do escopo
definido pelo usuário.

## O que o próximo laboratório deve desenvolver

Não determinado por este lab sozinho — `docs/business-analyst-prompt-backlog.md` §4 lista outros
itens P0 candidatos (área do responsável antes da monetização — já em grande parte coberta por
`/familia`, Fase B/C/D do plano comercial; instrumentação de funil/retenção mais completa;
onboarding jogável de 3 minutos; UX de lojinha sem pressão abusiva). Como este é um pedido pontual
do usuário (não uma continuação linear do Grupo B do backlog social, que fica em `labs/lab-160-.../
CONTEXT.md`), o próximo passo real depende do que o usuário priorizar a seguir — retomar lab-161
(amigos: heartbeat/online) ou seguir explorando o backlog de negócio/UX.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree `.claude/worktrees/abstract-wobbling-owl`),
  sincronizada com `main` antes de começar este lab.
- `npx tsc -b` (app): limpo. `npm run test` (app): 131/131 (sem teste novo — mudança de
  copy/JSX/CSS, fora do escopo de domínio puro coberto pelos testes do app). `npx tsc --noEmit`/
  `npm run test` (server-accounts): limpo, 82/82 (1 novo).
  `npm run build` (app): sucesso — confirmado que `World3D-*.js` (Babylon) continua um chunk
  separado de `index-*.js`, carregado só sob demanda (`lazy()` em `App.tsx`, inalterado).
- Verificado ao vivo no navegador (`npm run dev`, `localStorage` limpo pra simular visitante
  novo): tela inicial renderiza com o novo texto/badges/faixa do responsável, sem erro de console;
  "Jogar" leva ao onboarding normalmente; "Área dos responsáveis" abre `/familia` numa aba nova sem
  navegar a aba atual. Evento `play_click` confirmado disparando uma chamada real `POST /events`
  pro Worker de produção (ainda devolve `400` até este lab ser deployado — comportamento esperado,
  documentado acima).
- Ainda por fazer nesta sessão: commit, push, abrir PR, aguardar CI + review do Copilot (conforme
  pedido explícito do usuário), corrigir achados reais se houver, pedir confirmação antes de
  mergear/fazer deploy.
