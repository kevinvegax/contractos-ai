import type { IncomingMessage, ServerResponse } from 'node:http'
import { Pool } from 'pg'

type PostgresInfo = {
  current_time: string
  current_date: string
  database_name: string
}

let pool: Pool | undefined

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    })
  }

  return pool
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET')
    sendJson(response, 405, { error: 'Metodo no permitido' })
    return
  }

  try {
    const result = await getPool().query<PostgresInfo>(`
      SELECT
        NOW()::text AS current_time,
        CURRENT_DATE::text AS current_date,
        CURRENT_DATABASE() AS database_name
    `)

    sendJson(response, 200, { postgres: result.rows[0] })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    sendJson(response, 500, {
      error: 'No se pudo consultar Postgres',
      detail,
    })
  }
}
