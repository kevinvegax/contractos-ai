function getApiMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error?: unknown }

    if (typeof error === 'string') {
      return error
    }
  }

  return null
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    headers,
  })
  const text = await response.text()
  let payload: unknown = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new Error(
      getApiMessage(payload) ?? `Request failed (${response.status})`,
    )
  }

  return payload as T
}

export function postJson<T>(path: string, payload: Record<string, unknown>) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
