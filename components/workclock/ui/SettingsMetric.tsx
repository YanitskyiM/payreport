'use client'

type SettingsMetricProps = {
  label: string
  value: string
}

export function SettingsMetric({ label, value }: SettingsMetricProps) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-slate-900">{value}</p>
    </div>
  )
}
