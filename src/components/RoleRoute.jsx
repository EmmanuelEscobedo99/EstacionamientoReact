import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ roles }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
