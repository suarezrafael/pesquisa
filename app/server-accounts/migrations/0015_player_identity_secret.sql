-- Troca segura de nickname depois do onboarding — `device_id` é POR APARELHO, compartilhado por
-- todos os perfis do mesmo tablet (lab-108, ver storage.ts `getOrCreateDeviceId`), então não prova
-- posse de UM perfil específico: um irmão trocando de perfil no mesmo aparelho enviaria o mesmo
-- device_id e poderia renomear a identidade do outro. `player_secret` é gerado uma vez no registro
-- e devolvido só ali — nunca exposto por nenhuma outra rota (busca, perfil público, amigos).
alter table player_identities add column if not exists player_secret uuid not null default gen_random_uuid();
