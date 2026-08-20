import { CheckCircle2 } from 'lucide-react'

interface ToastProps {
  message: string
}

function Toast({ message }: ToastProps) {
  return (
    <div className="animate-toast-in fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-2xl shadow-slate-900/10 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40">
      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      {message}
    </div>
  )
}

export default Toast
