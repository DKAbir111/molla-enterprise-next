import { z } from 'zod'

/**
 * Customers and vendors share a shape — name, phone, email, address — so they
 * share the schema, with only the required fields differing.
 *
 * `email` accepts an empty string as "not provided". The contact forms submit
 * untouched optional inputs as `""`, and rejecting that would make an
 * unrelated field block the save.
 */
const optionalEmail = z
  .union([z.string().email('email must be an email'), z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value))

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  phone: z.string().trim().min(1, 'phone should not be empty'),
  email: optionalEmail,
  address: z.string().trim().min(1, 'address should not be empty'),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  phone: z.string().trim().min(1, 'phone should not be empty'),
  email: optionalEmail,
  address: z.string().trim().optional(),
})

export const updateVendorSchema = createVendorSchema.partial()
