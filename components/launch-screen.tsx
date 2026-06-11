import { Brand } from '@/components/workclock/ui/Brand'

export function LaunchScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex justify-center">
          <Brand compact />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">
            Opening workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Loading your hours and reports.
          </p>
        </div>

        <div className="mt-8">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300 [animation-delay:300ms]" />
          </div>
        </div>
      </section>
    </main>
  )
}
