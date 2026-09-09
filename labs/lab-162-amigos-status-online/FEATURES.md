# Laboratório 162 — Status online/último acesso dos amigos

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: 15751a8fa99dfc366e27cb7c0431d027e4cd331d

## Objetivo do laboratório

Terceiro lab do Grupo B do backlog social (lab-158), conforme sequenciamento confirmado no
`CONTEXT.md` do lab-160 (o número "lab-161" original desse plano foi consumido pelo lab de home
inicial dupla, pedido pontual do usuário — este lab é o adiado, renumerado): dar ao `FriendsPanel`
um heartbeat que atualiza `last_seen_at` e mostra, na aba "Amigos", se cada amigo está online agora
ou quando foi visto pela última vez.

## Funcionalidades planejadas

- [x] `server-accounts/src/index.ts`: `POST /players/heartbeat` — `{playerId}`, atualiza
      `player_identities.last_seen_at` pra `now()`. Rate limit generoso (`HEARTBEAT_LIMITER`,
      120/60s) — chamado a cada ~60s durante toda sessão de jogo, mesmo espírito de
      `PROGRESS_SUMMARY_LIMITER`.
- [x] `server-accounts/src/index.ts`: `handleFriendSummary` (`GET /players/friend-summary`) passa
      a incluir `lastSeenAt` (ISO) e `online` (boolean, já calculado no servidor) em cada item de
      `friends` — `received`/`sent` continuam sem esses campos (ainda não são amigos de verdade).
- [x] `server-accounts/src/domain.ts`: função pura `isOnlineNow(lastSeenAtIso, now)` — "online"
      definido como `last_seen_at` dentro de 2 minutos, sem integrar com o relay de multiplayer em
      tempo real. Testada (4 testes novos).
- [x] `app/src/state/useHeartbeat.ts` (hook novo, dedicado): heartbeat automático a cada 60s
      enquanto o jogo está aberto E `playerId` já existe — lê `loadPlayerId()` a cada tick (não só
      no mount), montado uma vez em `App.tsx`/`GameApp` (não em `FriendsPanel`, pra rodar durante
      toda a sessão, não só com o painel aberto). `setInterval` limpo no `unmount`.
- [x] `app/src/world3d/FriendsPanel.tsx`, aba "Amigos": mostra "🟢 online agora" ou "última vez: há
      X min/h/d" ao lado de cada amigo — decisão de implementação: o SERVIDOR calcula `online`
      (`isOnlineNow` roda em `handleFriendSummary`), o client só formata o rótulo de "há quanto
      tempo" (`formatLastSeen`, `useFriendRequests.ts`) quando `online` é `false` — evita duas
      fontes de verdade divergentes sobre o limiar de 2 minutos.
- [x] `npx tsc -b` / `npm run test` (app e server-accounts) sem erros.
- [x] Verificação ao vivo CONTRA O BANCO DE PRODUÇÃO real (mesmo método dos labs 159/160):
      registrado par de jogadores de teste, amizade aceita, heartbeat disparado via curl e via
      `fetch` real na origem do client (mesmo CORS/shape que `useHeartbeat.ts` usa), confirmado
      `last_seen_at` atualizado; simulado "amigo offline há 10 min" (timestamp antigo direto no
      banco) e confirmado ao vivo NA UI que o rótulo muda de "🟢 online agora" pra "última vez: há
      14 min" e volta pra "online agora" depois de um heartbeat novo. Validações de erro (400
      playerId inválido, 404 jogador inexistente) confirmadas. Dado de teste removido do banco
      depois.

## Fora de escopo (explicitamente adiado)

- `GET /players/:id/public-profile` (avatar equipado + conquistas de um amigo) — próximo lab da
  sequência (lab-163).
- Qualquer integração com o relay de multiplayer em tempo real (`app/server-cf-relay/`) — o status
  online aqui é só "heartbeat recente", não presença de WebSocket.
- Notificação/push quando um amigo fica online — não pedido, fora de escopo.
