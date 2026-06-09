'use client'

import { BanknotesIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { formatCurrency, formatShortHours } from '@/lib/workclock'

type PayBreakdownCardProps = {
  title?: string
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  hourlyRate: number
  overworksRate: number
  hint?: string
}

export function PayBreakdownCard({
  title = 'Pay Breakdown',
  regularHours,
  overtimeHours,
  regularPay,
  overtimePay,
  hourlyRate,
  overworksRate,
  hint,
}: PayBreakdownCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const totalPay = regularPay + overtimePay

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BanknotesIcon className="h-5 w-5" />
        </div>
        {hint ? <p className="text-right text-xs font-bold text-slate-500">{hint}</p> : null}
      </div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="mt-5 flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={isOpen}
      >
        <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">
        {formatCurrency(totalPay)}
      </p>
      {isOpen && (
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
              <span>
                <span className="font-medium text-slate-700">Regular</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {formatShortHours(regularHours)} × {formatCurrency(hourlyRate)}
                </span>
              </span>
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(regularPay)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>
                <span className="font-medium text-slate-700">Overtime</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {formatShortHours(overtimeHours)} × {formatCurrency(hourlyRate * overworksRate)}
                </span>
              </span>
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(overtimePay)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(totalPay)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
