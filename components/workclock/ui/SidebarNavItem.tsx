'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type SidebarNavItemProps = {
  active: boolean
  href: string
  icon: ReactNode
  label: string
  onNavigate: (href: string) => void
}

export function SidebarNavItem({ active, href, icon, label, onNavigate }: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      scroll
      onClick={() => onNavigate(href)}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition ${
        active
          ? 'border-indigo-500/30 bg-indigo-600 text-white shadow-[0_12px_30px_rgba(67,56,202,0.24)]'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
          active
            ? 'bg-white/15 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
          active ? 'bg-white' : 'bg-slate-200 group-hover:bg-indigo-200'
        }`}
      />
    </Link>
  )
}
