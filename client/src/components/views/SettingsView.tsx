import { LogOut, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Theme } from '../../hooks/useTheme'

interface SettingsViewProps {
  theme: Theme
  onToggleTheme: () => void
}

function SettingsView({ theme, onToggleTheme }: SettingsViewProps) {
  const isDark = theme === 'dark'
  const { user, logout } = useAuth()
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Shop profile and workspace preferences.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h3>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
            <p className="text-xs text-slate-500">
              {isDark ? 'Dark mode is on.' : 'Light mode is on.'} Matches your device by default.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => isDark && onToggleTheme()}
              aria-pressed={!isDark}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                !isDark
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="size-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => !isDark && onToggleTheme()}
              aria-pressed={isDark}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                isDark
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="size-3.5" />
              Dark
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Shop User</h3>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              {initials}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.email}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">Shop name</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Kaix Custom</dd>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">Reorder alerts</dt>
            <dd className="font-medium text-emerald-600 dark:text-emerald-400">Enabled</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Units</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Imperial</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default SettingsView
