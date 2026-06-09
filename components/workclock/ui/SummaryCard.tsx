'use client'

import type { SummaryCardProps } from '../types'

const toneClasses = {
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function SummaryCard({ title, value, hint, icon, tone = 'slate', progress }: SummaryCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClasses[tone]}`}>
          {icon}
        </div>
        {hint ? <p className="text-right text-xs font-bold text-slate-500">{hint}</p> : null}
      </div>
      <h2 className="mt-5 text-sm font-semibold text-slate-500">{title}</h2>
      <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">
        {value}
      </p>
      {typeof progress === 'number' ? (
        <div className="mt-5 h-2 rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }}
          />
        </div>
      ) : null}
    </section>
  )
}
