import { Pool } from 'pg'

let pool: Pool | undefined

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.PRODUCTION_DATABASE_URL ??
        process.env.STAGING_DATABASE_URL ??
        process.env.DATABASE_URL,
      max: 3,
    })
  }

  return pool
}
