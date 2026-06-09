'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type MobileNavItemProps = {
  active: boolean
  href: string
  icon: ReactNode
  label: string
  onNavigate: (href: string) => void
}

export function MobileNavItem({ active, href, icon, label, onNavigate }: MobileNavItemProps) {
  return (
    <Link
      href={href}
      scroll
      onClick={() => onNavigate(href)}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold ${
        active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
