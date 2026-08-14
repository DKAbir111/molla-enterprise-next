import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { bearerFrom, verifyToken } from '../auth/jwt'
import { ForbiddenError, HttpError, UnauthorizedError, errorBody } from './errors'

/** The caller, resolved from the bearer token and re-checked against the database. */
export interface AuthUser {
  userId: string
  email: string
  organizationId: string | null
  role: string | null
}

/** Dynamic segments for the route, already awaited. */
type Params = Record<string, string | string[]>

export interface AuthedContext<P extends Params = Params> {
  params: P
  user: AuthUser
}

export interface PublicContext<P extends Params = Params> {
  params: P
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response> | Response

/**
 * What Next hands a route handler. `params` is a promise in the App Router.
 *
 * Declared as required because Next's generated route types check the second
 * parameter against exactly this shape and reject an optional one. Routes with
 * no dynamic segment are still called with an object, but the reads below stay
 * defensive rather than trusting that across versions.
 */
type RawContext<P> = { params: Promise<P> }

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

/**
 * Turns a thrown error into the JSON body the frontend expects.
 *
 * Anything that is not an explicit HttpError is a bug, not a client mistake, so
 * it is logged in full and reported as a bare 500. Leaking a stack trace or a
 * Prisma message to the browser tells an attacker about the schema.
 */
function toResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      errorBody(error.status, error.message, error.details),
      { status: error.status },
    )
  }

  if (error instanceof ZodError) {
    // Match Nest's ValidationPipe, which returned an array of messages.
    const messages = error.errors.map((e) =>
      e.path.length ? `${e.path.join('.')}: ${e.message}` : e.message,
    )
    return NextResponse.json(errorBody(400, messages), { status: 400 })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint. The only Prisma failure that is genuinely the
    // caller's fault and worth naming; everything else is ours.
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.join(', ')
      return NextResponse.json(
        errorBody(409, target ? `${target} already exists` : 'Already exists'),
        { status: 409 },
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(errorBody(404, 'Not Found'), { status: 404 })
    }
  }

  console.error('[api] unhandled error:', error)
  return NextResponse.json(errorBody(500, 'Internal server error'), { status: 500 })
}

/**
 * Loads the caller from the token.
 *
 * The token carries `organizationId` and `role`, but both are re-read from the
 * database rather than trusted: a token lives 7 days, and in that window a user
 * can be removed from an org, demoted, or soft-deleted. Trusting the claim
 * would leave a deleted user with a working key until it expired.
 */
async function resolveUser(req: NextRequest): Promise<{ user: AuthUser; orgDisabled: boolean }> {
  const token = bearerFrom(req)
  if (!token) throw new UnauthorizedError()

  const payload = await verifyToken(token)
  if (!payload) throw new UnauthorizedError()

  const record = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      deletedAt: true,
      organization: { select: { deletedAt: true } },
    },
  })

  if (!record || record.deletedAt) throw new UnauthorizedError('User not found')

  return {
    user: {
      userId: record.id,
      email: record.email,
      organizationId: record.organizationId,
      role: record.role,
    },
    orgDisabled: Boolean(record.organization?.deletedAt),
  }
}

export interface AuthOptions {
  /**
   * Let this route run as a write even when the organization is disabled.
   *
   * Exactly one route needs it: re-enabling the organization. That is a POST,
   * so the blanket write ban would refuse the very request that lifts the ban —
   * a disabled org could never be switched back on. (The NestJS build had this
   * bug: its global guard had no exemption mechanism at all.)
   */
  allowDisabledOrg?: boolean
}

/**
 * Wraps a route that requires a signed-in user.
 *
 * Also enforces the rule the old global `OrgDisabledGuard` carried: a disabled
 * organization is readable but frozen. Reads pass, writes are refused, so the
 * owner can still see their data and understand why it is locked.
 */
export function withAuth<P extends Params = Params>(
  handler: Handler<AuthedContext<P>>,
  options: AuthOptions = {},
) {
  return async (req: NextRequest, ctx: RawContext<P>): Promise<Response> => {
    try {
      const { user, orgDisabled } = await resolveUser(req)

      if (orgDisabled && !options.allowDisabledOrg && WRITE_METHODS.has(req.method)) {
        throw new ForbiddenError(
          'Organization is disabled. Only read operations are allowed. Contact your administrator to re-enable the organization.',
        )
      }

      const params = ((await ctx?.params) ?? {}) as P
      return await handler(req, { params, user })
    } catch (error) {
      return toResponse(error)
    }
  }
}

/**
 * Wraps a route that anyone may call — login, register, password reset.
 * No user is resolved; error handling is identical.
 */
export function withPublic<P extends Params = Params>(handler: Handler<PublicContext<P>>) {
  return async (req: NextRequest, ctx: RawContext<P>): Promise<Response> => {
    try {
      const params = ((await ctx?.params) ?? {}) as P
      return await handler(req, { params })
    } catch (error) {
      return toResponse(error)
    }
  }
}

/** 204, for deletes and other handlers with nothing to say. */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}
