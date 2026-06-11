import type { View } from '@/lib/workclock'

function SkeletonBar({
  className,
  rounded = 'rounded-full',
}: {
  className: string
  rounded?: string
}) {
  return <div className={`animate-pulse bg-slate-200 ${rounded} ${className}`} />
}

function DashboardHeroSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col items-center justify-center gap-5 rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <SkeletonBar className="h-14 w-14" />
        <div className="w-full max-w-sm">
          <SkeletonBar className="mx-auto h-3 w-24" />
          <SkeletonBar className="mx-auto mt-4 h-16 w-52" />
          <SkeletonBar className="mx-auto mt-4 h-4 w-36" />
        </div>
        <div className="flex w-full max-w-sm gap-3">
          <SkeletonBar className="h-12 flex-1" rounded="rounded-2xl" />
          <SkeletonBar className="h-12 flex-1" rounded="rounded-2xl" />
        </div>
      </div>
      <div className="flex w-full flex-col justify-between gap-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:w-[380px]">
        <div className="flex items-center justify-between">
          <SkeletonBar className="h-9 w-9" rounded="rounded-2xl" />
          <SkeletonBar className="h-6 w-20" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <SkeletonBar className="h-[180px] w-[180px]" rounded="rounded-full" />
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

function DashboardChartsSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <SkeletonBar className="h-4 w-28" />
            <SkeletonBar className="mt-2 h-7 w-36" />
          </div>
          <SkeletonBar className="h-9 w-32" rounded="rounded-full" />
        </div>
        <div className="mt-8 flex h-56 items-end justify-between gap-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-3">
              <SkeletonBar className="h-3 w-full max-w-[44px]" rounded="rounded-full" />
              <SkeletonBar className={`w-full max-w-[44px] ${['h-24', 'h-32', 'h-20', 'h-40', 'h-28', 'h-36', 'h-16'][index]}`} rounded="rounded-t-3xl" />
              <SkeletonBar className="h-3 w-8" />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="mt-2 h-7 w-40" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
              <div>
                <SkeletonBar className="h-4 w-28" />
                <SkeletonBar className="mt-2 h-3 w-20" />
              </div>
              <SkeletonBar className="h-8 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function DashboardRecentEntriesSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="mt-2 h-7 w-44" />
        </div>
        <SkeletonBar className="h-10 w-28" rounded="rounded-2xl" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SkeletonBar className="h-4 w-36" />
                <SkeletonBar className="mt-2 h-3 w-24" />
              </div>
              <div className="flex gap-2">
                <SkeletonBar className="h-9 w-9" />
                <SkeletonBar className="h-9 w-9" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DashboardViewSkeleton() {
  return (
    <section className="space-y-6">
      <DashboardHeroSkeleton />
      <DashboardChartsSkeleton />
      <DashboardRecentEntriesSkeleton />
    </section>
  )
}

function EntriesDesktopTableSkeleton() {
  return (
    <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {['Date', 'Time', 'Duration', 'Source', 'Note', ''].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
              >
                <SkeletonBar className={header ? 'h-3 w-16' : 'ml-auto h-3 w-8'} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: 6 }, (_, index) => (
            <tr key={index}>
              <td className="px-4 py-4">
                <SkeletonBar className="h-4 w-40" />
                <SkeletonBar className="mt-2 h-3 w-20" />
              </td>
              <td className="px-4 py-4">
                <SkeletonBar className="h-4 w-32" />
              </td>
              <td className="px-4 py-4">
                <SkeletonBar className="h-4 w-20" />
              </td>
              <td className="px-4 py-4">
                <SkeletonBar className="h-7 w-20" rounded="rounded-full" />
              </td>
              <td className="px-4 py-4">
                <SkeletonBar className="h-4 w-full max-w-[220px]" />
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <SkeletonBar className="h-9 w-9" />
                  <SkeletonBar className="h-9 w-9" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EntriesMobileCardsSkeleton() {
  return (
    <div className="mt-6 space-y-3 lg:hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <SkeletonBar className="h-4 w-44" />
              <SkeletonBar className="mt-2 h-3 w-28" />
            </div>
            <SkeletonBar className="h-9 w-9" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <SkeletonBar className="h-7 w-20" />
              <SkeletonBar className="mt-2 h-4 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBar className="h-7 w-20" rounded="rounded-full" />
              <SkeletonBar className="h-9 w-9" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EntriesHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <SkeletonBar className="h-4 w-16" />
        <SkeletonBar className="mt-2 h-7 w-32" />
        <SkeletonBar className="mt-2 h-3 w-28" />
      </div>
      <SkeletonBar className="h-12 w-full sm:w-[180px]" rounded="rounded-2xl" />
    </div>
  )
}

function EntriesPaginationSkeleton() {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
      <SkeletonBar className="h-10 w-10" rounded="rounded-2xl" />
      <div className="flex items-center gap-1">
        <SkeletonBar className="h-9 w-9" rounded="rounded-xl" />
        <SkeletonBar className="h-9 w-9" rounded="rounded-xl" />
        <SkeletonBar className="h-9 w-9" rounded="rounded-xl" />
      </div>
      <SkeletonBar className="h-10 w-10" rounded="rounded-2xl" />
    </div>
  )
}

export function EntriesViewSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <EntriesHeaderSkeleton />
      <EntriesDesktopTableSkeleton />
      <EntriesMobileCardsSkeleton />
      <EntriesPaginationSkeleton />
    </section>
  )
}

export function ReportsViewSkeleton() {
  return (
    <section className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="mt-2 h-7 w-36" />
            <SkeletonBar className="mt-2 h-4 w-40" />
          </div>
          <SkeletonBar className="h-5 w-5" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <section key={index} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <SkeletonBar className="h-4 w-28" />
              <SkeletonBar className="h-10 w-10" rounded="rounded-2xl" />
            </div>
            <SkeletonBar className="mt-6 h-10 w-24" />
            <SkeletonBar className="mt-3 h-3 w-32" />
          </section>
        ))}
      </div>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="mt-2 h-7 w-40" />
          </div>
          <SkeletonBar className="h-10 w-32" rounded="rounded-2xl" />
        </div>
        <div className="mt-8 flex h-56 items-end justify-between gap-3">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-3">
              <SkeletonBar className={`w-full max-w-[32px] ${['h-12', 'h-24', 'h-16', 'h-28', 'h-20', 'h-36', 'h-[72px]', 'h-[120px]', 'h-14', 'h-24'][index] ?? 'h-24'}`} rounded="rounded-t-2xl" />
              <SkeletonBar className="h-3 w-6" />
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

export function SettingsViewSkeleton() {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="mt-2 h-7 w-48" />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="mt-2 h-12 w-full" rounded="rounded-2xl" />
            </div>
          ))}
        </div>
        <SkeletonBar className="mt-6 h-12 w-36" rounded="rounded-2xl" />
      </section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SkeletonBar className="h-4 w-28" />
        <SkeletonBar className="mt-2 h-7 w-44" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
              <SkeletonBar className="h-4 w-24" />
              <SkeletonBar className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <SkeletonBar className="h-4 w-16" />
          <SkeletonBar className="mt-3 h-12 w-full" rounded="rounded-2xl" />
        </div>
      </section>
    </section>
  )
}

export function DashboardContentSkeleton({ view }: { view: View }) {
  switch (view) {
    case 'dashboard':
      return <DashboardViewSkeleton />
    case 'entries':
      return <EntriesViewSkeleton />
    case 'reports':
      return <ReportsViewSkeleton />
    case 'settings':
      return <SettingsViewSkeleton />
  }
}
