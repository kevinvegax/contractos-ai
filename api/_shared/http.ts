import type { IncomingMessage, ServerResponse } from 'node:http'

export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export function sendError(response: ServerResponse, error: unknown) {
  if (error instanceof HttpError) {
    sendJson(response, error.statusCode, { error: error.message })
    return
  }

  const payload: Record<string, unknown> = {
    error: 'Unexpected server error.',
  }

  if (process.env.NODE_ENV !== 'production') {
    payload.detail = error instanceof Error ? error.message : String(error)
  }

  sendJson(response, 500, payload)
}

export function requireMethod(
  request: IncomingMessage,
  response: ServerResponse,
  methods: string[],
) {
  if (!request.method || !methods.includes(request.method)) {
    response.setHeader('allow', methods.join(', '))
    throw new HttpError(405, 'Method not allowed.')
  }
}

export async function readJsonObject(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()

  if (!rawBody) {
    return {} as Record<string, unknown>
  }

  try {
    const payload: unknown = JSON.parse(rawBody)

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new HttpError(400, 'Request body must be a JSON object.')
    }

    return payload as Record<string, unknown>
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    throw new HttpError(400, 'Request body must be valid JSON.')
  }
}
