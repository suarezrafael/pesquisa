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
-- (achado do review automático do Copilot, PR #55, 9ª/10ª/11ª rodadas), com 3 camadas de
-- segurança:
--
-- 1) PRÉ-checagem SEM lock nenhum — todo clone novo desta branch (o caso mais comum, já que o
--    arquivo que criava as 7 colunas nunca foi commitado) sai daqui sem nunca ter pedido lock
--    nenhum em `player_identities`, uma tabela viva do recurso social (achado da 11ª rodada: pedir
--    `access exclusive` ANTES de saber se há algo a fazer bloqueava leitura/escrita da tabela
--    social durante todo deploy, mesmo quando a migração é um no-op).
-- 2) Só se a pré-checagem achar 1+ coluna é que pegamos `lock table ... in access exclusive mode`
--    e RE-checamos sob o lock (fecha a janela de corrida entre a pré-checagem sem lock e a
--    aquisição do lock — outra transação podia ter mudado o schema nesse meio-tempo).
-- 3) A checagem final trata os 3 estados possíveis explicitamente — 0 (nada a fazer), 7 (checa
--    dado antes de dropar), ou 1-6 (schema parcial/inesperado — aborta com mensagem clara em vez
--    de um erro genérico de "coluna não existe").
--
-- O `lock table`/`alter table` dentro do bloco `do $$ ... $$` funcionam direto em PL/pgSQL sem
-- precisar de `execute` (confirmado rodando os dois isoladamente numa transação com rollback antes
-- de escrever esta versão) — só a checagem de DADO usa `execute` porque referencia nomes de coluna
-- que podem não existir dependendo do ambiente (não dá pra escrever a query direto sem que o
-- parser falhe cedo demais num ambiente onde as colunas nem existem).
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
    -- Pré-checagem SEM lock: ambiente onde a 0007 errada nunca foi aplicada (todo clone novo
    -- desta branch). Nada a dropar, nunca precisou bloquear a tabela.
    return;
  end if;

  -- Só pega o lock (e só bloqueia leitura/escrita de `player_identities`) quando a pré-checagem
  -- já indicou que há algo a investigar.
  lock table player_identities in access exclusive mode;

  -- Re-checa sob o lock — fecha a janela entre a pré-checagem (sem lock) e agora.
  select count(*) into colunas_existentes
  from information_schema.columns
  where table_name = 'player_identities'
    and column_name in (
      'equipped_hat_id', 'equipped_glasses_id', 'equipped_shirt_color_id',
      'equipped_pants_color_id', 'equipped_shoe_color_id', 'equipped_backpack_color_id',
      'equipped_hair_shape_id'
    );

  if colunas_existentes = 0 then
    -- Outra transação já resolveu isso entre a pré-checagem e o lock — nada a fazer.
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

  alter table player_identities
    drop column if exists equipped_hat_id,
    drop column if exists equipped_glasses_id,
    drop column if exists equipped_shirt_color_id,
    drop column if exists equipped_pants_color_id,
    drop column if exists equipped_shoe_color_id,
    drop column if exists equipped_backpack_color_id,
    drop column if exists equipped_hair_shape_id;
end $$;
