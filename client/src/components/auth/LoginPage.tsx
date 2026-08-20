import { Hash, KeyRound, Loader2, Lock, Mail } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import logo from '../../assets/logo.png'
import { useAuth } from '../../context/AuthContext'

type LoginTab = 'password' | 'pin'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'

const tabButtonClass = (active: boolean) =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
    active
      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
  }`

interface PinInputProps {
  disabled: boolean
  onComplete: (pin: string) => void
}

// The parent remounts this (via a `key` bump) to clear it after a failed
// attempt, rather than this component reacting to a "reset" prop — that
// keeps the reset a plain mount-time initial state instead of a setState
// call inside an effect.
function PinInput({ disabled, onComplete }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const focusBox = (index: number) => {
    const box = inputRefs.current[index]
    box?.focus()
    box?.select()
  }

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const digit = event.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < 5) focusBox(index + 1)
    if (next.every((value) => value !== '')) onComplete(next.join(''))
  }

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusBox(index - 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    event.preventDefault()

    const next = Array(6).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]!
    setDigits(next)

    if (pasted.length === 6) {
      onComplete(pasted)
    } else {
      focusBox(pasted.length)
    }
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          aria-label={`PIN digit ${index + 1}`}
          className="size-11 rounded-lg border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      ))}
    </div>
  )
}

function LoginPage() {
  const { login, loginWithPin } = useAuth()
  const [tab, setTab] = useState<LoginTab>('password')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pinSubmitting, setPinSubmitting] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinResetSignal, setPinResetSignal] = useState(0)

  const switchTab = (next: LoginTab) => {
    setTab(next)
    setError(null)
    setPinError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const handlePinComplete = async (pin: string) => {
    setPinSubmitting(true)
    setPinError(null)
    try {
      await loginWithPin(pin)
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Something went wrong.')
      setPinSubmitting(false)
      setPinResetSignal((prev) => prev + 1)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
            <img src={logo} alt="Kaix Customs logo" className="size-full object-contain" />
          </span>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Kaix Customs
          </h1>
          <p className="text-xs text-slate-500">Sign in to the shop floor dashboard</p>
        </div>

        <div className="mt-5 flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button type="button" onClick={() => switchTab('password')} className={tabButtonClass(tab === 'password')}>
            <KeyRound className="size-3.5" />
            Email &amp; Password
          </button>
          <button type="button" onClick={() => switchTab('pin')} className={tabButtonClass(tab === 'pin')}>
            <Hash className="size-3.5" />
            6-Digit PIN
          </button>
        </div>

        {tab === 'password' ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="login-email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Sign In
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs text-slate-500">Enter your 6-digit PIN</p>
            <PinInput key={pinResetSignal} disabled={pinSubmitting} onComplete={handlePinComplete} />

            {pinSubmitting && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" />
                Checking...
              </p>
            )}
            {pinError && (
              <p className="text-center text-xs text-red-600 dark:text-red-400">{pinError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
