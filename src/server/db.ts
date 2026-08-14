import { PrismaClient } from '@prisma/client'

/**
 * A single PrismaClient for the whole process.
 *
 * In dev, Next.js hot-reloads modules on every edit. A plain `new PrismaClient()`
 * at module scope would therefore build a fresh client — and a fresh connection
 * pool — on each reload, until Postgres starts refusing connections. Stashing it
 * on `globalThis` survives the reload because the global object does not.
 *
 * In production the module is evaluated once, so the branch is irrelevant and we
 * skip the global entirely.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
