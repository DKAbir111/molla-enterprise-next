import { z } from 'zod'

const buyItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().min(1, 'quantity must not be less than 1'),
  price: z.coerce.number().min(0),
})

export const createBuySchema = z.object({
  vendorName: z.string().optional(),
  vendorPhone: z.string().optional(),
  items: z.array(buyItemSchema).min(1, 'items should not be empty'),
  discount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  transportPerTrip: z.coerce.number().optional(),
  transportTrips: z.coerce.number().optional(),
})

export const updateBuySchema = z.object({
  vendorName: z.string().optional(),
  vendorPhone: z.string().optional(),
  discount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  transportPerTrip: z.coerce.number().optional(),
  transportTrips: z.coerce.number().optional(),
})

export const updateBuyItemsSchema = z.object({
  items: z.array(buyItemSchema).min(1, 'items should not be empty'),
})
