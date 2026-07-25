import { HttpError } from './http.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function requireText(
  payload: Record<string, unknown>,
  fieldName: string,
  label: string,
) {
  const value = payload[fieldName]

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${label} is required.`)
  }

  return value.trim()
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.')
  }

  return email
}
