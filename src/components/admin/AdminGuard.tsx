import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '@cloudflare/kumo/components/loader'
import { Text } from '@cloudflare/kumo/components/text'
import { useAdmin } from '../../hooks/useAdmin'
import { useAppTexts } from '../../content/texts'

export function AdminGuard() {
  const { isAdmin, loading, error } = useAdmin()
  const texts = useAppTexts()

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8">
        <Loader />
        <Text>{texts.admin.checking}</Text>
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
