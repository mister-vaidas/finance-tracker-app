'use client'
import { useState } from 'react'
import { db } from '@/lib/db'
import { AssetHolding, AssetHoldingSchema } from '@/lib/types'
import { Transaction } from '@/lib/types'


const CATEGORIES = ['crypto','stocks','property','cash','other']

export default function HoldingForm({ onAdded }:{ onAdded?: ()=>void }) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [quantity, setQuantity] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [currency, setCurrency] = useState('GBP')

  async function add() {
  const q = Number(quantity)
  const c = Number(avgCost)
  if (!name || !q || !c) return
  const holding: AssetHolding = {
    id: crypto.randomUUID(),
    name,
    symbol: symbol || undefined,
    category,
    quantity: q,
    avgCost: c,
    currency,
    updatedAt: Date.now(),
    currentPrice: undefined,
  }
  AssetHoldingSchema.parse(holding)
  await db.holdings.add(holding)

  // ALSO: create a matching 'asset' transaction so it shows in the list
  // and deducts from Balance (via aggregate.ts balance change).
  const t: Transaction = {
    id: crypto.randomUUID(),
    kind: 'asset',
    amount: q * c,            // total cost
    currency,
    category: `asset:${holding.name}`,
    note: holding.symbol ? `${holding.symbol} - new holding` : 'new holding',
    date: Date.now(),
  }
  await db.transactions.add(t)

  setName(''); setSymbol(''); setQuantity(''); setAvgCost('')
  onAdded?.()
}


  return (
    <div className="card grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-soft">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="e.g., Bitcoin" />
        </div>
        <div>
          <label className="text-xs text-soft">Symbol</label>
          <input value={symbol} onChange={e=>setSymbol(e.target.value)} className="input" placeholder="e.g., BTC" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-soft">Category</label>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="input">
            {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-soft">Quantity</label>
          <input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal" className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs text-soft">Avg Cost (per unit)</label>
          <input value={avgCost} onChange={e=>setAvgCost(e.target.value)} inputMode="decimal" className="input" placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-soft">Currency</label>
          <input value={currency} onChange={e=>setCurrency(e.target.value)} className="input" placeholder="GBP" />
        </div>
      </div>

      <button onClick={add} className="btn">Add Holding</button>
    </div>
  )
}
