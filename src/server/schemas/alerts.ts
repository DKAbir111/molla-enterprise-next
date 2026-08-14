import { z } from 'zod'
import { ALERT_TYPES } from '../services/alerts'

export const alertQuerySchema = z.object({
  // Clamped rather than rejected: a silly limit should trim the list, not fail
  // the notification badge.
  limit: z.coerce.number().int().min(1).max(50).catch(5),
})

export const snoozeSchema = z.object({
  type: z.enum(ALERT_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'type and refId required' }),
  }),
  refId: z.string().min(1, 'type and refId required'),
  days: z.coerce.number().int().positive().optional(),
  forever: z.boolean().optional(),
})

export const unsnoozeSchema = snoozeSchema.pick({ type: true, refId: true })
