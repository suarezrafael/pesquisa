-- lab-163, último item do Grupo B do backlog social (labs/lab-158-.../FEATURES.md):
-- `GET /players/:id/public-profile` (avatar equipado + conquistas de um amigo). O resto do visual
-- (cor de roupa/cabelo/chapéu/óculos, `Profile.equipped*`) e as conquistas (`Progress.badges`)
-- nunca tinham sido sincronizados pro backend — vivem só no `localStorage` do aparelho, mesmo pra
-- assinantes (`server-accounts` nunca guarda progresso de jogo, só a camada comercial).
--
-- `equipped_look` é jsonb (não colunas separadas) pra não acoplar este schema a cada eixo de
-- customização do client (`Profile.equipped*` já mudou de forma várias vezes, labs 24/73/92) —
-- o Worker nunca lê os campos individualmente, só repassa o objeto inteiro pro perfil público.
-- `badges` também jsonb (não `text[]`) por consistência com o resto do Worker, que já usa jsonb
-- pra listas/objetos vindos do client (`progress_backups`, `product_events.metadata`), evitando
-- introduzir o primeiro tipo array deste schema só pra este campo.
alter table player_identities add column if not exists equipped_look jsonb;
alter table player_identities add column if not exists badges jsonb not null default '[]'::jsonb;
