import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { Client } from 'pg'

// .dev.vars é o mesmo formato KEY=VALUE do wrangler (gitignored) — lido à mão aqui pra não
// precisar de mais uma dependência (`dotenv`) só pra este script administrativo.
if (existsSync(new URL('./.dev.vars', import.meta.url)) && !process.env.DATABASE_URL) {
  const raw = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8')
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

const migrationsDir = new URL('./migrations/', import.meta.url)
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const client = new Client({ connectionString })
await client.connect()
try {
  // lab-101, G10: registro de quais migrações já foram aplicadas — sem isso, `migrate.mjs`
  // reaplicava o arquivo INTEIRO toda vez, sem histórico de versão nenhum (cada instrução do SQL
  // precisava ser idempotente à mão pra isso não quebrar).
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const { rows } = await client.query('select filename from schema_migrations')
  const applied = new Set(rows.map((row) => row.filename))

  let appliedCount = 0
  for (const file of files) {
    if (applied.has(file)) continue

    const sql = readFileSync(new URL(file, migrationsDir), 'utf8')
    // Postgres suporta DDL transacional (diferente de MySQL) — se o arquivo falhar no meio, a
    // transação inteira reverte, em vez de deixar o schema pela metade.
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    }
    console.log(`Aplicada: ${file}`)
    appliedCount++
  }

  console.log(appliedCount > 0 ? `${appliedCount} migração(ões) aplicada(s).` : 'Nenhuma migração pendente.')
} finally {
  await client.end()
}
