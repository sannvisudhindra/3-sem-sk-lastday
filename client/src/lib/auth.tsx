import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { MOCK_ROLE, USE_MOCKS } from './config'
import { supabase } from './supabase'
import type { Role } from './types'

export interface AuthUser {
  id: string
  role: Role | null // null until a first-time Google user picks one
  username: string
  fullName: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signOut(): Promise<void>
}

const MOCK_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  role: MOCK_ROLE,
  username: `${MOCK_ROLE}1`,
  fullName: MOCK_ROLE === 'organiser' ? 'Olivia Organiser' : 'Chris Customer',
  email: `${MOCK_ROLE}1@encore.test`,
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(USE_MOCKS ? MOCK_USER : null)
  const [loading, setLoading] = useState(!USE_MOCKS)

  useEffect(() => {
    if (USE_MOCKS) return

    let cancelled = false
    async function load(hasSession: boolean) {
      if (!hasSession) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const me = await api.get<AuthUser>('/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => load(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(!!session)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    if (!USE_MOCKS) await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
