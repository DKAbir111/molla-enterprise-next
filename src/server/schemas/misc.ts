import { z } from 'zod'

/** Team members. */
export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  email: z.string().email('email must be an email'),
  temporaryPassword: z
    .string()
    .min(6, 'temporaryPassword must be longer than or equal to 6 characters'),
  role: z.string().optional(),
})

export const updateTeamMemberSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword should not be empty'),
  newPassword: z.string().min(6, 'newPassword must be longer than or equal to 6 characters'),
})

export const loginActivityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().catch(20),
})

/** Manual income/expense entries. */
export const createTransactionSchema = z.object({
  description: z.string().trim().min(1, 'description should not be empty'),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number(),
  category: z.string().optional(),
  date: z.string().optional(),
})

/** Drying gains. */
export const createDryingGainSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number(),
  unitCost: z.coerce.number().optional(),
  note: z.string().optional(),
})

export const dryingGainQuerySchema = z.object({
  productId: z.string().optional(),
})

/**
 * Dashboard range. Every value is clamped rather than rejected — a nonsense
 * `months=999` should show two years of data, not break the home screen.
 */
export const dashboardQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).catch(6),
  productDays: z.coerce.number().int().min(1).max(365).catch(90),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
