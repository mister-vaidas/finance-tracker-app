'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/db'
import { Period, Transaction, TransactionKind } from '@/lib/types'
import { summarize } from '@/lib/aggregate'
import { Stat, Section, Tabs } from '@/components/ui'
import { PeriodSelector } from '@/components/period-selector'
import TransactionForm from '@/components/transaction-form'
import { CategoryPie, TrendLines } from '@/components/charts'
import { exportCSV, exportJSON, importFile } from '@/lib/io'
import { periodStart } from '@/lib/aggregate'
import HoldingForm from '@/components/assets/holding-form'
import HoldingsTable from '@/components/assets/holdings-table'
import { sumPortfolioValue } from '@/lib/assets'
import type { AssetHolding } from '@/lib/types'
import { WithdrawFromSavings } from '@/components/transaction-form'
import InstallPWA from '@/components/InstallPWA'
import type { Transaction as DexieTx } from 'dexie'

// Local type for tabs to avoid `any`
type TabKey = 'add' | 'list' | 'reports' | 'assets'

function filterByPeriod(rows: Transaction[], p: Period) {
  const from = periodStart(p)
  if (p === 'all') return rows
  return rows.filter(r => r.date >= from.getTime())
}

function sumByKind(rows: Transaction[], kind: Transaction['kind']) {
  return rows.filter(r => r.kind === kind).reduce((a, b) => a + b.amount, 0)
}

export default function Page() {
  const [tab, setTab] = useState<TabKey>('add')
  const [period, setPeriod] = useState<Period>('month')
  const [rows, setRows] = useState<Transaction[]>([])

  useEffect(() => {
    const refresh = async () =>
      setRows(await db.transactions.orderBy('date').reverse().toArray())

    refresh()

    const onCreating = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(refresh, 0)
    }
    const onUpdating = (mods: Partial<Transaction>, pk: string, obj: Transaction, tx: unknown) => {
      void mods; void pk; void obj; void tx
      setTimeout(refresh, 0)
    }
    const onDeleting = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(refresh, 0)
    }

    db.transactions.hook('creating', onCreating)
    db.transactions.hook('updating', onUpdating)
    db.transactions.hook('deleting', onDeleting)

    return () => {
      db.transactions.hook('creating').unsubscribe(onCreating)
      db.transactions.hook('updating').unsubscribe(onUpdating)
      db.transactions.hook('deleting').unsubscribe(onDeleting)
    }
  }, [])



  const sums = useMemo(() => summarize(rows, period), [rows, period])

  // Type-safe onChange handler for Tabs
  const handleTabChange = (v: string) => {
    if (v === 'add' || v === 'list' || v === 'reports' || v === 'assets') {
      setTab(v)
    }
  }

  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-soft text-sm">Private, offline-first. No logins.</p>
        </div>
        <InstallPWA />
      </header>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        items={[
          { value: 'add', label: 'Add' },
          { value: 'list', label: 'Transactions' },
          { value: 'reports', label: 'Reports' },
          { value: 'assets', label: 'Assets' },
        ]}
      />

      {tab === 'add' && <AddView onPeriod={setPeriod} period={period} />}
      {tab==='list' && <ListView />}
      {tab === 'reports' && <ReportsView sums={sums} period={period} onPeriod={setPeriod} />}
      {tab === 'assets' && <AssetsView />}
    </main>
  )
}

function AddView({ period, onPeriod }: { period: Period, onPeriod: (p: Period) => void }) {
  const [kind, setKind] = useState<TransactionKind>('expense')
  return (
    <div>
      <Section title="Quick Add" right={<KindSwitch value={kind} onChange={setKind} />}>
        <TransactionForm kind={kind} />
      </Section>

      <Section title="Overview" right={<PeriodSelector value={period} onChange={onPeriod} />}>
        <Overview />
      </Section>

      {kind === 'saving' && <WithdrawFromSavings />}
    </div>
  )
}

function KindSwitch({ value, onChange }: { value: TransactionKind, onChange: (k: TransactionKind) => void }) {
  const options: TransactionKind[] = ['expense', 'income', 'saving']
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} className="badge" data-active={o === value}>{o}</button>
      ))}
    </div>
  )
}

function Overview() {
  const [rows, setRows] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<AssetHolding[]>([])
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    // initial load
    db.transactions.toArray().then(setRows)
    db.holdings.toArray().then(setHoldings)

    // transactions hooks
    const tCreating = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setRows(await db.transactions.toArray()), 0)
    }
    const tUpdating = (mods: Partial<Transaction>, pk: string, obj: Transaction, tx: unknown) => {
      void mods; void pk; void obj; void tx
      setTimeout(async () => setRows(await db.transactions.toArray()), 0)
    }
    const tDeleting = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setRows(await db.transactions.toArray()), 0)
    }

    db.transactions.hook('creating', tCreating)
    db.transactions.hook('updating', tUpdating)
    db.transactions.hook('deleting', tDeleting)

    // holdings hooks
    const hCreating = (pk: string, obj: AssetHolding, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }
    const hUpdating = (mods: Partial<AssetHolding>, pk: string, obj: AssetHolding, tx: unknown) => {
      void mods; void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }
    const hDeleting = (pk: string, obj: AssetHolding, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }

    db.holdings.hook('creating', hCreating)
    db.holdings.hook('updating', hUpdating)
    db.holdings.hook('deleting', hDeleting)

    return () => {
      db.transactions.hook('creating').unsubscribe(tCreating)
      db.transactions.hook('updating').unsubscribe(tUpdating)
      db.transactions.hook('deleting').unsubscribe(tDeleting)
      db.holdings.hook('creating').unsubscribe(hCreating)
      db.holdings.hook('updating').unsubscribe(hUpdating)
      db.holdings.hook('deleting').unsubscribe(hDeleting)
    }
  }, [])




  const s = useMemo(() => summarize(rows, period), [rows, period])
  const portfolioValue = useMemo(() => sumPortfolioValue(holdings), [holdings])

  // Net Worth = Cash Balance + Portfolio Value + Savings total
  const netWorth = useMemo(() => s.balance + portfolioValue + s.saving, [s.balance, portfolioValue, s.saving])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-soft">This {period}</div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Income" value={s.income} tone="up" />
        <Stat label="Expenses" value={s.expense} tone="down" />
        <Stat label="Savings (total)" value={s.saving} tone="up" />
        <Stat label="Portfolio Value" value={portfolioValue} />
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <Stat label="Balance (cash)" value={s.balance} tone={s.balance >= 0 ? 'up' : 'down'} />
          <Stat label="Net Worth" value={netWorth} tone={netWorth >= 0 ? 'up' : 'down'} />
        </div>
      </div>
    </div>
  )
}

function ListView(){
  const PAGE_SIZE = 20
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)

  const load = useCallback(async (p = page) => {
    const cnt = await db.transactions.count()
    const data = await db.transactions
      .orderBy('date')        // newest first
      .reverse()
      .offset(p * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()

    setTotal(cnt)
    setRows(data)
  }, [page])

  // initial load
  useEffect(() => {
    setPage(0)
    void load(0)
  }, [load])

  // live refresh when DB changes (typed hooks, no any)
  useEffect(() => {
    const refreshSoon = () => setTimeout(() => void load(page), 0)

    const onCreating = (_pk: string, _obj: Transaction, _tx: DexieTx) => {
      // silence no-unused-vars without disabling rules:
      void _pk; void _obj; void _tx
      refreshSoon()
    }
    const onUpdating = (_mods: Partial<Transaction>, _pk: string, _obj: Transaction, _tx: DexieTx) => {
      void _mods; void _pk; void _obj; void _tx
      refreshSoon()
    }
    const onDeleting = (_pk: string, _obj: Transaction, _tx: DexieTx) => {
      void _pk; void _obj; void _tx
      refreshSoon()
    }

    db.transactions.hook('creating', onCreating)
    db.transactions.hook('updating', onUpdating)
    db.transactions.hook('deleting', onDeleting)

    return () => {
      db.transactions.hook('creating').unsubscribe(onCreating)
      db.transactions.hook('updating').unsubscribe(onUpdating)
      db.transactions.hook('deleting').unsubscribe(onDeleting)
    }
  }, [page, load])

  async function del(id:string){
    await db.transactions.delete(id)
    const maxPage = Math.max(0, Math.ceil((total - 1) / PAGE_SIZE) - 1)
    const nextPage = Math.min(page, maxPage)
    if (nextPage !== page) setPage(nextPage)
    void load(nextPage)
  }

  const maxPageIndex = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  return (
    <div className="grid gap-3 mt-4">
      {rows.map(r => (
        <div key={r.id} className="card flex items-center justify-between">
          <div>
            <div className="text-sm capitalize">
              {r.kind} · <span className="text-soft">{r.category}</span>
            </div>
            <div className="text-xs text-soft">
              {new Date(r.date).toLocaleString()}
            </div>
            {r.note && <div className="text-xs mt-1 opacity-80">{r.note}</div>}
          </div>
          <div className={(r.kind==='expense' || r.kind==='asset') ? 'text-down font-semibold' : 'text-up font-semibold'}>
            {r.amount.toLocaleString(undefined,{ style:'currency', currency:'GBP'})}
          </div>
          <button onClick={()=>void del(r.id)} className="badge">Delete</button>
        </div>
      ))}
      {rows.length===0 && <div className="text-soft text-center mt-8">No transactions on this page.</div>}

      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-soft">
          Page {page+1} / {maxPageIndex+1} • {total} total
        </div>
        <div className="flex gap-2">
          <button className="badge" disabled={page<=0} onClick={()=>{ const p=page-1; setPage(p); void load(p) }}>Prev</button>
          <button className="badge" disabled={page>=maxPageIndex} onClick={()=>{ const p=page+1; setPage(p); void load(p) }}>Next</button>
        </div>
      </div>
    </div>
  )
}



function ReportsView({
  sums, period, onPeriod
}: { sums: ReturnType<typeof summarize>, period: Period, onPeriod: (p: Period) => void }) {
  const [tx, setTx] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<AssetHolding[]>([])

  useEffect(() => {
    // initial load
    db.transactions.toArray().then(setTx)
    db.holdings.toArray().then(setHoldings)

    // transactions hooks
    const tCreating = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setTx(await db.transactions.toArray()), 0)
    }
    const tUpdating = (mods: Partial<Transaction>, pk: string, obj: Transaction, tx: unknown) => {
      void mods; void pk; void obj; void tx
      setTimeout(async () => setTx(await db.transactions.toArray()), 0)
    }
    const tDeleting = (pk: string, obj: Transaction, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setTx(await db.transactions.toArray()), 0)
    }

    db.transactions.hook('creating', tCreating)
    db.transactions.hook('updating', tUpdating)
    db.transactions.hook('deleting', tDeleting)

    // holdings hooks
    const hCreating = (pk: string, obj: AssetHolding, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }
    const hUpdating = (mods: Partial<AssetHolding>, pk: string, obj: AssetHolding, tx: unknown) => {
      void mods; void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }
    const hDeleting = (pk: string, obj: AssetHolding, tx: unknown) => {
      void pk; void obj; void tx
      setTimeout(async () => setHoldings(await db.holdings.toArray()), 0)
    }

    db.holdings.hook('creating', hCreating)
    db.holdings.hook('updating', hUpdating)
    db.holdings.hook('deleting', hDeleting)

    return () => {
      db.transactions.hook('creating').unsubscribe(tCreating)
      db.transactions.hook('updating').unsubscribe(tUpdating)
      db.transactions.hook('deleting').unsubscribe(tDeleting)
      db.holdings.hook('creating').unsubscribe(hCreating)
      db.holdings.hook('updating').unsubscribe(hUpdating)
      db.holdings.hook('deleting').unsubscribe(hDeleting)
    }
  }, [])




  // Live values
  const portfolioValue = useMemo(() => sumPortfolioValue(holdings), [holdings])
  const netWorth = useMemo(() => sums.balance + portfolioValue + sums.saving, [sums.balance, portfolioValue, sums.saving])

  // Period-scoped views
  const txInPeriod = useMemo(() => filterByPeriod(tx, period), [tx, period])
  const assetPurchases = useMemo(() => sumByKind(txInPeriod, 'asset'), [txInPeriod])

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Summary</h3>
        <PeriodSelector value={period} onChange={onPeriod} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Income" value={sums.income} tone="up" />
        <Stat label="Expenses" value={sums.expense} tone="down" />
        <Stat label="Savings (total)" value={sums.saving} tone="up" />
        <Stat label="Portfolio Value" value={portfolioValue} />
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <Stat label="Balance (cash)" value={sums.balance} tone={sums.balance >= 0 ? 'up' : 'down'} />
          <Stat label="Net Worth" value={netWorth} tone={netWorth >= 0 ? 'up' : 'down'} />
        </div>
        {/* Optional audit tile to see period asset spend */}
        <div className="col-span-2">
          <div className="card">
            <div className="text-sm text-soft">Asset Purchases (this {period})</div>
            <div className="text-xl font-semibold">
              {assetPurchases.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })}
            </div>
          </div>
        </div>
      </div>

      {/* Charts (back again) */}
      <div className="grid md:grid-cols-2 gap-4">
        <CategoryPie rows={txInPeriod} />
        <TrendLines rows={txInPeriod} />
      </div>

      {/* Backup / Restore */}
      <div className="card flex flex-wrap gap-2 items-center justify-between">
        <div className="text-sm text-soft">Backup / Restore</div>
        <div className="flex gap-2">
          <button className="btn" onClick={async () => exportJSON(await db.transactions.toArray())}>Export JSON</button>
          <button className="btn" onClick={async () => exportCSV(await db.transactions.toArray())}>Export CSV</button>
          <label className="btn cursor-pointer">
            Import
            <input
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const items = await importFile(f)
                await db.transactions.bulkPut(items)
                location.reload()
              }}
            />
          </label>
        </div>
      </div>

      <div className="text-xs text-soft">
        * Balance = income − expenses − savings − asset purchases. Net Worth = Balance + Portfolio Value + Savings.
      </div>
    </div>
  )
}

function AssetsView() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="mt-4 grid gap-4">
      <div className="text-soft text-sm">
        Track your holdings (quantity, avg cost, and manual current price). Data is local/offline.
      </div>
      <HoldingForm onAdded={() => setRefreshKey(k => k + 1)} />
      {/* Force list to refresh after adding */}
      <div key={refreshKey}>
        <HoldingsTable />
      </div>
    </div>
  )
}
