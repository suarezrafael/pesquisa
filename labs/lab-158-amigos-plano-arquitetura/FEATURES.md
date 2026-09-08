# Laboratório 158 — Grupo B do backlog social: plano de arquitetura

Status: concluído (planejamento — nenhum código, ver "Objetivo")
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: dcf1712039800ee56f728db2e28fef4715f75f23

## Objetivo do laboratório

Destravar o Grupo B do backlog social (lab-154): lista de amigos, busca por nickname, status
online/último acesso, convites, ver avatar/conquistas de amigo. As 3 perguntas de arquitetura/
segurança registradas no lab-154 foram respondidas pelo usuário nesta sessão:

1. **Identidade persistente**: SIM, criar uma identidade de jogador persistente por PERFIL (não
   por família assinante) — sem conta com senha/e-mail, sem dado pessoal novo.
2. **Adicionar amigo**: busca LIVRE por nickname (não código trocado fora do jogo).
3. **Consentimento**: o portão de multiplayer já existente (lab-152, G13) é suficiente — sem
   portão novo específico pra amigos.

Este laboratório NÃO implementa nada — é o plano técnico concreto (schema, endpoints,
mitigação de risco da busca livre escolhida) e a proposta de sequenciamento em labs menores,
pra confirmar antes de mexer em produção (banco Neon compartilhado, Worker já em uso por
assinantes).

## Achado de segurança a resolver ANTES de codar (decorrente da escolha do usuário)

Busca livre por nickname cria um diretório de crianças pesquisável — a mitigação não é
"não fazer", é fazer com salvaguardas reais:
- **Rate limit agressivo** na busca (mesmo padrão de `pairing_redeem_attempts`,
  `server-accounts/migrations/0001_baseline.sql` — tabela de tentativas por IP).
- **Sem substring/wildcard**: só correspondência exata (case-insensitive) do nickname digitado
  — não uma varredura tipo "começa com X", que permitiria enumerar o diretório inteiro por
  força bruta alfabética.
- **Resultado nunca expõe mais que nickname + emoji do avatar** — nunca e-mail, nunca
  `device_id`, nunca localização/IP, nunca a família/assinatura por trás do perfil.
- **Nickname pode repetir entre jogadores** (o campo de apelido já é só letras, lab-89, sem
  sufixo que garanta unicidade) — a busca pode devolver mais de um resultado; o pedido de
  amizade sempre confirma qual exatamente antes de enviar (mesmo emoji de avatar ajuda a
  diferenciar).

## Arquitetura proposta

**Onde**: estender `app/server-accounts` (Neon Postgres + Cloudflare Workers) — já é o único
backend que fala com QUALQUER jogador sem exigir assinatura (`POST /events`, telemetria
anônima por `device_id`, sem entitlement). Cooperação/progressão nunca pode depender de
assinatura (`docs/prompts/03-arquitetura-sistema.md`) — isso vale igual pra identidade de
jogador: TEM que funcionar pra quem não paga, então não pode viver só atrás do fluxo de
pareamento de família (que hoje só existe pra assinantes).

**Schema novo** (migração `0005_player_identities.sql`):
- `player_identities`: `id` (uuid pk), `nickname` (text), `avatar_emoji` (text), `device_id`
  (uuid — o MESMO já usado pela telemetria anônima, `getOrCreateDeviceId`, `state/storage.ts`;
  reaproveitar em vez de inventar outro identificador anônimo), `created_at`,
  `last_seen_at`. Índice em `lower(nickname)` pra busca exata case-insensitive rápida.
- `friendships`: `id`, `requester_id`, `addressee_id` (ambos referenciam `player_identities`),
  `status` (`pending` / `accepted` / `declined`), `created_at`, `updated_at`. Índice composto
  `(addressee_id, status)` pra listar pedidos pendentes recebidos rápido.
- `player_search_attempts`: mesmo padrão de `pairing_redeem_attempts` já existente (rate limit
  por IP, UPSERT atômico).

**Endpoints novos** (todos sem exigir entitlement — qualquer jogador):
- `POST /players/register` — registra `{nickname, avatarEmoji, deviceId}`, devolve um
  `playerId` opaco (guardado localmente, mesmo espírito do token de entitlement — sem dado
  pessoal). Chamado uma vez, na primeira vez que o jogador abre o painel de Amigos (não no
  onboarding — evita registrar quem nunca vai usar multiplayer/amigos).
- `GET /players/search?nickname=X` — rate-limitado, match exato case-insensitive, máximo 5
  resultados, só `{id, nickname, avatarEmoji}` por resultado.
- `POST /players/friend-request` — `{fromId, toId}` → cria pedido `pending`.
- `POST /players/friend-request/respond` — `{requestId, accept}`.
- `GET /players/friends?playerId=X` — lista amigos aceitos com `lastSeenAt` (o campo "online
  agora" é derivado: `lastSeenAt` dentro de ~2 minutos = online, sem precisar integrar com o
  relay de multiplayer em tempo real — mais simples e continua funcionando mesmo se o relay
  cair).
- `POST /players/heartbeat` — `{playerId}`, atualiza `last_seen_at`; chamado a cada ~60s
  enquanto o jogo está aberto E o jogador já tem `playerId` registrado (nunca antes disso).
- `GET /players/:id/public-profile` — avatar equipado + conquistas (`badges`) — NUNCA XP,
  moeda, ou qualquer outro dado de progresso/família.

## Sequenciamento proposto (labs menores, não tudo de uma vez)

1. **lab-159**: migração `0005` + `POST /players/register` + `GET /players/search` (com rate
   limit) + registro automático na primeira abertura do painel de Amigos. Sem lista de amigos
   ainda — só "existe identidade, dá pra buscar".
2. **lab-160**: `friend-request`/`respond` + UI de pedidos pendentes (enviados/recebidos).
3. **lab-161**: `friends`/`heartbeat` + lista de amigos com status online/último acesso.
4. **lab-162**: `public-profile` + tela de ver avatar/conquistas de um amigo.

## Fora de escopo (explicitamente adiado)

- Qualquer implementação de código — este laboratório é só o plano.
- Remover/bloquear um amigo, ou moderar/denunciar — não pedido ainda; considerar antes do
  lab-160 ir pra produção de verdade (mesmo item que G13 original já cobre parcialmente pro
  chat, mas "remover amigo" é uma ação nova que não existe em nenhum catálogo hoje).
- Sincronizar identidade de jogador entre aparelhos diferentes do mesmo perfil (cada
  `device_id` é por aparelho, lab-99) — um jogador que troca de celular vira "outro jogador" pro
  sistema de amigos; aceitável pro escopo atual, mesma limitação que a telemetria já tem hoje.
