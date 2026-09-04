import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const ROL_LABELS = {
  ADMIN: 'Administrador',
  EMPLEADO: 'Empleado',
  CLIENTE: 'Cliente',
  USER: 'Usuario',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link'

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/">🅿️ Estacionamiento</Link>
        </div>
        <div className="navbar-links">
          <NavLink to="/" className={navLinkClass} end>
            Inicio
          </NavLink>
          {(user.rol === 'ADMIN' || user.rol === 'EMPLEADO' || user.rol === 'CLIENTE') && (
            <NavLink to="/estacionamiento" className={navLinkClass}>
              Mapa
            </NavLink>
          )}
          {(user.rol === 'ADMIN' || user.rol === 'EMPLEADO' || user.rol === 'CLIENTE') && (
            <NavLink to="/estacionamientos" className={navLinkClass}>
              Estacionamientos
            </NavLink>
          )}
          {(user.rol === 'ADMIN' || user.rol === 'EMPLEADO' || user.rol === 'CLIENTE') && (
            <NavLink to="/espacios" className={navLinkClass}>
              Espacios
            </NavLink>
          )}
          {(user.rol === 'ADMIN' || user.rol === 'CLIENTE') && (
            <NavLink to="/vehiculos" className={navLinkClass}>
              Vehículos
            </NavLink>
          )}
          {(user.rol === 'ADMIN' || user.rol === 'EMPLEADO' || user.rol === 'CLIENTE') && (
            <NavLink to="/entradas" className={navLinkClass}>
              Entradas/Salidas
            </NavLink>
          )}
          {(user.rol === 'ADMIN' || user.rol === 'CLIENTE') && (
            <NavLink to="/pagos" className={navLinkClass}>
              Pagos
            </NavLink>
          )}
          {user.rol === 'ADMIN' && (
            <NavLink to="/usuarios" className={navLinkClass}>
              Usuarios
            </NavLink>
          )}
        </div>
        <div className="navbar-user">
          <span className="user-name">
            {user.email}
            <span className="user-rol">{ROL_LABELS[user.rol] || user.rol}</span>
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
