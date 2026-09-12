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
-- Contra o banco de PRODUÇÃO deste projeto, já conferimos manualmente que as 7 colunas estavam
-- 100% `NULL` antes de rodar esta migração ali. Mas isso não vale pra QUALQUER outro ambiente que
-- rode este arquivo (clone novo, staging, disaster-recovery do zero) — daí a precondição abaixo
-- (achado do review automático do Copilot, PR #55, 9ª/10ª rodadas), com 2 camadas de segurança:
--
-- 1) `lock table ... in access exclusive mode` ANTES de checar qualquer coisa — mesmo modo de
--    lock que `alter table ... drop column` já pediria de qualquer forma no final desta mesma
--    transação, só que pedido mais cedo. Isso bloqueia QUALQUER outro leitor/escritor na tabela
--    (inclusive um `insert`/`update` concorrente) até este `commit`/`rollback` — sem isso, um
--    escritor concorrente podia gravar um valor nas colunas DEPOIS da checagem de "tá tudo nulo" e
--    ANTES do `drop column` pegar o lock exclusivo sozinho, e a migração dropava esse valor recém
--    escrito sem nunca ter visto ele (achado da 10ª rodada).
-- 2) A checagem de quantas das 7 colunas existem trata os 3 estados possíveis EXPLICITAMENTE — 0
--    (nenhuma existe, ambiente nunca teve o acidente, ex.: todo clone novo desta branch — não faz
--    nada), 7 (todas existem, checa se alguma tem valor não-nulo antes de dropar), e qualquer outro
--    número de 1 a 6 (schema parcial/inesperado — aborta com mensagem clara em vez de deixar o
--    `execute` da checagem de dados bater num erro genérico de "coluna não existe" pra uma coluna
--    que faltou, achado também da 10ª rodada).
lock table player_identities in access exclusive mode;

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
  elsif colunas_existentes < 7 then
    raise exception 'Migração 0012 abortada: esperava 0 ou 7 das 7 colunas órfãs em player_identities, encontrou %. Schema parcial/inesperado — investigue manualmente antes de rodar esta migração, não assuma que é seguro completar o drop.', colunas_existentes;
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
