# Laboratório 143 — Backup diário do banco pra Cloudflare R2

Status: em andamento
Início: 2026-09-03
Fim: -
Commit inicial: 5c959055ca399813bbfb0a34700ee7bdf19e0609

## Objetivo do laboratório

Resolve G14 de `docs/prompts/05-escala-e-viabilidade.md`: "Neon Free tem janela de restauração de
6 horas... `family_accounts` e o vínculo família↔assinatura são os únicos dados do sistema que
representam dinheiro real e não têm exportação periódica. Perder o banco = não saber quem pagou (o
Stripe reconstrói a assinatura, não o vínculo com o token de entitlement da criança)." Confirmado
com o usuário via `AskUserQuestion`: Cloudflare R2 em vez de anexo de e-mail (Resend) — exige
cartão cadastrado na conta Cloudflare pra habilitar R2 (nunca cobrado dentro do nível grátis de
10GB/mês), mas foi a opção escolhida.

## Funcionalidades planejadas
- [x] Terceiro Cron Trigger (`DATABASE_BACKUP_CRON`, 10:00 UTC diário) em `wrangler.toml`,
  dispatch em `scheduled()` (`src/index.ts`).
- [x] `backupCriticalTables(env)` — exporta `family_accounts`/`subscriptions`/`pairing_codes`/
  `entitlement_tokens` como um objeto JSON por dia (`backups/AAAA-MM-DD.json`) pro bucket R2.
- [x] Binding `DATABASE_BACKUPS` (`[[r2_buckets]]`) em `wrangler.toml`.
- [ ] Bucket R2 `missao-aprender-backups` criado de verdade na conta Cloudflare — bloqueado até o
  usuário habilitar R2 (adicionar método de pagamento no dashboard; nunca feito por mim, ver
  `docs/prompts/01-seguranca.md`/regra de não inserir dado financeiro).
- [x] `scripts/restore-from-backup.mjs` — restauração manual/administrativa (upsert por tabela,
  dry-run por padrão, `--confirm` pra aplicar de verdade).
- [x] Atualização de `README.md` (`app/server-accounts`) documentando o mecanismo.
- [ ] Teste ao vivo do backup (via `wrangler dev` ou invocação manual do cron) — depende do bucket
  existir.
- [ ] Deploy em produção (push → PR → CI → merge).

## Fora de escopo (explicitamente adiado)
- G13 (LGPD: exclusão de dados, política de retenção, consentimento parental pro multiplayer) —
  não escolhido pelo usuário nesta rodada.
- G15 (configuração/acoplamento a fornecedor: URLs hardcoded, DNS em IP fixo, rotação de chave
  Neon) — idem.
- Histórico de restaurações passadas ou versionamento do backup além de "um objeto por dia" (sem
  expiração/lifecycle rule configurada no bucket ainda).
