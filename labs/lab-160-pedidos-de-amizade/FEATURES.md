# Laboratório 160 — Pedidos de amizade (enviar/aceitar/recusar/remover)

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: d9068b4022d145ce23bf4da039d0aa3f1a12f01d

## Objetivo do laboratório

Segundo lab do Grupo B do backlog social (lab-158, sequenciamento confirmado no lab-159): dar ao
`FriendsPanel` (busca já funciona desde o lab-159) a capacidade de enviar/aceitar/recusar pedido
de amizade, e — decisão nova confirmada com o usuário nesta sessão — remover uma amizade já
aceita. SEM lista de amigos com status online ainda — isso é o lab-161.

## Funcionalidades planejadas

- [x] `server-accounts/migrations/0006_friendships.sql`: tabela `friendships` (id, requester_id,
      addressee_id — ambos referenciando `player_identities`, `status` `pending`/`accepted`/
      `declined`/`removed`, created_at/updated_at), índice composto `(addressee_id, status)` e
      `(requester_id, status)` pra listar pedidos rápido, `unique(requester_id, addressee_id)`
      pra impedir pedido duplicado no mesmo sentido (referência:
      `labs/lab-158-amigos-plano-arquitetura/FEATURES.md`). Aplicada em produção.
- [x] `server-accounts/src/index.ts`:
      - `POST /players/friend-request` — `{fromId, toId}` → cria pedido `pending` (rejeita se já
        existe pedido não-removido entre os dois, nas duas direções; rejeita auto-pedido).
      - `POST /players/friend-request/respond` — `{requestId, playerId, accept}` — só o
        `addressee_id` do pedido pode responder (`playerId` tem que bater, senão 403); vira
        `accepted` ou `declined`.
      - `GET /players/friend-summary?playerId=X` — devolve `{received, sent, friends}`: pedidos
        PENDENTES recebidos e enviados (separados) + amizades já `accepted` (sem status online/
        último acesso — isso é o `lastSeenAt` do lab-161, essa lista aqui só existe pra alimentar
        o botão "Remover" deste lab). Cada item só com `{friendshipId, playerId, nickname,
        avatarEmoji}` (join em `player_identities`, nunca mais que isso). Renomeado de
        `GET /players/friend-requests` do plano original do lab-158 — uma chamada só é mais
        simples pro painel do que duas.
      - `POST /players/friend-request/remove` — `{playerId, friendshipId}` — só um dos dois lados
        de uma amizade `accepted` pode remover; vira `removed` (histórico preservado, não
        DELETE — mesmo espírito de soft-delete já usado em `pairing_codes`/tokens revogados).
      - Rate limit novo (`FRIEND_REQUEST_LIMITER`, 20/60s) nas 4 rotas acima — busca já tem a
        dela desde o lab-159.
- [x] `app/src/state/useFriendRequests.ts` (hook novo dedicado, em vez de crescer
      `usePlayerIdentity.ts`): `summary` (`{received, sent, friends}`), `sendRequest`,
      `respond`, `removeFriend`, `refresh`.
- [x] `world3d/FriendsPanel.tsx`: troca o placeholder "🔒 Adicionar (em breve)" por um botão real
      de pedido; aba nova "Pedidos" (recebidos com Aceitar/Recusar; enviados mostrando
      "⏳ aguardando"); aba "Amigos" com quem já foi aceito, cada um com "Remover" (confirmação
      de dois cliques, sem modal novo) — sem status online/último acesso ainda (lab-161).
- [x] `npx tsc -b` / `npm run test` (app e server-accounts) sem erros — regras de negócio puras
      extraídas pra `domain.ts` e testadas: `isSelfFriendRequest`, `hasActiveFriendship`,
      `friendResponseStatus` (6 testes novos).
- [x] Verificação ao vivo CONTRA O BANCO DE PRODUÇÃO real (mesmo método do lab-159): backend
      inteiro testado via curl contra `wrangler dev` + banco real (self-request 400, duplicata
      409, responder pedido alheio 403, aceite, revogar/remover 403 por quem não faz parte,
      remoção 204, amizade reaparece pros dois lados como friends e some pros dois lados ao
      remover, pedido pode ser refeito depois de `removed` mas não depois de `declined`) — mais
      um fluxo completo NA UI de verdade (busca → Adicionar → "⏳ pedido enviado" → aba Pedidos →
      aceite simulado do outro lado → aba Amigos mostra o amigo → Remover com confirmação de dois
      cliques → aba Amigos volta a ficar vazia → confirmado também vazio do lado do outro
      jogador). Todo dado de teste removido do banco depois (zero linhas em `player_identities`/
      `friendships` ao final).

## Fora de escopo (explicitamente adiado)

- Lista de amigos com status online/último acesso (heartbeat) — lab-161.
- Ver avatar/conquistas públicas de um amigo — lab-162.
- Bloquear/denunciar um jogador (diferente de simplesmente remover amizade) — ainda não pedido;
  reavaliar se o histórico de uso mostrar necessidade (mesmo raciocínio do lab-158).
