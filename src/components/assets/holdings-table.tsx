'use client'
import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/db'
import { AssetHolding, Transaction } from '@/lib/types'
import { holdingPL, holdingValue, sumPortfolioValue, fmtCurrency } from '@/lib/assets'

export default function HoldingsTable(){
  const [rows, setRows] = useState<AssetHolding[]>([])
  const [editingPrice, setEditingPrice] = useState<Record<string,string>>({})
  const [deleteMenuFor, setDeleteMenuFor] = useState<string | null>(null)
  const [partialQty, setPartialQty] = useState<Record<string,string>>({})

  async function refresh(){ setRows(await db.holdings.orderBy('name').toArray()) }
  useEffect(()=>{ refresh() },[])

  async function savePrice(id:string){
    const val = Number(editingPrice[id])
    if (!val || val < 0) return
    await db.holdings.update(id, { currentPrice: val, updatedAt: Date.now() })
    setEditingPrice(prev => ({ ...prev, [id]: '' }))
    refresh()
  }

  async function removeNoCash(id: string){
    await db.holdings.delete(id)
    setDeleteMenuFor(null)
    refresh()
  }

  async function sellAndRemove(h: AssetHolding, qty: number, pricePerUnit: number, note: string){
    // create income transaction
    const t: Transaction = {
      id: crypto.randomUUID(),
      kind: 'income',
      amount: +(qty * pricePerUnit).toFixed(2),
      currency: h.currency || 'GBP',
      category: `asset:sell:${h.name}`,
      note,
      date: Date.now(),
    }
    await db.transactions.add(t)

    if (qty < h.quantity) {
      // partial sale → update remaining quantity
      const remaining = +(h.quantity - qty).toFixed(8)
      await db.holdings.update(h.id, { quantity: remaining, updatedAt: Date.now() })
    } else {
      // full sale → remove holding
      await db.holdings.delete(h.id)
    }
    setDeleteMenuFor(null)
    refresh()
  }

  async function sellAtCurrent(h: AssetHolding, qty: number){
    if (typeof h.currentPrice !== 'number'){
      alert('No current price set. Please set a Current Price first.')
      return
    }
    await sellAndRemove(h, qty, h.currentPrice, `${h.symbol ?? h.name} — sold ${qty} @ current price`)
  }

  async function sellAtAvg(h: AssetHolding, qty: number){
    await sellAndRemove(h, qty, h.avgCost, `${h.symbol ?? h.name} — sold ${qty} @ avg cost`)
  }

  const total = useMemo(()=> sumPortfolioValue(rows), [rows])

  return (
    <div className="grid gap-3">
      <div className="card flex items-center justify-between">
        <div className="text-sm">Total Portfolio Value</div>
        <div className="text-xl font-semibold">{fmtCurrency(total)}</div>
      </div>

      {rows.length === 0 && (
        <div className="text-soft text-sm text-center">No holdings yet. Add one above.</div>
      )}

      {rows.map(h => {
        const value = holdingValue(h)
        const pl = holdingPL(h)
        const hasPrice = typeof h.currentPrice === 'number'
        const showMenu = deleteMenuFor === h.id
        const qty = Number(partialQty[h.id] || h.quantity) || 0

        return (
          <div key={h.id} className="card grid gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {h.name} {h.symbol ? <span className="text-soft">• {h.symbol}</span> : null}
                </div>
                <div className="text-xs text-soft capitalize">
                  {h.category} • {h.quantity} @ {fmtCurrency(h.avgCost, h.currency)} • {h.currency}
                </div>
              </div>

              <button className="badge" onClick={()=> setDeleteMenuFor(p => p === h.id ? null : h.id)}>
                Delete / Sell
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-soft">Current Price</div>
                <div className="text-sm">
                  {hasPrice ? fmtCurrency(h.currentPrice!, h.currency) : <span className="text-soft">—</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-soft">Value</div>
                <div className="text-sm font-semibold">{fmtCurrency(value, h.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-soft">P/L</div>
                <div className={`text-sm font-semibold ${pl>=0 ? 'text-up' : 'text-down'}`}>{fmtCurrency(pl, h.currency)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-soft">Set / Update Current Price (per unit)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="e.g., 42000.00"
                  value={editingPrice[h.id] ?? ''}
                  onChange={e=> setEditingPrice(p => ({ ...p, [h.id]: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <button className="btn w-full" onClick={()=> savePrice(h.id)}>Save Price</button>
              </div>
            </div>

            {showMenu && (
              <div className="bg-white/5 rounded-xl p-3 grid gap-2">
                <div className="text-xs text-soft mb-1">Sell / Delete options</div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    max={h.quantity}
                    step="any"
                    className="input col-span-2"
                    placeholder={`Qty (max ${h.quantity})`}
                    value={partialQty[h.id] ?? h.quantity}
                    onChange={e=> setPartialQty(p => ({ ...p, [h.id]: e.target.value }))}
                  />
                  <div className="flex items-end">
                    <span className="text-xs text-soft">units</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <button className="btn" onClick={()=> removeNoCash(h.id)}>Remove (no cash change)</button>
                  <button className="btn" onClick={()=> sellAtCurrent(h, qty)}>Sell {qty} @ current price</button>
                  <button className="btn" onClick={()=> sellAtAvg(h, qty)}>Sell {qty} @ avg cost</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
