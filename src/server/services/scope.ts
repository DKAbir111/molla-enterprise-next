import { ForbiddenError } from '../http/errors'

/**
 * Every business record belongs to an organization, and every query is filtered
 * by it. A signed-in user without one has registered but not yet completed
 * onboarding, so there is nothing for them to read or write yet.
 *
 * Narrowing the type here is the point: callers get a plain `string` and cannot
 * forget the null case on the way to a `where` clause.
 */
export function requireOrg(organizationId?: string | null): string {
  if (!organizationId) throw new ForbiddenError('Organization required')
  return organizationId
}

/**
 * Image URLs are returned exactly as stored, in both of the forms the database
 * holds.
 *
 * New uploads are absolute Cloudinary URLs. Older rows hold a relative
 * `/uploads/...` path from the days of the disk-backed uploader; those files
 * were moved into `public/uploads`, so the path now resolves against this app's
 * own origin and needs no rewriting.
 *
 * The NestJS build prefixed the relative form with `PUBLIC_BASE_URL` to point
 * at the API host. With one origin there is no second host to point at, and a
 * relative URL keeps working across localhost, LAN and production alike.
 */
export function toPublicUrl(value?: string | null): string | null {
  return value ?? null
}

export function withPublicAvatar<T extends { avatarUrl?: string | null }>(record: T): T {
  return { ...record, avatarUrl: toPublicUrl(record.avatarUrl) }
}
