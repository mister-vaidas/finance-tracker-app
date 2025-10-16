'use client'
import { clsx } from 'clsx'


export function Stat({ label, value, tone }: { label: string, value: number | string, tone?: 'neutral'|'up'|'down' }) {
const fmt = typeof value === 'number' ? value.toLocaleString(undefined, { style: 'currency', currency: 'GBP' }) : value
const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
return (
<div className="card">
<div className="text-sm text-soft">{label}</div>
<div className={clsx('text-2xl font-semibold mt-1', color)}>{fmt}</div>
</div>
)
}


export function Tabs({ value, onChange, items }:{ value: string, onChange:(v:string)=>void, items:{value:string,label:string,icon?:React.ReactNode}[] }){
return (
<div className="grid grid-cols-4 gap-2">
{items.map(it=> (
<button key={it.value} onClick={()=>onChange(it.value)} className="tab" data-active={value===it.value}>
<div className="text-xs opacity-80">{it.label}</div>
</button>
))}
</div>
)
}


export function Section({ title, children, right }:{ title:string, children:React.ReactNode, right?:React.ReactNode }){
return (
<section className="mt-6">
<div className="flex items-center justify-between mb-3">
<h2 className="text-lg font-semibold">{title}</h2>
{right}
</div>
<div className="grid gap-3">{children}</div>
</section>
)
}