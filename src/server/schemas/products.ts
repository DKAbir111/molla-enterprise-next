import { z } from 'zod'

const nonNegative = z.coerce.number().min(0)

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'name should not be empty'),
  type: z.string().trim().min(1, 'type should not be empty'),
  grade: z.string().optional(),
  price: nonNegative,
  buyPrice: nonNegative.optional(),
  otherCostPerUnit: nonNegative.optional(),
  targetPrice: nonNegative.optional(),
  unit: z.string().trim().min(1, 'unit should not be empty'),
  stock: nonNegative,
  description: z.string().optional(),
  active: z.boolean().optional(),
})

export const updateProductSchema = createProductSchema.partial()
