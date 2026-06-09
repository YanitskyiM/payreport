import {
  ChartBarIcon,
  Cog6ToothIcon,
  QueueListIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import type { NavItemConfig } from './types'

export const NAV_ITEMS: NavItemConfig[] = [
  { view: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <Squares2X2Icon className="h-5 w-5" /> },
  { view: 'reports', href: '/dashboard/reports', label: 'Reports', icon: <ChartBarIcon className="h-5 w-5" /> },
  { view: 'entries', href: '/dashboard/entries', label: 'Entries', icon: <QueueListIcon className="h-5 w-5" /> },
  { view: 'settings', href: '/dashboard/settings', label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
]

export const inputClassName =
  'h-12 min-w-0 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'
