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
  download(
    `finance-export-${Date.now()}.json`,
    JSON.stringify(rows, null, 2),
    'application/json'
  )
}

export function exportCSV(rows: Transaction[]) {
  const header = ['id', 'kind', 'amount', 'currency', 'category', 'note', 'date'] as const
  const csv = [header.join(',')]
    .concat(
      rows.map(r =>
        [
          r.id,
          r.kind,
          r.amount,
          r.currency,
          r.category,
          r.note ?? '',
          r.date,
        ]
          .map((v) => {
            const s = String(v)
            // quote if it contains comma, quote or newline
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(',')
      )
    )
    .join('\n')

  download(`finance-export-${Date.now()}.csv`, csv, 'text/csv')
}

// ---- Import (JSON/CSV) ----

export async function importFile(file: File): Promise<Transaction[]> {
  const text = await file.text()

  // Try JSON first
  try {
    const data: unknown = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error('Invalid JSON')
    return data.map(validate)
  } catch {
    // Fallback to CSV
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return []

    const [head, ...rows] = lines
    const cols = head.split(',').map((h) => h.replace(/^"|"$/g, ''))
    const idx = (k: string) => cols.indexOf(k)

    const iId = idx('id')
    const iKind = idx('kind')
    const iAmount = idx('amount')
    const iCurrency = idx('currency')
    const iCategory = idx('category')
    const iNote = idx('note')
    const iDate = idx('date')

    return rows.map((line) => {
      const parts = parseCsvLine(line)

      const obj: Record<string, unknown> = {
        id: parts[iId] ?? '',
        kind: parts[iKind] ?? '',
        amount: Number(parts[iAmount] ?? 0),
        currency: (parts[iCurrency] ?? 'GBP') || 'GBP',
        category: (parts[iCategory] ?? 'general') || 'general',
        note: parts[iNote] ? String(parts[iNote]) : undefined,
        date: Number(parts[iDate] ?? 0),
      }

      return validate(obj)
    })
  }
}

// ---- Validation ----

const TransactionSchema = z.object({
  id: z.string(),
  kind: z.enum(['income', 'expense', 'saving', 'asset']),
  amount: z.number().nonnegative(),
  currency: z.string().default('GBP'),
  category: z.string().default('general'),
  note: z.string().optional(),
  date: z.number(),
})

function validate(obj: unknown): Transaction {
  return TransactionSchema.parse(obj)
}

// ---- CSV utils ----

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQ = false
      } else {
        cur += c
      }
    } else {
      if (c === ',') {
        out.push(cur)
        cur = ''
      } else if (c === '"') {
        inQ = true
      } else {
        cur += c
      }
    }
  }
  out.push(cur)
  return out
}
