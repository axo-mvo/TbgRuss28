/**
 * SMS sending module using Twilio REST API directly via fetch.
 * Falls back to console.log when Twilio env vars are missing (dev mode).
 */

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  // Fallback: log to console if Twilio env vars are missing
  if (!accountSid || !authToken || !fromNumber) {
    console.log('[SMS FALLBACK]', { to, body })
    return { success: true }
  }

  // Normalize Norwegian phone numbers: prepend +47 if 8 digits without prefix
  let normalizedTo = to.trim()
  if (/^\d{8}$/.test(normalizedTo)) {
    normalizedTo = `+47${normalizedTo}`
  }
  if (!normalizedTo.startsWith('+')) {
    normalizedTo = `+${normalizedTo}`
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const params = new URLSearchParams()
    params.set('To', normalizedTo)
    params.set('From', fromNumber)
    params.set('Body', body)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[SMS ERROR]', response.status, errorData)
      return { success: false, error: `Twilio error: ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error('[SMS ERROR]', err)
    return { success: false, error: 'Failed to send SMS' }
  }
}
