'use client'

import { useEffect, useMemo, useState } from 'react'
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




function filterByPeriod(rows: Transaction[], p: Period){
  const from = periodStart(p)
  if (p === 'all') return rows
  return rows.filter(r => r.date >= from.getTime())
}

function sumByKind(rows: Transaction[], kind: Transaction['kind']){
  return rows.filter(r => r.kind === kind).reduce((a,b) => a + b.amount, 0)
}



export default function Page(){
  const [tab, setTab] = useState<'add'|'list'|'reports'|'assets'>('add')
  const [period, setPeriod] = useState<Period>('month')
  const [rows, setRows] = useState<Transaction[]>([])

  async function refresh(){ setRows(await db.transactions.orderBy('date').reverse().toArray()) }

  useEffect(()=>{ 
    refresh()
    const c = db.transactions.hook('creating', () => setTimeout(refresh, 0))
    const u = db.transactions.hook('updating', () => setTimeout(refresh, 0))
    const d = db.transactions.hook('deleting', () => setTimeout(refresh, 0))
    return () => {
      db.transactions.hook('creating').unsubscribe(c)
      db.transactions.hook('updating').unsubscribe(u)
      db.transactions.hook('deleting').unsubscribe(d)
    }
  },[])

  const sums = useMemo(()=> summarize(rows, period), [rows, period])

  return (
    <main>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-soft text-sm">Private, offline-first. No logins.</p>
      </header>

      <Tabs value={tab} onChange={v=>setTab(v as any)} items={[
        { value:'add', label:'Add' },
        { value:'list', label:'Transactions' },
        { value:'reports', label:'Reports' },
        { value:'assets', label:'Assets' },
      ]} />

      {tab==='add' && <AddView onPeriod={setPeriod} period={period} />}
      {tab==='list' && <ListView rows={rows} />}
      {tab==='reports' && <ReportsView sums={sums} period={period} onPeriod={setPeriod} />}
      {tab==='assets' && <AssetsView />}
    </main>
  )
}

function AddView({ period, onPeriod }:{ period: Period, onPeriod:(p:Period)=>void }){
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

function KindSwitch({ value, onChange }:{ value: TransactionKind, onChange:(k:TransactionKind)=>void }){
  const options: TransactionKind[] = ['expense','income','saving']
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button key={o} onClick={()=>onChange(o)} className="badge" data-active={o===value}>{o}</button>
      ))}
    </div>
  )
}

function Overview(){
  const [rows, setRows] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<AssetHolding[]>([])
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    // initial load
    db.transactions.toArray().then(setRows)
    db.holdings.toArray().then(setHoldings)

    // live refresh on DB changes
    const h1 = db.transactions.hook('creating', () => setTimeout(async () => setRows(await db.transactions.toArray()), 0))
    const h2 = db.transactions.hook('updating', () => setTimeout(async () => setRows(await db.transactions.toArray()), 0))
    const h3 = db.transactions.hook('deleting', () => setTimeout(async () => setRows(await db.transactions.toArray()), 0))

    const a1 = db.holdings.hook('creating', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))
    const a2 = db.holdings.hook('updating', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))
    const a3 = db.holdings.hook('deleting', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))

    return () => {
      db.transactions.hook('creating').unsubscribe(h1)
      db.transactions.hook('updating').unsubscribe(h2)
      db.transactions.hook('deleting').unsubscribe(h3)
      db.holdings.hook('creating').unsubscribe(a1)
      db.holdings.hook('updating').unsubscribe(a2)
      db.holdings.hook('deleting').unsubscribe(a3)
    }
  }, [])

  const s = useMemo(()=> summarize(rows, period), [rows, period])
  const portfolioValue = useMemo(()=> sumPortfolioValue(holdings), [holdings])

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
          <Stat label="Balance (cash)" value={s.balance} tone={s.balance>=0?'up':'down'} />
          <Stat label="Net Worth" value={netWorth} tone={netWorth>=0?'up':'down'} />
        </div>
      </div>
    </div>
  )
}


function ListView({ rows }:{ rows: Transaction[] }){
  const [list, setList] = useState<Transaction[]>(rows)

  // keep local list in sync when parent rows change
  useEffect(()=> setList(rows), [rows])

  async function del(id:string){
    await db.transactions.delete(id)
    // refresh local list after deletion
    const next = await db.transactions.orderBy('date').reverse().toArray()
    setList(next)
  }

  return (
    <div className="grid gap-3 mt-4">
      {list.map(r => (
        <div key={r.id} className="card flex items-center justify-between">
          <div>
            <div className="text-sm capitalize">
              {r.kind} · <span className="text-soft">{r.category}</span>
            </div>
            <div className="text-xs text-soft">{new Date(r.date).toLocaleString()}</div>
            {r.note && <div className="text-xs mt-1 opacity-80">{r.note}</div>}
          </div>
          <div className={r.kind==='expense' ? 'text-down font-semibold' : 'text-up font-semibold'}>
            {r.amount.toLocaleString(undefined,{ style:'currency', currency:'GBP'})}
          </div>
          <button onClick={()=>del(r.id)} className="badge">Delete</button>
        </div>
      ))}
      {list.length===0 && <div className="text-soft text-center mt-8">No transactions yet.</div>}
    </div>
  )
}


function ReportsView({
  sums, period, onPeriod
}:{ sums: ReturnType<typeof summarize>, period:Period, onPeriod:(p:Period)=>void }){
  const [tx, setTx] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<AssetHolding[]>([])

  useEffect(()=> {
    // initial load
    db.transactions.toArray().then(setTx)
    db.holdings.toArray().then(setHoldings)

    // live refresh on changes
    const h1 = db.transactions.hook('creating', () => setTimeout(async () => setTx(await db.transactions.toArray()), 0))
    const h2 = db.transactions.hook('updating', () => setTimeout(async () => setTx(await db.transactions.toArray()), 0))
    const h3 = db.transactions.hook('deleting', () => setTimeout(async () => setTx(await db.transactions.toArray()), 0))
    const a1 = db.holdings.hook('creating', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))
    const a2 = db.holdings.hook('updating', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))
    const a3 = db.holdings.hook('deleting', () => setTimeout(async () => setHoldings(await db.holdings.toArray()), 0))

    return () => {
      db.transactions.hook('creating').unsubscribe(h1)
      db.transactions.hook('updating').unsubscribe(h2)
      db.transactions.hook('deleting').unsubscribe(h3)
      db.holdings.hook('creating').unsubscribe(a1)
      db.holdings.hook('updating').unsubscribe(a2)
      db.holdings.hook('deleting').unsubscribe(a3)
    }
  },[])

  // Live values
  const portfolioValue = useMemo(()=> sumPortfolioValue(holdings), [holdings])
  const netWorth = useMemo(()=> sums.balance + portfolioValue + sums.saving, [sums.balance, portfolioValue, sums.saving])

  // Period-scoped views
  const txInPeriod = useMemo(()=> filterByPeriod(tx, period), [tx, period])
  const assetPurchases = useMemo(()=> sumByKind(txInPeriod, 'asset'), [txInPeriod])

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
          <Stat label="Balance (cash)" value={sums.balance} tone={sums.balance>=0?'up':'down'} />
          <Stat label="Net Worth" value={netWorth} tone={netWorth>=0?'up':'down'} />
        </div>
        {/* Optional audit tile to see period asset spend */}
        <div className="col-span-2">
          <div className="card">
            <div className="text-sm text-soft">Asset Purchases (this {period})</div>
            <div className="text-xl font-semibold">
              {assetPurchases.toLocaleString(undefined,{style:'currency', currency:'GBP'})}
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
          <button className="btn" onClick={async()=> exportJSON(await db.transactions.toArray())}>Export JSON</button>
          <button className="btn" onClick={async()=> exportCSV(await db.transactions.toArray())}>Export CSV</button>
          <label className="btn cursor-pointer">
            Import
            <input
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={async(e)=>{
                const f = e.target.files?.[0]
                if(!f) return
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




function AssetsView(){
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="mt-4 grid gap-4">
      <div className="text-soft text-sm">
        Track your holdings (quantity, avg cost, and manual current price). Data is local/offline.
      </div>
      <HoldingForm onAdded={()=> setRefreshKey(k => k+1)} />
      {/* Force list to refresh after adding */}
      <div key={refreshKey}>
        <HoldingsTable />
      </div>
    </div>
  )
}
