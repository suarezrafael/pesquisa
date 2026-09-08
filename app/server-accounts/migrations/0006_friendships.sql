-- lab-160, Grupo B do backlog social (labs/lab-158-.../FEATURES.md): pedido/aceite/recusa de
-- amizade entre duas `player_identities` (lab-159), mais remover uma amizade já aceita (item
-- novo confirmado com o usuário nesta sessão — a versão soft-delete de "bloquear/denunciar",
-- que o plano do lab-158 já sinalizava reconsiderar antes de ir pra produção).
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references player_identities (id),
  addressee_id uuid not null references player_identities (id),
  -- `removed` é o soft-delete de uma amizade `accepted` — histórico preservado (mesmo espírito
  -- de token revogado/pairing_code expirado, nunca DELETE físico de relação social).
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Impede pedido duplicado no MESMO sentido; o handler ainda precisa checar o sentido inverso
  -- (B já pediu pra A) antes de criar um pedido novo, isso o índice sozinho não cobre.
  unique (requester_id, addressee_id)
);

-- Lista de pedidos PENDENTES recebidos por um jogador é a consulta mais frequente (toda vez que
-- o painel de Amigos abre a aba de pedidos).
create index if not exists idx_friendships_addressee_status on friendships (addressee_id, status);
create index if not exists idx_friendships_requester_status on friendships (requester_id, status);

-- Achado do review automático do Copilot no PR #31: `unique(requester_id, addressee_id)` só
-- protege o MESMO sentido — duas requisições concorrentes em sentidos opostos (A→B e B→A) podiam
-- passar pela checagem SELECT-then-INSERT do handler e criar duas linhas ativas pro mesmo par.
-- Índice único parcial por par NÃO-direcional (`least`/`greatest`), só sobre relações ativas
-- (`status <> 'removed'`) — uma amizade removida não bloqueia um par de tentar de novo. O handler
-- captura a violação dessa constraint (código Postgres 23505) e devolve 409 em vez de deixar
-- vazar como erro 500.
create unique index if not exists idx_friendships_unique_active_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status <> 'removed';
