import { readFileSync, existsSync } from 'node:fs'
import { Client } from 'pg'

// lab-143 (G14): restauração é administrativa/manual de propósito — perder o banco inteiro é um
// evento raro que já exige alguém decidir "restaurar pra quando" antes de qualquer coisa
// automática rodar; não vale a complexidade de um endpoint self-service pra isso (diferente de
// `/progress-backup` do lab-142, que É self-service porque perder o PRÓPRIO progresso é rotina
// esperada). Uso: baixe o objeto do dia desejado (`npx wrangler r2 object get
// missao-aprender-backups/backups/AAAA-MM-DD.json --file ./snapshot.json`) e rode
// `node scripts/restore-from-backup.mjs ./snapshot.json` — sem `--confirm`, só mostra quantas
// linhas cada tabela tem no snapshot (dry run); com `--confirm`, aplica de verdade via UPSERT
// (nunca apaga linha existente, só insere as que faltam ou atualiza pelo id/chave primária).

const [, , snapshotPath, ...flags] = process.argv
if (!snapshotPath) {
  console.error('Uso: node scripts/restore-from-backup.mjs <caminho-do-snapshot.json> [--confirm]')
  process.exit(1)
}
const confirm = flags.includes('--confirm')

if (existsSync(new URL('./.dev.vars', new URL('../', import.meta.url))) && !process.env.DATABASE_URL) {
  const raw = readFileSync(new URL('./.dev.vars', new URL('../', import.meta.url)), 'utf8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) process.env[match[1]] = match[2]
  }
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL não definido — leia de app/server-accounts/.dev.vars (local) ou passe via env.')
  process.exit(1)
}

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))

// Ordem importa: family_accounts primeiro (as outras três referenciam via foreign key).
const TABLES = [
  {
    name: 'family_accounts',
    pk: 'id',
    columns: ['id', 'owner_user_id', 'created_at'],
  },
  {
    name: 'subscriptions',
    pk: 'id',
    columns: [
      'id', 'family_account_id', 'stripe_customer_id', 'stripe_subscription_id',
      'status', 'current_period_end', 'updated_at', 'last_event_created_at',
    ],
  },
  {
    name: 'pairing_codes',
    pk: 'code',
    columns: ['code', 'family_account_id', 'expires_at', 'redeemed_at'],
  },
  {
    name: 'entitlement_tokens',
    pk: 'jti',
    columns: ['jti', 'family_account_id', 'issued_at', 'revoked_at'],
  },
]

console.log(`Snapshot exportado em: ${snapshot.exportedAt}`)
for (const table of TABLES) {
  console.log(`  ${table.name}: ${(snapshot[table.name] ?? []).length} linha(s)`)
}

if (!confirm) {
  console.log('\nDry run (sem --confirm) — nenhuma escrita feita. Rode de novo com --confirm pra aplicar.')
  process.exit(0)
}

const client = new Client({ connectionString })
await client.connect()
try {
  // lab-147 (achado do review automático do Copilot no PR #14): sem transação, um erro no meio
  // do loop (FK, conectividade, tipo inválido) deixava o banco num estado PARCIALMENTE
  // restaurado — algumas tabelas atualizadas, outras não. Mesmo padrão de `migrate.mjs`
  // (`begin`/`commit`, `rollback` no `catch`): ou tudo é aplicado, ou nada é.
  await client.query('begin')
  try {
    for (const table of TABLES) {
      const rows = snapshot[table.name] ?? []
      if (rows.length === 0) continue

      const cols = table.columns
      const updateSet = cols.filter((c) => c !== table.pk).map((c) => `${c} = excluded.${c}`).join(', ')

      let restored = 0
      for (const row of rows) {
        const values = cols.map((c) => row[c] ?? null)
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
        await client.query(
          `insert into ${table.name} (${cols.join(', ')}) values (${placeholders})
           on conflict (${table.pk}) do update set ${updateSet}`,
          values,
        )
        restored++
      }
      console.log(`${table.name}: ${restored} linha(s) restaurada(s)/atualizada(s).`)
    }
    await client.query('commit')
    console.log('\nRestauração concluída.')
  } catch (err) {
    await client.query('rollback')
    console.error('\nErro durante a restauração — nada foi aplicado (rollback):', err.message)
    throw err
  }
} finally {
  await client.end()
}
