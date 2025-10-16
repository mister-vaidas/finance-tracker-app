'use client'
import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { Transaction } from '@/lib/types'

const COLORS = ['#0EA5E9','#22C55E','#F59E0B','#EF4444','#A78BFA','#14B8A6','#F472B6','#94A3B8']

export function CategoryPie({ rows }:{ rows: Transaction[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    rows.filter(r => r.kind === 'expense').forEach(r => {
      map.set(r.category, (map.get(r.category) || 0) + r.amount)
    })
    return Array.from(map, ([name, value]) => ({ name, value }))
  }, [rows])

  if (!data.length) return <div className="text-soft text-sm">No expense data for this period.</div>

  return (
    <div className="card h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <RTooltip formatter={(v:number)=> v.toLocaleString(undefined,{style:'currency',currency:'GBP'})} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendLines({ rows }:{ rows: Transaction[] }) {
  const data = useMemo(() => {
    const byDay: Record<string,{date:string,income:number,expense:number,saving:number}> = {}
    for (const r of rows) {
      const d = new Date(r.date)
      const key = d.toISOString().slice(0,10)
      byDay[key] ||= { date: key, income:0, expense:0, saving:0 }
      if (r.kind==='income') byDay[key].income += r.amount
      if (r.kind==='expense') byDay[key].expense += r.amount
      if (r.kind==='saving') byDay[key].saving += r.amount
    }
    return Object.values(byDay).sort((a,b)=> a.date.localeCompare(b.date))
  }, [rows])

  if (!data.length) return <div className="text-soft text-sm">No trend data yet.</div>

  return (
    <div className="card h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v)=> v.toLocaleString()} />
          <Legend />
          <RTooltip formatter={(v:number)=> v.toLocaleString(undefined,{style:'currency',currency:'GBP'})} />
          <Line type="monotone" dataKey="income" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expense" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="saving" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
