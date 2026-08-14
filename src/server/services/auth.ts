import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { User } from '@prisma/client'
import { prisma } from '../db'
import { signToken } from '../auth/jwt'
import { BadRequestError, UnauthorizedError } from '../http/errors'
import { sendPasswordReset } from './mail'

const BCRYPT_ROUNDS = 10
const RESET_TOKEN_TTL_MS = 1000 * 60 * 5 // 5 minutes

export interface LoginMeta {
  ipAddress?: string
  userAgent?: string
}

/** Everything about a user except the password hash. */
function sanitize(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = user
  return rest
}

function issueToken(user: User) {
  return signToken({
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  })
}

export async function register(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase()

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) throw new BadRequestError('Email already in use')

  const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: { name: input.name, email, password, role: 'owner' },
  })

  return { user: sanitize(user), token: await issueToken(user) }
}

export async function login(input: { email: string; password: string }, meta?: LoginMeta) {
  const email = input.email.toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  // One message for both "no such user" and "wrong password", so the response
  // cannot be used to discover which addresses are registered.
  if (!user || user.deletedAt) throw new UnauthorizedError('Invalid credentials')

  const ok = await bcrypt.compare(input.password, user.password)
  if (!ok) throw new UnauthorizedError('Invalid credentials')

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.loginActivity.create({
      data: {
        userId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        deviceLabel: describeUserAgent(meta?.userAgent),
      },
    }),
  ])

  return { user: sanitize(user), token: await issueToken(user) }
}

export async function forgotPassword(input: { email: string }) {
  const email = input.email.toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  // Always report success. Saying "no such account" here would turn this into
  // an endpoint for enumerating registered addresses.
  if (!user) return { ok: true }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } })

  // Best-effort: a mail failure must not tell the caller whether the address existed.
  try {
    await sendPasswordReset(user.email, token)
  } catch {
    // Swallowed deliberately — see above.
  }

  // Returned in development so the flow is testable without a mailbox.
  return process.env.NODE_ENV === 'production' ? { ok: true } : { ok: true, token }
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token: input.token } })
  if (!record || record.used || record.expiresAt < new Date()) {
    throw new BadRequestError('Invalid or expired token')
  }

  const password = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS)

  // Both writes or neither: a consumed token with an unchanged password would
  // lock the user out of their own reset link.
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password } }),
    prisma.passwordResetToken.update({ where: { token: input.token }, data: { used: true } }),
  ])

  return { ok: true }
}

/** A human label for the login-activity list, e.g. "Chrome on Android Phone". */
export function describeUserAgent(ua?: string | null): string | null {
  if (!ua) return null
  const str = ua.toLowerCase()

  const device =
    str.includes('iphone') ? 'iPhone'
      : str.includes('ipad') ? 'iPad'
        : str.includes('android') && str.includes('mobile') ? 'Android Phone'
          : str.includes('android') ? 'Android'
            : str.includes('mac os') || str.includes('macintosh') ? 'macOS'
              : str.includes('windows') ? 'Windows'
                : str.includes('linux') ? 'Linux'
                  : null

  const browser =
    str.includes('edg/') ? 'Edge'
      : str.includes('chrome') ? 'Chrome'
        : str.includes('safari') && !str.includes('chrome') ? 'Safari'
          : str.includes('firefox') ? 'Firefox'
            : str.includes('msie') || str.includes('trident') ? 'Internet Explorer'
              : null

  if (browser && device) return `${browser} on ${device}`
  return browser || device
}
