function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

export async function sendInvitationEmail(email: string, companyName: string, acceptanceUrl: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw new Error('Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'User-Agent': 'northstar-evidence-platform/1.0' },
    body: JSON.stringify({
      from, to: [email], subject: `You’re invited to ${companyName} on Northstar`,
      text: `You have been invited to join ${companyName} on Northstar. Accept your invitation: ${acceptanceUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#243044"><h1>You’re invited to Northstar</h1><p>You’ve been invited to join <strong>${escapeHtml(companyName)}</strong>.</p><p><a href="${escapeHtml(acceptanceUrl)}" style="background:#7565d7;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block">Accept invitation</a></p><p style="color:#7d899d;font-size:13px">This invitation expires in 7 days and can only be used once.</p></div>`,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; name?: string } | null
    const detail = body?.message ?? body?.name
    throw new Error(`Email provider rejected the message (${response.status})${detail ? `: ${detail}` : ''}`)
  }
  return await response.json() as { id: string }
}
