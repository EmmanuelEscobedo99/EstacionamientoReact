import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [est, esp, veh, ent, pago] = await Promise.allSettled([
          api.get('/estacionamiento'),
          api.get('/espacio'),
          api.get('/vehiculo'),
          api.get('/entradaSalida'),
          api.get('/pago'),
        ])
        setStats({
          estacionamientos: est.status === 'fulfilled' ? est.value.data.length : 0,
          espacios: esp.status === 'fulfilled' ? esp.value.data.length : 0,
          vehiculos: veh.status === 'fulfilled' ? veh.value.data.length : 0,
          entradas: ent.status === 'fulfilled' ? ent.value.data.length : 0,
          pagos: pago.status === 'fulfilled' ? pago.value.data.length : 0,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="loading">Cargando estadísticas...</div>
  }

  return (
    <div className="dashboard">
      <h1>Bienvenido, {user.email}</h1>
      <p className="dashboard-subtitle">Resumen del sistema de estacionamiento</p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.estacionamientos}</span>
          <span className="stat-label">Estacionamientos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.espacios}</span>
          <span className="stat-label">Espacios</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.vehiculos}</span>
          <span className="stat-label">Vehículos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.entradas}</span>
          <span className="stat-label">Entradas/Salidas</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.pagos}</span>
          <span className="stat-label">Pagos</span>
        </div>
      </div>

      <div className="dashboard-info">
        <h2>Rol de acceso</h2>
        <p>
          Tu rol actual es <strong>{user.rol}</strong>. Las opciones visibles en el
          menú dependen de los permisos asignados a este rol.
        </p>
      </div>
    </div>
  )
}
