# Contexto — Laboratório 144 — LGPD: exclusão, exportação, retenção

Preenchido em: 2026-09-03
Commit inicial → final: d1a32505baba8c477657e58d93b840e2461e255e..HEAD

## O que foi feito

**Backend (`app/server-accounts`)**: `handleAccountExport` (`GET /account/export`) e
`handleAccountDelete` (`POST /account/delete`) em `src/index.ts`, autenticados com o JWT do Neon
Auth (mesmo `requireUserId` já usado por `/checkout`/`/subscription`). Exclusão: cancela qualquer
assinatura Stripe ativa (best-effort, fora da transação — efeito colateral externo, não dá pra
fazer atômico com o Postgres), depois apaga TUDO numa `sql.transaction([...])` só (driver HTTP do
Neon, não-interativo): `entitlement_tokens`/`pairing_codes`/`nps_responses`/`progress_snapshots`/
`progress_backups`/`subscriptions`/`family_accounts` (nessa ordem, por causa das foreign keys) e
por fim `neon_auth.session`/`account`/`"user"`. Novo rate limiter `ACCOUNT_LIMITER` (5/60s,
compartilhado entre as duas rotas). `purgeStalePairingCodes` (nova função) apaga códigos de
pareamento expirados há mais de 30 dias, chamada junto da reconciliação diária já existente
(mesmo Cron, 09:00 UTC — sem gatilho novo).

**Frontend**: `AccountDataPanel` novo em `FamilyPortal.tsx` — "Baixar meus dados" (busca
`/account/export`, gera um `Blob`/`<a download>` com o JSON) e "Excluir minha conta e todos os
dados" (confirmação em duas etapas, mesmo padrão de "desvincular todos os aparelhos" já existente
em `PairingCodeGenerator`). Exclusão bem-sucedida chama `authClient.signOut()` e devolve a tela de
login. `LegalPage.tsx` §5/§6 reescritos — a Política de Privacidade sempre PROMETEU os dois por
e-mail; agora descreve o caminho self-service real, mantendo o e-mail como alternativa.

## Decisões técnicas tomadas

- **Cancelamento do Stripe é best-effort, fora da transação Postgres** — são dois sistemas
  diferentes, não dá pra fazer atômico de verdade; se o Stripe já não tem mais a assinatura (ou
  falha por qualquer motivo), só loga e segue com a exclusão dos dados, que é o pedido que
  realmente importa pro usuário aqui. O pior cenário é a assinatura continuar cobrando no Stripe
  mesmo com os dados apagados — mitigado por rodar o cancelamento ANTES de apagar a linha que
  guarda `stripe_subscription_id` (não dá pra tentar de novo depois se falhar aqui).
- **Deletar a linha em `neon_auth."user"` direto por SQL, não via SDK do Better Auth** —
  investigado primeiro: o endpoint `POST /delete-user` do Better Auth existe no SDK/tipos
  (`node_modules/better-auth/dist/api/routes/update-user.d.mts`), mas testado ao vivo contra o
  Neon Auth deste projeto devolve `404` — não habilitado nesta instância gerenciada, fora do nosso
  controle (Neon Auth = Better Auth GERENCIADO pela Neon, sem acesso à config do plugin). Como
  este Worker já tem acesso total ao mesmo Postgres (inclusive ao schema `neon_auth`, usado desde
  sempre pra achar `owner_user_id`), apagar `session`/`account`/`"user"` direto por SQL, respeitando
  a ordem de FK, foi a alternativa viável — testado ao vivo (ver Estado do repositório).
- **JWT já emitido continua válido por até ~15 min após a exclusão** — o token do Neon Auth é
  verificado via JWKS (assinatura, sem consulta ao banco a cada request), então apagar a sessão no
  Postgres não invalida um JWT já em mãos instantaneamente. Mesmo trade-off já aceito pro token de
  entitlement da criança neste mesmo Worker — não vale a complexidade de uma blocklist pra uma
  janela tão curta.
- **Retenção de 30 dias pra `pairing_codes`** — o código só tem função dentro dos 15 minutos de
  validade; 30 dias dá folga generosa pra suporte/auditoria ("esse código chegou a ser usado?")
  sem deixar a tabela crescer sem limite pra sempre (LGPD art. 15/16: reter só enquanto houver
  finalidade). Purga roda junto do Cron diário já existente, sem gatilho novo em `wrangler.toml`.
- **Exportação usa `neon_auth."user"` direto** (nome/e-mail/data de criação) além das tabelas
  próprias do Worker — identidade do responsável também é dado dele, faz parte do que a
  portabilidade (LGPD art. 18 V) precisa devolver, não só as tabelas que este Worker "inventou".
- **Consentimento parental pro multiplayer NÃO entrou nesta rodada** (ver Pendências) — decisão
  consciente de escopo, não esquecimento: é uma pergunta de PRODUTO (quando capturar, o que
  exatamente consentir, o que fazer com famílias já existentes) antes de ser uma pergunta técnica.

## Pendências / dívidas conhecidas

- **Consentimento parental específico pro multiplayer** (G13) continua em aberto — precisa de uma
  conversa de produto separada antes de virar código: o cadastro já tem parental gate + aceite dos
  Termos/Privacidade (que já mencionam o multiplayer, `LegalPage.tsx` §1 da Política), mas G13
  parece pedir um registro EXPLÍCITO e separado. Se o usuário confirmar que isso é necessário, é
  candidato a um laboratório próprio.
- Restauração de conta excluída não existe (nem faz sentido existir por padrão — é o oposto do
  pedido de exclusão). Se o usuário errar e quiser desfazer, hoje só dá pra reconstruir a família
  via o backup diário completo do banco (lab-143, `scripts/restore-from-backup.mjs`) — restauração
  PARCIAL de uma família específica não foi desenhada.
- `purgeStalePairingCodes` só foi observada rodando sem erro (nenhum código tinha mais de 30 dias
  ainda pra apagar de verdade, sistema é recente demais) — a lógica do `delete ... where expires_at
  < now() - interval '30 days'` foi revisada por leitura, não por um caso real de exclusão.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas — todas concluídas. O consentimento parental pro multiplayer nunca esteve
no escopo planejado desta rodada (ver `FEATURES.md`, "Fora de escopo").

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. Restam do backlog de `05-escala-e-viabilidade.md`: G15 (config/infra —
parte seguríssima: tirar `NEON_AUTH_JWKS_URL`/fallback hardcoded do Worker; parte que exige
confirmação extra: trocar DNS do domínio pra CNAME e rotacionar a API key ampla do Neon, mudanças
em infraestrutura de produção ao vivo) e a decisão de produto sobre consentimento parental pro
multiplayer citada acima.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc --noEmit` (server-accounts): sem erros. `npm run test` (server-accounts): 64/64 (sem
  teste novo — os handlers novos são I/O puro, sem lógica de domínio isolável, mesmo raciocínio
  do lab-143).
- `npm run build` (app): sem erros. `npm run test` (app): 99/99 (sem teste novo — painel de UI
  sem lógica de domínio nova).
- **Backend testado ao vivo, ponta a ponta, contra o banco de PRODUÇÃO real**: conta de teste
  descartável criada via `sign-up/email` direto no Neon Auth (curl, `Origin` de um domínio
  confiável). `GET /account/export` sem família → `{responsible, families: []}`; `POST
  /pairing/generate` cria `family_accounts`+`pairing_codes`; export de novo mostra os dois;
  `POST /account/delete` → `204`; export depois → `responsible: null, families: []`; consulta SQL
  direta confirmou ZERO linhas remanescentes em `neon_auth.user`/`session`/`account`,
  `family_accounts` e `pairing_codes`; exclusão repetida (idempotência) → `204` de novo, sem erro;
  6 chamadas rápidas em `/account/export` confirmaram o rate limiter (`429` a partir da 5ª);
  Cron diário disparado local (`/cdn-cgi/local/scheduled?cron=0+9+*+*+*`) rodou reconciliação +
  purga de `pairing_codes` sem erro.
- **UI verificada ao vivo NUM NAVEGADOR DE VERDADE** (não só curl) — diferente da limitação de
  automação que bloqueou a verificação visual dos labs 140-142 (conteúdo 3D/Babylon perde o
  `requestAnimationFrame` em aba sem foco): esta é uma tela 2D sem canvas, então funcionou. Frontend
  local (`vite dev`) apontado temporariamente pro Worker local (`.env.local`, removido depois,
  nunca comitado) via `wrangler dev`: cadastro de responsável novo → painel "Meus dados" aparece →
  clique em "Baixar meus dados" sem erro → clique em "Excluir..." mostra a confirmação em duas
  etapas com o texto certo → confirmar devolve a tela de login → tentar entrar de novo com a MESMA
  senha devolve "Invalid email or password", confirmando que a conta reamente sumiu.
- Deploy: PR #15 mergeado em `main` (commit `7c363dd`), os 3 jobs de CI/CD verdes. `GET /health`
  confirmado `200` pós-deploy; `GET /account/export` sem token confirmado `401` em produção (rota
  existe e exige autenticação, não `404`).
