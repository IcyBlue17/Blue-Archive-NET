import { Navigate, Outlet } from 'react-router-dom'
import { useAdmin } from '@/hooks/useAdmin'
import { useAppTexts } from '@/content/texts'
import { Spin } from 'antd'
import { Text } from '@/components/ui/Text'

export function AdminGuard() {
  const { isAdmin, loading, error } = useAdmin()
  const texts = useAppTexts()

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8">
        <Spin />
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
