import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, isAfter } from 'date-fns'
import { Period, Transaction } from './types'


export function periodStart(period: Period, d = new Date()): Date {
switch (period) {
case 'day': return startOfDay(d)
case 'week': return startOfWeek(d, { weekStartsOn: 1 })
case 'month': return startOfMonth(d)
case 'quarter': return startOfQuarter(d)
case 'year': return startOfYear(d)
default: return new Date(0)
}
}


export function summarize(trans: Transaction[], period: Period) {
const from = periodStart(period)
const inRange = trans.filter(t => isAfter(new Date(t.date), from) || period === 'all')
const sum = (k: Transaction['kind']) => inRange.filter(t => t.kind === k).reduce((a,b)=>a+b.amount, 0)
return {
  income: sum('income'),
  expense: sum('expense'),
  saving: sum('saving'),
  asset: sum('asset'),
  balance: sum('income') - sum('expense') - sum('saving') - sum('asset'),
  netWorthDelta: sum('saving') + sum('asset') - sum('expense'),
  count: inRange.length,
}

}