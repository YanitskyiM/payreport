function SkeletonBar({
  className,
  rounded = 'rounded-full',
}: {
  className: string
  rounded?: string
}) {
  return <div className={`animate-pulse bg-slate-200 ${rounded} ${className}`} />
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

export default function DashboardLoading() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <EntriesHeaderSkeleton />
      <EntriesDesktopTableSkeleton />
      <EntriesMobileCardsSkeleton />
      <EntriesPaginationSkeleton />
    </section>
  )
}
