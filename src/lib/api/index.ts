// Every client-side API module, re-exported so callers import from '@/lib/api'
// rather than reaching into a specific file. Three modules were missing here
// (payments, vendors, alerts), which is why parts of the app deep-imported and
// parts did not.
export * from './http'
export * from './normalize'

export * from './accounts-api'
export * from './alerts-api'
export * from './auth-api'
export * from './buy-api'
export * from './customer-api'
export * from './dashboard-api'
export * from './drying-gain-api'
export * from './organization-api'
export * from './payment-api'
export * from './product-api'
export * from './sell-api'
export * from './transaction-api'
export * from './user-api'
export * from './vendor-api'
