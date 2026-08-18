import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600" role="status">Restaurando sesión...</div>
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}
