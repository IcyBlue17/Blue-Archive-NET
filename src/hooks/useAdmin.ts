import { useCallback, useEffect, useState } from 'react'
import { getAdminStatus } from '../api/admin/status'
import { isLoggedIn } from '../api/client'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async () => {
    if (!isLoggedIn()) {
      setIsAdmin(false)
      setUsername(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await getAdminStatus()
      setIsAdmin(!!s.isAdmin)
      setUsername(s.username)
    } catch (e) {
      setIsAdmin(false)
      setUsername(null)
      setError(e instanceof Error ? e.message : 'Forbidden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  return { isAdmin, username, loading, error, recheck: check }
}
