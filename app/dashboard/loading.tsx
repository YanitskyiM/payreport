export default function DashboardLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <section className="w-full max-w-sm rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">
          PayReport
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.05em] text-slate-900">
          Preparing dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Loading your data and keeping navigation stable.
        </p>
      </section>
    </main>
  )
}
