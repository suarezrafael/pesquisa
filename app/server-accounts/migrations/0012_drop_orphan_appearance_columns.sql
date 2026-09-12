-- Correção de um acidente operacional (não relacionado a nenhuma feature/lab): uma migração de um
-- experimento abandonado de outra sessão (`0007_player_appearance.sql`, nunca commitada nesta
-- branch, deixada como arquivo solto no diretório `migrations/` depois de um `git stash pop`
-- acidental) foi aplicada à produção junto com a migração de verdade deste lab (`0011`) porque
-- `npm run migrate` processa TODO arquivo do diretório, sem checar se está rastreado pelo git.
-- Essa migração adicionava 7 colunas (`equipped_hat_id`, `equipped_glasses_id`,
-- `equipped_shirt_color_id`, `equipped_pants_color_id`, `equipped_shoe_color_id`,
-- `equipped_backpack_color_id`, `equipped_hair_shape_id`) que NENHUM código deste Worker lê ou
-- escreve — a implementação de verdade do lab-163 (`0007_player_public_profile.sql`, já mesclada
-- em produção antes) usa uma única coluna `equipped_look jsonb`, não colunas separadas por eixo.
-- Confirmado por busca em todo `src/`: zero referências a qualquer um desses 7 nomes de coluna.
-- Sempre NULL desde a criação (nenhuma escrita jamais fez update nelas), então dropar é seguro —
-- nenhuma perda de dado real, só remove colunas mortas que nunca deveriam ter existido.
alter table player_identities
  drop column if exists equipped_hat_id,
  drop column if exists equipped_glasses_id,
  drop column if exists equipped_shirt_color_id,
  drop column if exists equipped_pants_color_id,
  drop column if exists equipped_shoe_color_id,
  drop column if exists equipped_backpack_color_id,
  drop column if exists equipped_hair_shape_id;
