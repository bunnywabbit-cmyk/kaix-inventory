import { LogOut, Menu, Search, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Theme } from '../../hooks/useTheme'
import { type ViewKey, viewTitles } from '../../lib/navigation'
import ThemeToggle from '../ui/ThemeToggle'

type ConnectionStatus = 'checking' | 'online' | 'offline'

interface HeaderProps {
  activeView: ViewKey
  onOpenMobileNav: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  theme: Theme
  onToggleTheme: () => void
}

function Header({
  activeView,
  onOpenMobileNav,
  searchValue,
  onSearchChange,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Staff'

  useEffect(() => {
    let cancelled = false

    const checkHealth = () => {
      fetch('/api/health')
        .then((res) => {
          if (!cancelled) setStatus(res.ok ? 'online' : 'offline')
        })
        .catch(() => {
          if (!cancelled) setStatus('offline')
        })
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur supports-backdrop-filter:bg-white/80 sm:px-6 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-backdrop-filter:bg-slate-950/80">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="hidden shrink-0 text-base font-semibold text-slate-900 sm:block dark:text-white">
        {viewTitles[activeView]}
      </h1>

      <div className="relative ml-0 flex-1 sm:ml-4 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search SKU or Screen ID..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${
            status === 'online'
              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
              : status === 'offline'
                ? 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-300 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30'
                : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
          }`}
        >
          {status === 'offline' ? (
            <WifiOff className="size-3.5" />
          ) : (
            <Wifi className="size-3.5" />
          )}
          {status === 'checking' ? 'Connecting...' : status === 'online' ? 'Live' : 'Offline'}
        </span>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4 dark:border-slate-800">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
            {initials}
          </span>
          <span className="hidden leading-tight md:flex md:flex-col">
            <span className="max-w-32 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {user?.email}
            </span>
            <span className="text-xs text-slate-500">{roleLabel}</span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-wait dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
