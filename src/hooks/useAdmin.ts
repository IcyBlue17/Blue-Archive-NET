import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminStatus } from '../api/admin/status'
import { isLoggedIn } from '../api/client'
import { qk } from '../lib/query'

export function useAdmin() {
  const qc = useQueryClient()
  const loggedIn = isLoggedIn()

  const statusQuery = useQuery({
    queryKey: qk.adminStatus,
    enabled: loggedIn,
    queryFn: () => getAdminStatus(),
  })

  const check = useCallback(async () => {
    if (!loggedIn) {
      await qc.cancelQueries({ queryKey: qk.adminStatus })
      qc.removeQueries({ queryKey: qk.adminStatus })
      return { isAdmin: false, username: null }
    }
    return qc.fetchQuery({
      queryKey: qk.adminStatus,
      queryFn: () => getAdminStatus(),
    })
  }, [loggedIn, qc])

  return {
    isAdmin: loggedIn ? !!statusQuery.data?.isAdmin : false,
    username: loggedIn ? statusQuery.data?.username ?? null : null,
    loading: loggedIn ? statusQuery.isPending : false,
    error: statusQuery.error instanceof Error ? statusQuery.error.message : statusQuery.error ? 'Forbidden' : null,
    recheck: check,
  }
}
