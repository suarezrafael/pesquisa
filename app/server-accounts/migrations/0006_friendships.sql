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
