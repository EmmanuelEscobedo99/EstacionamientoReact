import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'
import NotificationBell from './NotificationBell'
import './Layout.css'

const ROL_LABELS = {
  ADMIN: 'Administrador',
  EMPLEADO: 'Empleado',
  CLIENTE: 'Cliente',
  USER: 'Usuario',
}

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: 'home', end: true, roles: ['ADMIN', 'EMPLEADO', 'USER'] },
  { to: '/estacionamiento', label: 'Mapa', icon: 'map', roles: ['ADMIN', 'EMPLEADO', 'CLIENTE'] },
  { to: '/estacionamientos', label: 'Estacionamientos', icon: 'building', roles: ['ADMIN', 'EMPLEADO'] },
  { to: '/espacios', label: 'Espacios', icon: 'grid', roles: ['ADMIN', 'EMPLEADO'] },
  { to: '/vehiculos', label: 'Vehículos', icon: 'car', roles: ['ADMIN', 'CLIENTE'] },
  { to: '/entradas', label: 'Entradas / Salidas', icon: 'clock', roles: ['ADMIN', 'EMPLEADO', 'CLIENTE'] },
  { to: '/pagos', label: 'Pagos', icon: 'card', roles: ['ADMIN', 'CLIENTE'] },
  { to: '/salida-qr', label: 'Cobrar por QR', icon: 'qr', roles: ['ADMIN', 'EMPLEADO'] },
  { to: '/mi-cuenta', label: 'Mi cuenta', icon: 'wallet', roles: ['ADMIN', 'CLIENTE'] },
  { to: '/usuarios', label: 'Usuarios', icon: 'users', roles: ['ADMIN'] },
  { to: '/archivo', label: 'Archivo', icon: 'archive', roles: ['ADMIN', 'EMPLEADO'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link'

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.rol))
  const initials = String(user.email || 'U')[0].toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Icon name="car" size={22} />
          </div>
          <div className="brand-text">
            <strong>Estacionamiento</strong>
            <span>Sistema de gestión</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section">Menú</p>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {(user.rol === 'EMPLEADO' || user.rol === 'ADMIN') && <NotificationBell />}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <strong>{user.email}</strong>
              <span>{ROL_LABELS[user.rol] || user.rol}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <Icon name="logout" size={17} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}