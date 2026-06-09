'use client'

export function DashboardLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[32px] border border-white/60 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">
          PayReport
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em] text-slate-900">
          Loading workspace
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Menu stays mounted while the next page loads.
        </p>
      </div>
    </div>
  )
}
