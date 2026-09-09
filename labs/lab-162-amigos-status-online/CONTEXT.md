# Contexto — Laboratório 162 — Status online/último acesso dos amigos

Preenchido em: 2026-09-08
Commit inicial → final: 15751a8fa99dfc366e27cb7c0431d027e4cd331d..HEAD

## O que foi feito

Terceiro lab do Grupo B do backlog social (lab-158): heartbeat (`POST /players/heartbeat`) +
status online/último acesso na aba "Amigos" do `FriendsPanel`. O número "lab-161" original desse
item (planejado no `CONTEXT.md` do lab-160) foi consumido pelo lab de home inicial dupla, pedido
pontual do usuário no meio da sequência — este lab é o item adiado, renumerado como lab-162.

- `app/server-accounts/src/domain.ts`: `isOnlineNow(lastSeenAtIso, now)` — pura, "online" definido
  como `last_seen_at` dentro de 2 minutos. 4 testes novos.
- `app/server-accounts/src/index.ts`:
  - `POST /players/heartbeat` — `{playerId}` → `update player_identities set last_seen_at = now()`.
  - `handleFriendSummary`: a query de `friends` agora seleciona `p.last_seen_at`; cada item
    devolve `lastSeenAt` (ISO) e `online` (calculado com `isOnlineNow` NO SERVIDOR, não no
    client) — `received`/`sent` continuam sem esses campos.
- `app/server-accounts/wrangler.toml`: `HEARTBEAT_LIMITER` novo (120/60s — bem mais generoso que
  os outros, já que uma sessão de jogo de 1h sozinha soma ~60 chamadas).
- `app/src/state/useHeartbeat.ts` (novo hook): `setInterval` de 60s, lê `loadPlayerId()` a cada
  tick (não só no mount — se o jogador registrar o `playerId` NO MEIO da sessão, o heartbeat já
  pega o valor novo sem precisar remontar nada), `fetch` com `keepalive: true`, mesmo espírito de
  `productAnalytics.ts` (nunca interrompe o jogo pra criança se falhar).
- `app/src/App.tsx`: `useHeartbeat()` chamado uma vez em `GameApp` — roda durante TODA a sessão de
  jogo, não só com o painel de Amigos aberto (diferente de `usePlayerIdentity`/`useFriendRequests`,
  que só existem enquanto `FriendsPanel` está montado).
- `app/src/state/useFriendRequests.ts`: `FriendSummaryItem` ganha `lastSeenAt?`/`online?`
  opcionais; `formatLastSeen(lastSeenAtIso, now)` novo — só formata o texto de exibição ("há X
  min/h/d"), nunca decide se é online (essa decisão já vem pronta do servidor).
- `app/src/world3d/FriendsPanel.tsx`, aba "Amigos": "🟢 online agora" ou "última vez: {texto}" ao
  lado de cada amigo.

## Decisões técnicas tomadas

- **A regra "está online ou não" vive só no servidor, nunca no client**: `handleFriendSummary` já
  calcula `online: boolean` usando `isOnlineNow` antes de devolver a resposta — o client só recebe
  o resultado pronto e formata o texto de "há quanto tempo" quando `online` é `false`
  (`formatLastSeen`). O `FEATURES.md` original deixava essa decisão em aberto ("decidir na
  implementação, mas a regra não pode divergir") — resolvida assim porque duas implementações do
  mesmo limiar de 2 minutos (uma no Worker, outra no client) divergiriam silenciosamente no dia em
  que uma mudasse sem a outra, e o servidor já tem `now()` de verdade (o relógio do client pode
  estar errado).
- **`useHeartbeat` mora em `App.tsx`/`GameApp`, não em `FriendsPanel`/`usePlayerIdentity`**: o
  painel de Amigos só monta quando o jogador abre o ícone 👥 — se o heartbeat vivesse ali, o
  `last_seen_at` só atualizaria enquanto o painel estivesse literalmente aberto na tela, o que
  tornaria "está online agora" quase sempre falso mesmo pra quem está jogando ativamente. Rodar no
  componente raiz da sessão de jogo é o que faz o recurso fazer sentido de verdade.
- **`useHeartbeat` relê `loadPlayerId()` a cada tick, não uma vez só no efeito**: um jogador pode
  abrir o painel de Amigos (registrando o `playerId` pela primeira vez) bem depois de `GameApp` já
  ter montado — reler a cada 60s, em vez de capturar o valor uma vez no `useEffect`, evita ter que
  reiniciar/recriar o hook quando isso acontece.
- **`received`/`sent` (pedidos pendentes) nunca carregam `lastSeenAt`/`online`**: só faz sentido
  mostrar status de presença pra quem já é seu amigo de verdade — mostrar "online" de alguém que
  ainda nem aceitou o pedido vazaria mais informação do que o necessário sobre um desconhecido.

## Pendências / dívidas conhecidas

- **O heartbeat automático (`setInterval` de 60s em `useHeartbeat.ts`) não pôde ser observado
  disparando ao vivo na aba de automação do navegador** — mesma limitação de ambiente já
  documentada repetidamente neste projeto (`document.hidden = true` em abas de automação sem foco
  real do sistema operacional, ver labs 130/131/140/141/146): confirmado via
  `document.hidden === true` na aba de teste, e nenhuma chamada a `/heartbeat` apareceu no
  network log depois de 75s reais de espera (o intervalo é de 60s). Isso não é um bug do código —
  é a MESMA classe de throttling de timers do navegador em aba backgrounded que já bloqueou testes
  de `requestAnimationFrame` em labs anteriores. **Mitigação de confiança aplicada**: disparada a
  chamada EXATA que `useHeartbeat.ts` faz (mesmo método, headers, corpo, `keepalive`) diretamente
  da origem da página via `fetch()` no console do navegador — confirmado `204` real contra o
  Worker rodando localmente (prova que CORS/shape/endpoint funcionam da perspectiva do client,
  sem depender do timer do navegador). O `setInterval` em si é código trivial (mesmo padrão já
  usado e comprovado em `productAnalytics.ts`), então o risco residual é baixo.
- Nenhuma outra pendência nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` deste laboratório foram concluídos.

## O que o próximo laboratório deve desenvolver

**lab-163** (renumerado do "lab-162" original do plano do lab-158) — `GET /players/:id/public-
profile`: avatar equipado + conquistas (`badges`) de um amigo — nunca XP, moeda, ou qualquer outro
dado de progresso/família (regra já definida no plano do lab-158, sem mudança).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree `.claude/worktrees/abstract-wobbling-owl`),
  sincronizada com `main` antes de começar este lab.
- `npx tsc -b` (app): limpo. `npm run test` (app): 131/131 (sem teste novo — mudança de UI/hook de
  efeito periódico, fora do escopo de domínio puro coberto pelos testes do app). `npx tsc
  --noEmit`/`npm run test` (server-accounts): limpo, 86/86 (4 novos).
- Verificado ao vivo contra o banco de PRODUÇÃO real (`wrangler dev` local + `.dev.vars` real):
  registro de dois jogadores de teste, amizade aceita, `friend-summary` mostrando `online: true`
  logo após registro, heartbeat validado (400/404/204 nos três casos), simulação de "offline há 10
  min" direto no banco confirmada NA UI real (localhost:5184) mostrando "última vez: há 14 min",
  heartbeat novo confirmado voltando o rótulo pra "🟢 online agora". Todo dado de teste removido —
  `player_identities` e `friendships` confirmados vazios em produção ao encerrar.
- Ainda por fazer nesta sessão: commit, push, abrir PR, aguardar CI + review do Copilot, corrigir
  achados reais se houver, pedir confirmação do usuário antes de mergear/fazer deploy.
