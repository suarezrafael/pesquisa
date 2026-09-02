import { readFileSync, existsSync } from 'node:fs'
import { Client } from 'pg'

if (existsSync(new URL('./.dev.vars', import.meta.url)) && !process.env.DATABASE_URL) {
  const raw = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) process.env[match[1]] = match[2]
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const schemas = await client.query(
    "select schema_name from information_schema.schemata where schema_name not like 'pg_%' and schema_name != 'information_schema'",
  )
  console.log('Schemas:', schemas.rows.map((r) => r.schema_name))
  const tables = await client.query(
    "select table_schema, table_name from information_schema.tables where table_schema = 'neon_auth'",
  )
  console.log('neon_auth tables:', tables.rows)
  if (tables.rows.length > 0) {
    const cols = await client.query(
      "select table_name, column_name, data_type from information_schema.columns where table_schema = 'neon_auth' order by table_name, ordinal_position",
    )
    console.log('neon_auth columns:', cols.rows)
  }
} finally {
  await client.end()
}
