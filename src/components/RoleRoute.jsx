import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ roles, children }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}
