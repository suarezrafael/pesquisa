# Contexto — Laboratório 54 — Relay v2 no Cloudflare Workers (sem cartão de crédito)

Preenchido em: 2026-08-19
Commit inicial → final: d49f54ee198dad43ea5cfd7c56f798379ac5fdaa..HEAD

## O que foi feito

1. Usuário perguntou se o Fly.io (relay v1, `app/server/relay.cjs`) era a melhor opção depois de
   notar que o trial é só 2h/7 dias, exigindo cartão de crédito depois disso. Antes de escrever
   qualquer código, confirmado via busca que Durable Objects SQLite-backed (`new_sqlite_classes`)
   rodam no plano Free do Cloudflare Workers **sem cartão de crédito** — só o tipo clássico
   (não-SQLite) de Durable Object exige plano pago, e o SQLite-backed é o único disponível no
   Free de qualquer forma.
2. Construído `app/server-cf-relay/` — um Cloudflare Worker + Durable Object (WebSocket
   Hibernation API) que fala **o mesmo protocolo exato** do `relay.cjs` (v1): mensagens
   `welcome`/`state`/`chat`/`leave`, mesma validação de `messageId` de chat contra o catálogo
   fechado. `app/server/relay.cjs` **não foi tocado**.
3. Testado em duas camadas, como convém pra um relay de rede (aprendendo com o lab-52, onde
   confiar só na UI escondeu o bug real):
   - **Protocolo cru**: script Node com `WebSocket` nativo cobrindo welcome/broadcast/chat
     válido/chat inválido descartado/leave — primeiro contra `wrangler dev` local (Miniflare),
     depois **de novo contra o deploy real em produção** depois que o usuário autenticou.
   - **Fim a fim pela UI de verdade**: build de produção (`npm run build` + `npm run preview`),
     duas abas de navegador simulando dois jogadores reais, painel de Ranking mostrando os dois,
     avatar remoto renderizado no mundo 3D.
4. Deploy do Cloudflare exigiu dois passos manuais do usuário (mesma natureza do `flyctl auth
   login` no lab-51 — login interativo, só ele pode fazer): `wrangler login` (OAuth) e, depois
   de um primeiro deploy que respondia mas não resolvia TLS, registrar o subdomínio `workers.dev`
   da conta via dashboard (passo único por conta Cloudflare, obrigatório antes do primeiro deploy
   num projeto novo). URL final: `https://missao-aprender-relay-v2.rafaelvs.workers.dev`.
5. `app/.env.production` trocado de `wss://missao-aprender-relay.fly.dev` (v1) pra
   `wss://missao-aprender-relay-v2.rafaelvs.workers.dev` (v2). Rebuild, republicado no Vercel, e
   conferido ao vivo — via `curl` no bundle JS realmente servido pela CDN do Vercel, não só no
   build local — que a URL do v2 foi mesmo pro ar em produção.

## Decisões técnicas tomadas

- **Reescrever o protocolo do zero em vez de portar o código Node** — Durable Objects não rodam
  `ws`/Node puro; a WebSocket Hibernation API (`state.acceptWebSocket`, `webSocketMessage`,
  `webSocketClose`, `ws.serializeAttachment`/`deserializeAttachment`) é a forma idiomática (e
  a única que permite ao Worker hibernar entre mensagens em vez de ficar sempre ativo) — mas o
  *protocolo* (formato de mensagem, validação de chat, comportamento de broadcast) foi copiado
  exatamente do v1 de propósito, pra não exigir nenhuma mudança no cliente (`multiplayer.ts`)
  além da URL.
- **Durable Object com storage SQLite mesmo sem usar storage nenhum** — o binding precisa
  declarar um tipo de storage no `wrangler.toml` (`new_sqlite_classes` vs `new_classes`); mesmo
  este relay não persistindo nada (é só broadcast em memória via WebSocket), o tipo SQLite foi
  escolhido porque é o único disponível no plano Free — usar `new_classes` (clássico) teria
  exigido o plano pago só pra declarar o binding, mesmo sem usar armazenamento de verdade.
- **Testar contra o deploy real, não só o Miniflare local** — o comportamento de rede/hibernação
  de um Durable Object real na borda da Cloudflare pode diferir sutilmente do simulador local;
  rodar o mesmo script de teste contra o endpoint em produção antes de confiar nele foi decisão
  deliberada, mesmo já tendo passado no teste local.
- **Não decomissionar o Fly.io ainda** — pedido explícito do usuário ("até lá mantenha a v1").
  Decisão de desligar (ou manter como fallback) fica pro usuário, não foi tomada aqui.

## Pendências / dívidas conhecidas

- **Fly.io (v1) continua rodando e sendo cobrado/consumindo o trial** — ninguém desligou o app
  Fly.io (`missao-aprender-relay`), só o jogo parou de apontar pra ele. Se o usuário não quiser
  mais pagar por ele, é preciso rodar `flyctl apps destroy missao-aprender-relay` (ou similar) —
  não fiz isso porque não foi pedido e é uma ação destrutiva/irreversível numa conta que não é
  minha pra decidir sozinho.
- **Limite de conexões WebSocket simultâneas do plano Free do Cloudflare não está documentado
  com um número exato** (a documentação oficial só diz "baixo" pro tier Free) — não é um
  problema pro volume de uso atual (família/amigos testando), mas se o jogo crescer bastante
  pode ser necessário revisitar.
- Um único Durable Object global (`idFromName('global')`) atende todo mundo que conecta — mesmo
  comportamento do v1 (uma sala só, sem múltiplas salas/instâncias). Se o jogo precisar de salas
  separadas no futuro, o Durable Object já foi desenhado de um jeito que suporta isso trivialmente
  (bastaria usar `idFromName(nomeDaSala)` em vez de um nome fixo), mas não foi construído agora
  por não ter sido pedido.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos nesta sessão (o deploy real, que
dependia de dois passos manuais do usuário, foi desbloqueado e terminado na mesma rodada).

## O que o próximo laboratório deve desenvolver

1. Perguntar ao usuário se quer desligar o app do Fly.io (v1) agora que o v2 está validado em
   produção, ou mantê-lo como fallback manual (trocando `VITE_RELAY_URL` de volta se o Cloudflare
   apresentar algum problema).
2. Nenhum outro pedido novo pendente no momento em que este laboratório foi encerrado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu anteriormente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Jogo ao vivo (republicado com este laboratório, apontando pro relay v2):
  https://app-two-flax-92.vercel.app
- **Relay v2 (Cloudflare, ativo)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev
- Relay v1 (Fly.io, ainda no ar mas não usado pelo jogo): https://missao-aprender-relay.fly.dev
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o Worker v2: `cd app/server-cf-relay && npm install && npx wrangler deploy`
  (precisa estar autenticado — `npx wrangler whoami` confere).
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
