import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const ROLES = ['CLIENTE', 'EMPLEADO', 'ADMIN', 'USER']

export default function Register() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'CLIENTE',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
        telefono: form.telefono,
        rol: form.rol,
      }
      await register(payload)
      navigate('/')
    } catch (err) {
      const msg = err?.response?.data || 'No fue posible registrar el usuario.'
      setError(typeof msg === 'string' ? msg : 'Error al registrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <h1>Crear cuenta</h1>
        <p>Registro de usuario</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select name="rol" value={form.rol} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Registrarse'}
          </button>
        </form>
        <div className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  )
}
