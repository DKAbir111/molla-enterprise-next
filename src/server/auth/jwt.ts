import { SignJWT, jwtVerify } from 'jose'

export interface JwtPayload {
  /** User id. Named `sub` to stay compatible with tokens already in the wild. */
  sub: string
  email: string
  organizationId?: string | null
  role?: string | null
}

const TOKEN_TTL = '7d'

/**
 * HS256 over the raw secret bytes — the same scheme `@nestjs/jwt` used, so
 * tokens issued by the old backend still verify here and nobody is logged out
 * by the migration itself.
 */
function secretKey() {
  const secret = process.env.JWT_SECRET || 'change-me'
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    organizationId: payload.organizationId ?? undefined,
    role: payload.role ?? undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey())
}

/**
 * Returns the payload, or null for anything unusable — bad signature, expired,
 * malformed. Callers decide what a null means; most turn it into a 401.
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    if (!payload.sub) return null
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      organizationId: (payload.organizationId as string | undefined) ?? null,
      role: (payload.role as string | undefined) ?? null,
    }
  } catch {
    return null
  }
}

/** Pulls a bearer token out of the Authorization header. */
export function bearerFrom(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null
  return value.trim() || null
}
