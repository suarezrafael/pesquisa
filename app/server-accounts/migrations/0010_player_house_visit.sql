-- lab-175 ("Lab 171 - Casa visitável somente leitura",
-- docs/market-metrics-engagement-backlog.md): mobília da casa (`Progress.unlockedFurnitureIds`/
-- `housePlacements`) sempre viveu só no `localStorage` do aparelho — pra um amigo visitar, precisa
-- virar um snapshot sincronizado, mesmo padrão de `equipped_look`/`badges` (migração 0007, lab-163).
--
-- `house_furniture_ids`/`house_placements` são jsonb (não colunas separadas nem `text[]`) pelo
-- mesmo motivo do lab-163: o Worker nunca resolve LAYOUT/apresentação (isso continua só no
-- client, `World3D.tsx`) — mas VALIDA a estrutura (`isValidHouseFurnitureIds`/
-- `isValidHousePlacements`, `domain.ts`) e sanitiza ids `subscriptionOnly` antes de responder
-- (`sanitizeHouseFurnitureIds`/`sanitizeHousePlacements`, achado do review automático do Copilot
-- no PR #49) na resposta do perfil público quando `house_visible` está ligado.
-- `house_furniture_ids` guarda o array com REPETIÇÃO (uma entrada por cópia possuída, mesmo
-- formato de `Progress.unlockedFurnitureIds`) — suficiente pra recalcular quantas cópias de cada
-- item mostrar, sem precisar de um objeto separado de contagem.
--
-- `house_visible` (padrão `true`, dono pode desativar em `MyHousePanel.tsx`) é uma preferência de
-- EXIBIÇÃO do dono ("proprietário controla visibilidade", exigida pelo documento) — quando
-- `false`, `GET /players/:id/public-profile` devolve `house: null` mesmo que os dados existam.
-- NÃO é um controle de acesso/autorização: a rota continua sem autenticar quem pergunta nem
-- checar amizade aceita (limitação arquitetural pré-existente desde o lab-160/163, reafirmada
-- várias vezes pelo review automático do Copilot neste PR) — qualquer um com o `playerId` (não é
-- credencial, é um id opaco) recebe a mesma resposta que um amigo receberia.
alter table player_identities add column if not exists house_furniture_ids jsonb;
alter table player_identities add column if not exists house_placements jsonb;
alter table player_identities add column if not exists house_visible boolean not null default true;
