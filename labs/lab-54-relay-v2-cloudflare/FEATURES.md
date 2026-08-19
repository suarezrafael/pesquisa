# Laboratório 54 — Relay v2 no Cloudflare Workers (sem cartão de crédito)

Status: em andamento
Início: 2026-08-19
Fim: -
Commit inicial: d49f54ee198dad43ea5cfd7c56f798379ac5fdaa

## Objetivo do laboratório
Usuário perguntou se o Fly.io (relay v1 atual, `app/server/relay.cjs`) era a melhor opção depois
de notar que o trial é só 2 horas / 7 dias, exigindo cartão de crédito depois disso. Pedido:
"mantenha o codigo do server/relay.cjs, escreva uma v2 para cloudflare se funcionar, use a v2. até
la mantenha a v1." — construir um relay v2 no Cloudflare Workers (que tem plano Free de verdade,
sem cartão, pra esse volume de uso) SEM apagar/tocar no v1, e só trocar `VITE_RELAY_URL` pro v2
depois de comprovado que funciona.

## Funcionalidades planejadas
- [x] Confirmar que Durable Objects (necessário pra um relay com estado — lista de conexões
      ativas) rodam no plano Free do Cloudflare Workers sem cartão de crédito, usando o tipo
      SQLite-backed (`new_sqlite_classes`) — verificado via busca antes de construir qualquer
      coisa, pra não desperdiçar trabalho numa opção que também precisaria de cartão.
- [x] **`app/server-cf-relay/`** — novo projeto Cloudflare Worker (`wrangler.toml`,
      `package.json`, `tsconfig.json`, `src/index.ts`) implementando o **mesmo protocolo
      exato** do `app/server/relay.cjs` (mensagens `welcome`/`state`/`chat`/`leave`, mesma
      validação de `messageId` contra o catálogo fechado de chat) usando a WebSocket Hibernation
      API dos Durable Objects — o cliente (`multiplayer.ts`) não precisa de nenhuma mudança além
      da URL.
- [x] **`app/server/relay.cjs` (v1) mantido intacto**, sem nenhuma edição.
- [x] Testado localmente via `wrangler dev` (simulação do Cloudflare Workers via Miniflare) +
      script Node com WebSocket nativo cobrindo: mensagem de boas-vindas com id único por
      conexão, broadcast de `state` chega no outro cliente mas não en quem mandou, chat com
      `messageId` válido chega no outro lado, chat com `messageId` fora do catálogo é descartado
      (não chega em ninguém), e `leave` é disparado quando um cliente desconecta. Todos os
      cenários bateram exatamente com o comportamento do v1.
- [ ] **Deploy real em produção no Cloudflare** — precisa de `wrangler login` (OAuth interativo,
      só o usuário consegue fazer, mesmo padrão do `flyctl auth login` no lab-51). Bloqueado até
      o usuário autenticar.
- [ ] Trocar `VITE_RELAY_URL` (em `app/.env.production`) pra apontar pro relay v2 e testar
      multiplayer ao vivo em produção (dois clientes reais, não só o teste local via Miniflare).
- [ ] Só depois disso: considerar decomissionar o app do Fly.io (v1) — ou deixá-lo como fallback,
      a decidir com o usuário.

## Fora de escopo (explicitamente adiado)
- Decomissionar o Fly.io antes do v2 estar validado em produção de verdade — pedido explícito do
  usuário ("até lá mantenha a v1").
