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
--
-- Contra o banco de PRODUÇÃO deste projeto, já conferimos manualmente (`information_schema` +
-- leitura direta da tabela) que as 7 colunas estavam 100% `NULL` antes de rodar esta migração ali —
-- nenhum código nunca escreveu nelas desde que a 0007 errada foi aplicada minutos antes. Mas essa
-- verificação manual não vale pra QUALQUER outro ambiente que rode este arquivo (um clone novo, um
-- ambiente de staging, uma restauração de disaster-recovery que reaplica tudo do zero) — achado do
-- review automático do Copilot (PR #55, 9ª rodada): um `drop column if exists` cego não prova que
-- não há dado nem consumidor externo nesses campos em OUTRO lugar.
--
-- O arquivo `0007_player_appearance.sql` que criava essas 7 colunas NUNCA foi commitado nesta
-- branch (era só um arquivo solto local) — então num clone novo/CI/ambiente que nunca teve esse
-- acidente, as colunas simplesmente NÃO EXISTEM, e o bloco abaixo precisa reconhecer isso sem
-- quebrar (checar `information_schema.columns` antes de tentar ler as colunas, em vez de assumir
-- que elas existem). Só quando TODAS as 7 existem é que checamos se alguma tem valor não-nulo —
-- nesse caso a migração inteira aborta (dentro da mesma transação de `migrate.mjs`, nada fica pela
-- metade) em vez de confiar cegamente que o estado observado numa única aplicação vale em todo
-- lugar.
do $$
declare
  colunas_existentes int;
  linhas_com_dado bigint;
begin
  select count(*) into colunas_existentes
  from information_schema.columns
  where table_name = 'player_identities'
    and column_name in (
      'equipped_hat_id', 'equipped_glasses_id', 'equipped_shirt_color_id',
      'equipped_pants_color_id', 'equipped_shoe_color_id', 'equipped_backpack_color_id',
      'equipped_hair_shape_id'
    );

  if colunas_existentes = 0 then
    -- Ambiente onde a 0007 errada nunca foi aplicada (todo clone novo desta branch) — nada a
    -- dropar, nada a checar.
    return;
  end if;

  execute '
    select count(*) from player_identities
    where equipped_hat_id is not null
       or equipped_glasses_id is not null
       or equipped_shirt_color_id is not null
       or equipped_pants_color_id is not null
       or equipped_shoe_color_id is not null
       or equipped_backpack_color_id is not null
       or equipped_hair_shape_id is not null
  ' into linhas_com_dado;

  if linhas_com_dado > 0 then
    raise exception 'Migração 0012 abortada: % linha(s) de player_identities têm valor não-nulo numa das 7 colunas órfãs que este arquivo tentaria dropar — investigue antes de prosseguir, não assuma que o estado de outra aplicação desta migração ainda vale aqui.', linhas_com_dado;
  end if;
end $$;

alter table player_identities
  drop column if exists equipped_hat_id,
  drop column if exists equipped_glasses_id,
  drop column if exists equipped_shirt_color_id,
  drop column if exists equipped_pants_color_id,
  drop column if exists equipped_shoe_color_id,
  drop column if exists equipped_backpack_color_id,
  drop column if exists equipped_hair_shape_id;
