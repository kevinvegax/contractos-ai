import type { IncomingMessage, ServerResponse } from 'node:http'
import { Pool } from 'pg'

type Contractor = {
  id: number
  name: string
  specialty: string
  city: string
}

const localDatabaseUrl =
  'postgresql://contractors:contractors@localhost:5432/contractors_ai'

let pool: Pool | undefined

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? localDatabaseUrl,
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
    const db = getPool()

    const result = await db.query<Contractor>(`
      SELECT id, name, specialty, city
      FROM contractors
      ORDER BY id ASC
    `)

    sendJson(response, 200, { contractors: result.rows })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    sendJson(response, 500, {
      error: 'No se pudo consultar Postgres local',
      detail,
    })
  }
}
