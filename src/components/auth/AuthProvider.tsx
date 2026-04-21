
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AquaNetUser } from '../../lib/types'
import { clearToken, isLoggedIn, syncImageJwtCookie } from '../../api/client'
import { qk } from '../../lib/query'
import * as userApi from '../../api/user'

type AuthCtx = {
  user: AquaNetUser | null
  loading: boolean
  refresh: () => Promise<AquaNetUser | null>
  logout: () => void
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [authVer, setAuthVer] = useState(0)
  const loggedIn = isLoggedIn()

  const meQuery = useQuery<AquaNetUser | null>({
    queryKey: qk.me,
    enabled: loggedIn,
    queryFn: async () => userApi.me(),
  })

  useEffect(() => {
    syncImageJwtCookie()
  }, [authVer, loggedIn])

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
      await qc.cancelQueries({ queryKey: qk.me })
      qc.removeQueries({ queryKey: qk.me })
      setAuthVer((v) => v + 1)
      return null
    }
    setAuthVer((v) => v + 1)
    return qc.fetchQuery({
      queryKey: qk.me,
      queryFn: async () => userApi.me(),
    })
  }, [qc])

  const logout = useCallback(() => {
    clearToken()
    qc.clear()
    setAuthVer((v) => v + 1)
    window.location.href = '/login'
  }, [qc])

  const value = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: loggedIn ? meQuery.isPending : false,
      refresh,
      logout,
      isLoggedIn: loggedIn,
    }),
    [meQuery.data, meQuery.isPending, refresh, logout, loggedIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
