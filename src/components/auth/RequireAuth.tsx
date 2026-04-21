import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../../api/client'

export function RequireAuth() {
  const loc = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  return <Outlet />
}
