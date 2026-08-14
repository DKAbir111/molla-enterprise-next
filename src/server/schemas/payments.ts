import { z } from 'zod'

/**
 * The amount is only coerced here, not bounded.
 *
 * "greater than zero", "customerId is required" and "vendorId or buyId is
 * required" are all enforced in the service, which knows which combination of
 * ids a given call needs. Duplicating those rules in the schema would mean two
 * places to keep in step and two different error messages for one mistake.
 */
export const createPaymentSchema = z.object({
  amount: z.coerce.number(),
  date: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  sellId: z.string().optional(),
  buyId: z.string().optional(),
})

export const paymentQuerySchema = z.object({
  sellId: z.string().optional(),
  buyId: z.string().optional(),
  customerId: z.string().optional(),
})
