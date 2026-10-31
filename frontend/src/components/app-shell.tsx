import {
  Boxes,
  Database,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { ThemeToggle } from '@/components/theme-toggle'
import { useClusterHealth } from '@/hooks/use-cluster'
import { cn } from '@/lib/utils'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/buckets', label: 'Buckets', icon: Database, end: false },
  { to: '/keys', label: 'Access keys', icon: KeyRound, end: false },
  { to: '/cluster', label: 'Cluster', icon: Boxes, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
  )
}

function ClusterStatusPill() {
  const { data, isError, isLoading } = useClusterHealth()

  const status = isError ? 'offline' : isLoading ? 'loading' : data?.status
  const dot =
    status === 'healthy'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-500'
        : status === 'loading'
          ? 'bg-muted-foreground'
          : 'bg-red-500'
  const label =
    status === 'healthy'
      ? 'Healthy'
      : status === 'degraded'
        ? 'Degraded'
        : status === 'unavailable'
          ? 'Unavailable'
          : status === 'loading'
            ? 'Connecting…'
            : 'Garage offline'

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  )
}

export function AppShell() {
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardDrive className="size-4" />
          </div>
          <span className="font-heading text-sm font-semibold">Garage UI</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Garage v2.5.0 · localhost
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <HardDrive className="size-4" />
            <span className="font-heading text-sm font-semibold">Garage UI</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            S3-compatible object storage
          </div>
          <div className="flex items-center gap-3">
            <ClusterStatusPill />
            <ThemeToggle />
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b px-2 py-2 md:hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm',
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}