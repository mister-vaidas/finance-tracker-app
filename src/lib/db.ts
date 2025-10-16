import Dexie, { Table } from 'dexie'
import { Transaction, AssetHolding, AssetPrice } from './types'

export class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>
  holdings!: Table<AssetHolding, string>
  assetPrices!: Table<AssetPrice, string>

  constructor() {
    super('finance-db')

    // v1: transactions only
    this.version(1).stores({
      transactions: 'id, kind, amount, date, category',
    })

    // v2: add holdings + assetPrices
    this.version(2).stores({
      transactions: 'id, kind, amount, date, category',
      holdings: 'id, name, symbol, category',
      assetPrices: 'id, holdingId, date',
    })
  }
}

export const db = new FinanceDB()
