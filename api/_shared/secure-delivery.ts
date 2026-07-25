import { HttpError } from './http.ts'

type TemporaryPasswordDelivery = {
  email: string
  firstName: string
  lastName: string
  temporaryPassword: string
  expiresAt: string
}

export async function deliverTemporaryPassword({
  email,
  firstName,
  lastName,
  temporaryPassword,
  expiresAt,
}: TemporaryPasswordDelivery) {
  const webhookUrl = process.env.ADMIN_TEMP_PASSWORD_DELIVERY_WEBHOOK_URL

  if (!webhookUrl) {
    throw new HttpError(
      503,
      'Secure temporary password delivery is not configured.',
    )
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (process.env.ADMIN_TEMP_PASSWORD_DELIVERY_TOKEN) {
    headers.authorization = `Bearer ${process.env.ADMIN_TEMP_PASSWORD_DELIVERY_TOKEN}`
  }

  const deliveryResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: email,
      firstName,
      lastName,
      temporaryPassword,
      expiresAt,
      template: 'admin-temporary-password',
    }),
  })

  if (!deliveryResponse.ok) {
    throw new HttpError(502, 'Secure temporary password delivery failed.')
  }

  return {
    method: 'secure-webhook',
    destination: email,
    deliveredAt: new Date().toISOString(),
  }
}
