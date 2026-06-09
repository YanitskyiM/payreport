'use client'

import { ClockIcon } from '@heroicons/react/24/outline'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-indigo-200 text-indigo-600">
        <ClockIcon className="h-4.5 w-4.5" />
      </div>
      <span
        className={`font-extrabold leading-none tracking-[-0.03em] text-indigo-600 ${
          compact ? 'text-2xl' : 'text-[1.9rem]'
        }`}
      >
        PayReport
      </span>
    </div>
  )
}
