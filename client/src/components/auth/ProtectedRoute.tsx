import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import LoginPage from './LoginPage'

interface ProtectedRouteProps {
  children: ReactNode
}

// This app has no client-side router (no URL-based views), so "redirect to
// /login" becomes "render LoginPage in place of the app" — same practical
// effect of blocking access until signed in, adapted to how App.tsx already
// switches views via state rather than a route.
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <>{children}</>
}

export default ProtectedRoute
