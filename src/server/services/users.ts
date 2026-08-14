import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { BadRequestError, ForbiddenError, NotFoundError } from '../http/errors'

/**
 * Team membership and account security.
 *
 * The rules that matter are all about not letting someone lock the
 * organization out of itself: an owner cannot be demoted or removed while they
 * are the last one, and only an owner can create or modify another owner.
 */

const MANAGER_ROLES = ['owner', 'admin']
const BCRYPT_ROUNDS = 10

/** The fields safe to return for a team member — never the password hash. */
const MEMBER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  lastLoginAt: true,
} as const

export interface CreateTeamMemberInput {
  name: string
  email: string
  temporaryPassword: string
  role?: string
}

export interface UpdateTeamMemberInput {
  name?: string
  role?: string
}

async function requireActiveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) throw new ForbiddenError('User not available')
  return user
}

function requireOrganization(user: { organizationId: string | null }) {
  if (!user.organizationId) throw new ForbiddenError('Organization is required')
  return user.organizationId
}

function requireManager(user: { role: string }) {
  if (!MANAGER_ROLES.includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions')
  }
}

function requireRoleChangeAllowed(
  actor: { role: string },
  nextRole: string,
  currentRole?: string,
) {
  if (nextRole === 'owner' && actor.role !== 'owner') {
    throw new ForbiddenError('Only owners can assign owner role')
  }
  if (currentRole === 'owner' && actor.role !== 'owner') {
    throw new ForbiddenError('Only owners can modify another owner')
  }
}

/** Guards the last owner: an organization with none can never be administered. */
async function requireAnotherOwner(organizationId: string, excludeId: string) {
  const owners = await prisma.user.count({
    where: { organizationId, role: 'owner', deletedAt: null, NOT: { id: excludeId } },
  })
  if (owners === 0) throw new BadRequestError('At least one owner is required')
}

export async function listTeamMembers(userId: string) {
  const actor = await requireActiveUser(userId)
  const organizationId = requireOrganization(actor)

  const members = await prisma.user.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: MEMBER_FIELDS,
  })

  return { currentUserId: actor.id, currentUserRole: actor.role, members }
}

export async function createTeamMember(userId: string, input: CreateTeamMemberInput) {
  const actor = await requireActiveUser(userId)
  const organizationId = requireOrganization(actor)
  requireManager(actor)

  const email = input.email.toLowerCase()
  const role = input.role || 'member'
  requireRoleChangeAllowed(actor, role)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && !existing.deletedAt) throw new BadRequestError('Email already in use')

  const password = await bcrypt.hash(input.temporaryPassword, BCRYPT_ROUNDS)

  // A previously removed account is revived rather than duplicated — the email
  // column is unique, so a second row could not be created anyway.
  if (existing) {
    if (existing.organizationId && existing.organizationId !== organizationId) {
      throw new BadRequestError('Email already in use')
    }
    return prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, password, role, deletedAt: null, organizationId },
      select: MEMBER_FIELDS,
    })
  }

  return prisma.user.create({
    data: { name: input.name, email, password, role, organizationId },
    select: MEMBER_FIELDS,
  })
}

export async function updateTeamMember(
  userId: string,
  memberId: string,
  input: UpdateTeamMemberInput,
) {
  const actor = await requireActiveUser(userId)
  const organizationId = requireOrganization(actor)
  requireManager(actor)

  const target = await prisma.user.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
  })
  if (!target) throw new NotFoundError('User not found')

  if (target.id === actor.id && input.role && input.role !== target.role) {
    throw new BadRequestError('Cannot change your own role from this screen')
  }
  if (target.role === 'owner' && actor.role !== 'owner') {
    throw new ForbiddenError('Only owners can modify another owner')
  }

  if (input.role) {
    requireRoleChangeAllowed(actor, input.role, target.role)
    if (target.role === 'owner' && input.role !== 'owner') {
      await requireAnotherOwner(organizationId, target.id)
    }
  }

  return prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.role ? { role: input.role } : {}),
    },
    select: MEMBER_FIELDS,
  })
}

/**
 * Soft-deletes a member and detaches them from the organization.
 *
 * The row survives so their history — login activity, authored records — keeps
 * resolving to a name rather than a dangling id.
 */
export async function removeTeamMember(userId: string, memberId: string) {
  const actor = await requireActiveUser(userId)
  const organizationId = requireOrganization(actor)
  requireManager(actor)

  if (actor.id === memberId) {
    throw new BadRequestError('Use account settings to deactivate yourself')
  }

  const target = await prisma.user.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
  })
  if (!target) throw new NotFoundError('User not found')

  if (target.role === 'owner' && actor.role !== 'owner') {
    throw new ForbiddenError('Only owners can remove another owner')
  }
  if (target.role === 'owner') {
    await requireAnotherOwner(organizationId, target.id)
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { deletedAt: new Date(), organizationId: null },
  })

  return { ok: true }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) throw new NotFoundError('User not found')

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) throw new BadRequestError('Current password is incorrect')

  const password = await bcrypt.hash(nextPassword, BCRYPT_ROUNDS)
  await prisma.user.update({ where: { id: userId }, data: { password } })

  return { ok: true }
}

export function getLoginActivity(userId: string, limit = 20) {
  const take = Math.max(1, Math.min(50, limit))
  return prisma.loginActivity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  })
}
