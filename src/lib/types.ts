import { z } from 'zod'


export const TransactionKind = z.enum(['income','expense','saving','asset'])
export type TransactionKind = z.infer<typeof TransactionKind>


export const Transaction = z.object({
id: z.string(),
kind: TransactionKind,
amount: z.number().nonnegative(),
currency: z.string().default('GBP'),
category: z.string().default('general'),
note: z.string().optional(),
date: z.number(), // epoch ms
})
export type Transaction = z.infer<typeof Transaction>


export const Period = z.enum(['day','week','month','quarter','year','all'])
export type Period = z.infer<typeof Period>

// --- Assets ---
export const AssetHoldingSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  symbol: z.string().optional(),
  category: z.string().default('other'),
  quantity: z.number().nonnegative(),
  avgCost: z.number().nonnegative(), // per unit
  currency: z.string().default('GBP'),
  currentPrice: z.number().nonnegative().optional(), // per unit
  updatedAt: z.number(), // epoch ms
})
export type AssetHolding = z.infer<typeof AssetHoldingSchema>

export const AssetPriceSchema = z.object({
  id: z.string(),
  holdingId: z.string(),
  price: z.number().nonnegative(),
  date: z.number(), // epoch ms
})
export type AssetPrice = z.infer<typeof AssetPriceSchema>
