import { z } from 'zod'

/**
 * Create and update arrive as multipart, because both may carry a logo file.
 * Every field therefore reaches us as a string, and numbers are coerced.
 */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  email: z.string().email('email must be an email'),
  phone: z.string().trim().min(1, 'phone should not be empty'),
  address: z.string().trim().min(1, 'address should not be empty'),
  logoBase64: z.string().optional(),
})

/** Update is the same shape with everything optional. */
export const updateOrganizationSchema = createOrganizationSchema.partial()

/**
 * Settings. Toggles and thresholds are all optional — the settings screen saves
 * one section at a time, and an absent key must mean "leave it alone" rather
 * than "reset it".
 */
export const settingsSchema = z.object({
  notifyLowStock: z.boolean().optional(),
  notifyOrderUpdates: z.boolean().optional(),
  notifyReceivables: z.boolean().optional(),
  notifyPayables: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  dryingGainEnabled: z.boolean().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  pendingOrderAgingHours: z.coerce.number().int().min(0).optional(),
  receivableReminderDays: z.coerce.number().int().min(0).optional(),
  payableReminderDays: z.coerce.number().int().min(0).optional(),
})
