import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'

export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'STAFF'
  createdAt: string
  updatedAt: string
}

interface AuthContextValue {
  user: AuthUser | null
  /** True only while the initial /auth/me check on page load is in flight. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithPin: (pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Any API call anywhere in the app that comes back 401 (cookie missing,
  // expired, or invalidated) drops straight back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get<AuthUser>('/auth/me')
      .then((profile) => {
        if (!cancelled) setUser(profile)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    const profile = await api.post<AuthUser>('/auth/login', { email, password })
    setUser(profile)
  }

  const loginWithPin = async (pin: string) => {
    const profile = await api.post<AuthUser>('/auth/login-pin', { pin })
    setUser(profile)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
