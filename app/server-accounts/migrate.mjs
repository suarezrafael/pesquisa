import { readFileSync, existsSync } from 'node:fs'
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

const client = new Client({ connectionString })
await client.connect()
try {
  const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  await client.query(sql)
  console.log('Schema aplicado com sucesso.')
} finally {
  await client.end()
}
