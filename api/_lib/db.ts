import { Pool, type PoolClient } from 'pg'
import type { IncomingMessage } from 'node:http'

let pool: Pool | undefined

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.PRODUCTION_DATABASE_URL ??
        process.env.STAGING_DATABASE_URL ??
        process.env.DATABASE_URL,
      max: 5,
    })
  }
  return pool
}

export async function withCompanyContext<T>(
  companyId: string,
  callback: (client: PoolClient) => Promise<T>,
  userId?: string,
) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.company_id', $1, true)", [companyId])
    if (userId) await client.query("SELECT set_config('app.user_id', $1, true)", [userId])
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function withUserContext<T>(userId: string, callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId])
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export function sendJson(
  response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
  statusCode: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export function readJson(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = ''
    request.on?.('data', (chunk: Buffer | string) => { body += chunk.toString() })
    request.on?.('end', () => {
      try { resolve(body ? JSON.parse(body) as Record<string, unknown> : {}) } catch { reject(new Error('Invalid JSON body')) }
    })
    request.on?.('error', reject)
  })
}
