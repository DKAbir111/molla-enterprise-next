export type ProductType =
  | 'vitiBalu'
  | 'gojariyaBalu'
  | 'pakshiBalu'
  | 'seletBalu'
  | 'pathor'
  | 'khoya'
  | 'rod'
  | 'cement'
  | string

export type ProductGrade = 'type1' | 'medium' | string

export interface Product {
  id: string
  name: string
  type: ProductType
  grade?: ProductGrade
  price: number
  buyPrice?: number
  otherCostPerUnit?: number
  targetPrice?: number
  unit: string
  stock: number
  description?: string
  imageUrl?: string
  active?: boolean
  awaitingPurchase?: boolean
}

export interface DryingGain {
  id: string
  productId: string
  quantity: number
  unitCost: number
  note?: string
  createdAt: Date
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address: string
  avatarUrl?: string
  totalOrders: number
  totalSpent: number
  createdAt: Date
}

/** Mirrors the Prisma `Vendor` model. The vendors screen typed this as `any`. */
export interface Vendor {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  avatarUrl?: string
  createdAt?: string | Date
}

export type OrderStatus = 'pending' | 'processing' | 'delivered' | 'cancelled'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface Order {
  date: string | number | Date
  id: string
  customerId: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  deliveryAddress: string
  createdAt: Date
  deliveredAt?: Date
  discount?: number
  paidAmount?: number
  transportPerTrip?: number
  transportTrips?: number
  transportTotal?: number
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  description: string
  type: TransactionType
  amount: number
  category: string
  date: Date
}

// Purchases (Buys)
export interface BuyItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface Buy {
  id: string
  vendorName?: string
  vendorPhone?: string
  items: BuyItem[]
  total: number
  discount: number
  paidAmount: number
  transportPerTrip: number
  transportTrips: number
  transportTotal: number
  createdAt: Date
}

export interface Organization {
  id: string
  name: string
  email: string
  phone: string
  address: string
  logoUrl?: string | null
}
