# Contexto — Laboratório 143 — Backup diário do banco pra Cloudflare R2

Preenchido em: 2026-09-03
Commit inicial → final: 5c959055ca399813bbfb0a34700ee7bdf19e0609..HEAD

## O que foi feito

**Backend (`app/server-accounts`)**: terceiro Cron Trigger (`DATABASE_BACKUP_CRON = '0 10 * * *'`,
`wrangler.toml`) chama `backupCriticalTables(env)` (`src/index.ts`), que consulta
`family_accounts`/`subscriptions`/`pairing_codes`/`entitlement_tokens` inteiras e grava um objeto
JSON por dia (`backups/AAAA-MM-DD.json`) no bucket R2 `missao-aprender-backups` (binding
`DATABASE_BACKUPS`). `scheduled()` virou um dispatch de 3 vias (`WEEKLY_EMAIL_CRON` /
`DATABASE_BACKUP_CRON` / reconciliação diária). Novo `scripts/restore-from-backup.mjs` — lê um
snapshot baixado localmente (`wrangler r2 object get`) e faz `upsert` linha a linha em cada tabela,
respeitando a ordem de foreign key (`family_accounts` primeiro); roda em modo dry-run por padrão,
só escreve de verdade com a flag `--confirm`.

**Infra**: bucket `missao-aprender-backups` criado via `wrangler r2 bucket create` depois que o
usuário habilitou R2 na conta Cloudflare (adicionou método de pagamento no dashboard — decisão
dele, confirmada via `AskUserQuestion` numa sessão anterior, escolhendo R2 sobre a alternativa sem
custo/sem cartão de anexar o backup por e-mail via Resend).

## Decisões técnicas tomadas

- **Só as 4 tabelas que carregam dinheiro real** — nenhuma delas guarda PII da criança (nome/
  e-mail do responsável mora só em `neon_auth`, gerenciado pelo próprio Neon, nunca replicado
  aqui). `product_events`/`progress_snapshots`/`progress_backups`/etc. ficam de fora de propósito —
  não são o problema que G14 descreve (perder ESSAS não impede saber quem pagou).
- **Restauração é manual/administrativa, não um endpoint** — diferente de `/progress-backup`
  (lab-142), que É self-service porque perder o PRÓPRIO progresso é rotina esperada (limpar
  navegador); perder O BANCO INTEIRO é raro o bastante que já exige alguém decidir manualmente "pra
  quando restaurar" antes de qualquer coisa automática rodar. Não vale a complexidade de um
  endpoint (autenticação admin, proteção contra restauração acidental) pra um cenário tão raro.
- **Um objeto por dia, sem histórico/lifecycle rule configurada** — suficiente pro objetivo (nunca
  perder mais que ~24h do vínculo família↔assinatura); expiração automática de objetos antigos
  ficou fora de escopo (bucket free tier tem 10GB, um JSON de texto pequeno por dia não vai chegar
  perto disso tão cedo).
- **Cron às 10:00 UTC**, uma hora depois da reconciliação (09:00 UTC) de propósito — nunca competir
  pelo mesmo minuto de execução dentro do Worker.

## Pendências / dívidas conhecidas

- Sem alerta automático se o Cron falhar silenciosamente (mesma lacuna que já existe pros outros
  dois Crons deste Worker — não é regressão nova deste laboratório).
- `scripts/restore-from-backup.mjs` nunca foi exercitado contra um snapshot de verdade baixado do
  R2 (só revisado por leitura) — a lógica de `upsert`/ordem de FK foi validada pela leitura do
  schema (`migrations/0001_baseline.sql`), não por uma execução real. Bom próximo passo se algum
  dia um restore de verdade for necessário: rodar primeiro em dry-run contra o snapshot real do dia
  antes de confiar nele numa emergência de verdade.
- G13 (LGPD) e G15 (configuração/acoplamento a fornecedor) de
  `docs/prompts/05-escala-e-viabilidade.md` continuam em aberto — não foram escolhidos pelo usuário
  nesta rodada.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas concluídas (ver ressalva sobre `restore-from-backup.mjs` nunca ter sido exercitado
contra um snapshot real, acima).

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. Se retomar o backlog de `05-escala-e-viabilidade.md`, os itens
restantes são G13 (LGPD: exclusão de dados, retenção, consentimento parental pro multiplayer) e
G15 (config/acoplamento a fornecedor: URLs hardcoded, DNS em IP fixo, rotação da chave da API do
Neon).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc --noEmit` (server-accounts): sem erros.
- `npm run test` (server-accounts): 64/64 (sem teste novo — `backupCriticalTables` é I/O puro,
  sem lógica de domínio isolável pra testar sem mockar `neon`/R2).
- **Backup testado ao vivo, ponta a ponta, contra dados reais**: `wrangler dev --test-scheduled`
  local disparando `DATABASE_BACKUP_CRON` (`curl "http://127.0.0.1:8790/__scheduled?cron=0+10+*+*+*"`)
  → `200 Ran scheduled event` (29ms), consultando as 4 tabelas do banco de PRODUÇÃO real
  (`DATABASE_URL` não é um binding simulável do Workers, então mesmo em modo local a query é real)
  sem nenhum erro. Escrita real no bucket R2 confirmada separadamente e de forma isolada (já que
  `wrangler dev --test-scheduled` só expõe R2 em modo local/simulado, não `--remote`):
  `wrangler r2 object put/get/delete --remote` com um objeto de teste
  (`backups/_probe.json`), removido logo em seguida — confirma que o binding, o nome do bucket e as
  credenciais da conta batem exatamente com o que o Worker vai usar em produção.
- Deploy: PR #14 aberto, aguardando CI/merge.
