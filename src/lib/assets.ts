import { AssetHolding } from './types'

export function holdingValue(h: AssetHolding) {
  const price = h.currentPrice ?? h.avgCost
  return price * h.quantity
}

export function holdingPL(h: AssetHolding) {
  const price = h.currentPrice ?? h.avgCost
  const cost = h.avgCost * h.quantity
  return price * h.quantity - cost
}

export function sumPortfolioValue(rows: AssetHolding[]) {
  return rows.reduce((a, h) => a + holdingValue(h), 0)
}

export function fmtCurrency(n: number, currency = 'GBP') {
  return n.toLocaleString(undefined, { style: 'currency', currency })
}
