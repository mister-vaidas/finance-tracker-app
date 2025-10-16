'use client'
import { Period } from '@/lib/types'


const options: {value:Period,label:string}[] = [
{ value:'day', label:'Day' },
{ value:'week', label:'Week' },
{ value:'month', label:'Month' },
{ value:'quarter', label:'Quarter' },
{ value:'year', label:'Year' },
{ value:'all', label:'All' },
]


export function PeriodSelector({ value, onChange }:{ value: Period, onChange: (p:Period)=>void }){
return (
<div className="flex gap-2 overflow-auto">
{options.map(o=> (
<button key={o.value} onClick={()=>onChange(o.value)} className="badge" data-active={value===o.value}>
{o.label}
</button>
))}
</div>
)
}