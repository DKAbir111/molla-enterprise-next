import { z } from 'zod'

export const SELL_STATUSES = ['pending', 'processing', 'delivered', 'cancelled'] as const

const sellItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().min(1, 'quantity must not be less than 1'),
  price: z.coerce.number().min(0).optional(),
})

export const createSellSchema = z.object({
  customerId: z.string().min(1),
  deliveryAddress: z.string().optional(),
  items: z.array(sellItemSchema).min(1, 'items should not be empty'),
  discount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  transportPerTrip: z.coerce.number().optional(),
  transportTrips: z.coerce.number().optional(),
})

export const updateSellSchema = z.object({
  status: z.enum(SELL_STATUSES).optional(),
  deliveryAddress: z.string().optional(),
  discount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  transportPerTrip: z.coerce.number().optional(),
  transportTrips: z.coerce.number().optional(),
})

export const updateSellItemsSchema = z.object({
  items: z.array(sellItemSchema).min(1, 'items should not be empty'),
})

export const searchQuerySchema = z.object({
  q: z.string().optional(),
})
