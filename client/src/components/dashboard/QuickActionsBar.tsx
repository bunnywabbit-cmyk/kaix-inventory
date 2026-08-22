import { Frame, PackagePlus, ScrollText, Send } from 'lucide-react'

interface QuickActionsBarProps {
  onAddRawStock: () => void
  onRegisterScreen: () => void
  onLogPrintRun: () => void
  onAddDtfOrder: () => void
}

function QuickActionsBar({
  onAddRawStock,
  onRegisterScreen,
  onLogPrintRun,
  onAddDtfOrder,
}: QuickActionsBarProps) {
  const actions = [
    { label: 'Add Raw Stock', icon: PackagePlus, onClick: onAddRawStock },
    { label: 'Register New Screen', icon: Frame, onClick: onRegisterScreen },
    { label: 'Log Completed Print Run', icon: ScrollText, onClick: onLogPrintRun },
    { label: 'Add to DTF Order List', icon: Send, onClick: onAddDtfOrder },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-sky-500/40 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-sky-400"
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default QuickActionsBar
