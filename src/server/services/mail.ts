import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Outbound email: password resets and the daily alert digest.
 *
 * Every function here degrades to a no-op when SMTP is unconfigured, returning
 * false instead of throwing. Losing an email should never fail the request that
 * triggered it — a password reset that cannot be delivered is still a valid
 * reset, and the token is returned to the caller in development anyway.
 */

let transporter: Transporter | null = null
let warned = false

/** Port 465 implies implicit TLS; anything else negotiates STARTTLS. */
function getTransport(): Transporter | null {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    if (!warned) {
      console.warn('[mail] SMTP not configured; emails will not be sent')
      warned = true
    }
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  return transporter
}

function fromAddress() {
  return process.env.SMTP_FROM || 'no-reply@localhost'
}

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const tx = getTransport()
  if (!tx) return false
  try {
    await tx.sendMail({ from: fromAddress(), to, subject, html })
    return true
  } catch (error) {
    console.error(`[mail] failed to send to ${to}:`, error)
    return false
  }
}

export async function sendPasswordReset(to: string, token: string): Promise<boolean> {
  const resetUrl = `${appUrl()}/en/reset-password?token=${encodeURIComponent(token)}`

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; color:#111;">
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to reset it. If you did not request this, you can ignore this email.</p>
      <p style="margin:20px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Reset Password</a>
      </p>
    </div>
  `

  return send(to, 'Password reset request', html)
}

export async function sendGeneric(to: string, subject: string, html: string): Promise<boolean> {
  return send(to, subject, html)
}
