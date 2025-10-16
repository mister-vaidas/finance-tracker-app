import { z } from 'zod'
import { Transaction } from './types'

export function download(filename: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(rows: Transaction[]) {
  download(`finance-export-${Date.now()}.json`, JSON.stringify(rows, null, 2), 'application/json')
}

export function exportCSV(rows: Transaction[]) {
  const header = ['id','kind','amount','currency','category','note','date']
  const csv = [header.join(',')].concat(
    rows.map(r => [r.id,r.kind,r.amount,r.currency,r.category,r.note??'',r.date]
      .map(v => {
        const s = String(v)
        return /[\",\\n]/.test(s) ? `"${s.replace(/\"/g,'\"\"')}"` : s
      }).join(',')
    )
  ).join('\n')
  download(`finance-export-${Date.now()}.csv`, csv, 'text/csv')
}

export async function importFile(file: File): Promise<Transaction[]> {
  const text = await file.text()
  try {
    const arr = JSON.parse(text)
    if (!Array.isArray(arr)) throw new Error('Invalid JSON')
    return arr.map(validate)
  } catch {
    const lines = text.split(/\\r?\\n/).filter(Boolean)
    const [head, ...rows] = lines
    const cols = head.split(',')
    const idx = (k:string)=> cols.indexOf(k)
    return rows.map(line => {
      const parts = parseCsvLine(line)
      const obj = {
        id: parts[idx('id')],
        kind: parts[idx('kind')] as any,
        amount: Number(parts[idx('amount')]),
        currency: parts[idx('currency')]||'GBP',
        category: parts[idx('category')]||'general',
        note: parts[idx('note')]||undefined,
        date: Number(parts[idx('date')]),
      }
      return validate(obj)
    })
  }
}

function validate(obj:any): Transaction {
  const Schema = z.object({
    id: z.string(),
    kind: z.enum(['income','expense','saving','asset']),
    amount: z.number().nonnegative(),
    currency: z.string().default('GBP'),
    category: z.string().default('general'),
    note: z.string().optional(),
    date: z.number(),
  })
  return Schema.parse(obj)
}

function parseCsvLine(line:string){
  const out:string[] = []
  let cur='', inQ=false
  for (let i=0;i<line.length;i++){
    const c=line[i]
    if (inQ){
      if (c==='\"' && line[i+1]==='\"'){ cur+='\"'; i++ }
      else if (c==='\"'){ inQ=false }
      else cur+=c
    } else {
      if (c===','){ out.push(cur); cur='' }
      else if (c==='\"'){ inQ=true }
      else cur+=c
    }
  }
  out.push(cur)
  return out
}
