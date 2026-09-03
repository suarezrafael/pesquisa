# Laboratório 147 — Corrige achados do review automático do Copilot nos PRs 14-16

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: 093052e2caeee6c2be76a08a2e4e58b6a0b6d873

## Objetivo do laboratório

Pedido do usuário: "você deve ler os comentários do PR que o copilot gera na nossa pipeline dos
laboratório". O repositório tem `copilot-pull-request-reviewer` configurado — deixa review
automático (comentário geral + comentários inline por linha) em todo PR aberto. Os PRs 14, 15 e 16
(labs 143, 144 e 145) tinham review "🟡 Changes recommended" que nunca foram lidos antes de
mergear. Este laboratório lê e corrige os achados válidos de cada um.

## Achados e correções

**PR #14 (lab-143, backup pro R2)**:
- [x] `scripts/restore-from-backup.mjs` aplicava UPSERTs em loop sem transação — erro no meio
  deixava o banco parcialmente restaurado. Envolvido em `BEGIN`/`COMMIT`/`ROLLBACK` (mesmo padrão
  de `migrate.mjs`).
- [x] `backupCriticalTables` fazia `select *` — passaria a exportar qualquer coluna nova
  automaticamente, sem revisão. Trocado por colunas explícitas (mesma lista que o restore já
  precisava conhecer).
- [x] `scheduled()` rodava a reconciliação diária pra QUALQUER `controller.cron` não reconhecido,
  sem nenhum log — um typo futuro em `wrangler.toml` passaria despercebido. Adicionado log de erro
  quando o cron recebido não bate com o esperado.

**PR #15 (lab-144, LGPD)**:
- [x] `Promise.all([reconcileSubscriptions, purgeStalePairingCodes])` no Cron diário — se uma
  rejeitasse, a outra podia não terminar de ser aguardada corretamente. Trocado por
  `Promise.allSettled` com log de cada rejeição individualmente.
- [x] `URL.revokeObjectURL(url)` chamado imediatamente após `link.click()` em
  `FamilyPortal.tsx` (exportação de dados) — pode cancelar o download em alguns navegadores
  (Safari). Link agora é anexado/removido do DOM e a revogação adiada.
- [x] `purgeStalePairingCodes` usava `returning code` só pra contar linhas — trocado por
  `returning 1`, sem carregar dado nenhum de volta.

**PR #16 (lab-145, config sem hardcode)**:
- [x] **Origin do header usado sem checagem pra montar `success_url`/`cancel_url` do Stripe** —
  como o header é controlado pelo cliente (e a rota não tem CORS restrito), uma chamada direta à
  API com `Origin` malicioso podia gerar uma sessão Stripe que redireciona quem pagou pra um
  domínio arbitrário (risco de phishing). Nova função pura `resolveTrustedOrigin` (`domain.ts`,
  testada) só aceita um `Origin` que está em `ALLOWED_ORIGINS` (`[vars]`, novo); qualquer outro
  cai no `DEFAULT_ORIGIN`.
- [x] `getJwks(env)` cacheava o `RemoteJWKSet` sem levar em conta se `env.NEON_AUTH_JWKS_URL`
  mudava entre chamadas — inofensivo neste Worker específico (mesmo `env` sempre), mas um bug
  latente. Cache agora guarda a URL usada e recria o `RemoteJWKSet` se ela mudar.

## Fora de escopo
- PR #17/#18 (lab-146) — achados do Copilot nesses PRs foram corrigidos dentro do próprio
  `labs/lab-146-.../CONTEXT.md` (dois rounds), não aqui.
- Revisão retroativa de PRs anteriores ao #14 (labs 1-142) — não pedido pelo usuário; o pedido foi
  sobre o processo daqui pra frente + os PRs recentes ainda "em aberto" na memória da sessão.
