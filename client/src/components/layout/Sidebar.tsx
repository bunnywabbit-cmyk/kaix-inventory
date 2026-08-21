import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import logo from '../../assets/kaix-butterfly.png'
import { navItems, type ViewKey } from '../../lib/navigation'

interface SidebarProps {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function Sidebar({
  activeView,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden dark:bg-slate-950/70"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white pt-[env(safe-area-inset-top)] transition-all duration-200 ease-out lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-64'
        } ${mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Solid dark badge behind the mark — it's a thin white outline
                (not a filled shape), so it needs contrast that holds
                regardless of the app's own light/dark theme. */}
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 p-2.5 ring-1 ring-inset ring-slate-800">
              <img src={logo} alt="Kaix Customs" className="size-full object-contain" />
            </span>
            <span className={`flex flex-col leading-tight ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                KAIX CUSTOMS
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
                Print Shop OS
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.key === activeView
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/30 dark:text-sky-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                } ${collapsed ? 'lg:justify-center' : ''}`}
              >
                <Icon
                  className={`size-[18px] shrink-0 ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                  strokeWidth={2}
                />
                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                {isActive && (
                  <span
                    className={`ml-auto size-1.5 rounded-full bg-sky-500 dark:bg-sky-400 ${collapsed ? 'lg:hidden' : ''}`}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="hidden shrink-0 border-t border-slate-200 p-3 lg:block dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
