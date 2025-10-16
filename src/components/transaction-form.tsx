'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { Transaction, TransactionKind } from '@/lib/types'

const categories: Record<Transaction['kind'], string[]> = {
  income: ['salary', 'bonus', 'freelance', 'refund', 'other'],
  expense: ['food', 'transport', 'rent', 'utilities', 'shopping', 'health', 'fun', 'kids', 'other'],
  saving: ['emergency', 'investments', 'pension', 'other'],
  asset: ['crypto', 'stocks', 'property', 'cash', 'other'],
}

export default function TransactionForm({ kind }: { kind: TransactionKind }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[kind][0])
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))

  useEffect(() => {
    setCategory(categories[kind][0])
  }, [kind])

  async function add() {
    const n = Number(amount)
    if (!n || n <= 0) return
    const t: Transaction = {
      id: crypto.randomUUID(),
      kind,
      amount: n,
      category,
      note: note || undefined,
      currency: 'GBP',
      date: new Date(date).getTime(),
    }
    await db.transactions.add(t)
    setAmount('')
    setNote('')
  }

  return (
    <div className="card grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-soft">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="input"
          />
        </div>
        <div>
          <label className="text-xs text-soft">Date</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-soft">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            {categories[kind].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-soft">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className="input"
          />
        </div>
      </div>

      <button onClick={add} className="btn">
        Add {kind}
      </button>
    </div>
  )
}

// --- Withdraw From Savings (with live balance) ---
export function WithdrawFromSavings() {
  const [amount, setAmount] = useState('')
  const [savingTotal, setSavingTotal] = useState(0)

  // Load & live-update current savings total (all-time)
  useEffect(() => {
    async function load() {
      // sum all 'saving' transactions (withdrawals are negative)
      const arr = await db.transactions.where('kind').equals('saving').toArray()
      const total = arr.reduce((a, t) => a + (t.amount || 0), 0)
      setSavingTotal(total)
    }
    load()

    // live refresh on tx changes
    const c = db.transactions.hook('creating', () => setTimeout(load, 0))
    const u = db.transactions.hook('updating', () => setTimeout(load, 0))
    const d = db.transactions.hook('deleting', () => setTimeout(load, 0))
    return () => {
      db.transactions.hook('creating').unsubscribe(c)
      db.transactions.hook('updating').unsubscribe(u)
      db.transactions.hook('deleting').unsubscribe(d)
    }
  }, [])

  async function withdraw() {
    const n = Number(amount)
    if (!n || n <= 0) return

    // Optional guard: prevent overdrawing savings
    if (n > savingTotal) {
      alert(`You only have £${savingTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} in savings.`)
      return
    }

    // 1) negative saving (reduces savings total)
    const savingTx: Transaction = {
      id: crypto.randomUUID(),
      kind: 'saving',
      amount: -n,
      currency: 'GBP',
      category: 'withdrawal',
      note: 'Withdraw from savings',
      date: Date.now(),
    }

    // 2) income (adds to cash balance)
    const incomeTx: Transaction = {
      id: crypto.randomUUID(),
      kind: 'income',
      amount: n,
      currency: 'GBP',
      category: 'savings-withdrawal',
      note: 'Transferred from savings',
      date: Date.now(),
    }

    await db.transactions.bulkAdd([savingTx, incomeTx])
    setAmount('')
  }

  return (
    <div className="card grid gap-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-soft">Withdraw from Savings</div>
        <div className="text-sm">
          Current savings:&nbsp;
          <span className="font-semibold">
            {savingTotal.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          inputMode="decimal"
        />
        <button className="btn" onClick={withdraw}>Withdraw</button>
      </div>
    </div>
  )
}


