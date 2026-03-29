import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '@cloudflare/kumo/components/loader'
import { Text } from '@cloudflare/kumo/components/text'
import { useAdmin } from '../../hooks/useAdmin'

export function AdminGuard() {
  const { isAdmin, loading, error } = useAdmin()

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8">
        <Loader />
        <Text>检查管理员权限…</Text>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />
  }

  if (error && !isAdmin) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
