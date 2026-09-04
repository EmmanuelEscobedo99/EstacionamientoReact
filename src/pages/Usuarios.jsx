import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import '../components/CrudPage.css'
import '../components/forms.css'

const ROLES = ['ADMIN', 'EMPLEADO', 'CLIENTE', 'USER']
const emptyForm = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  telefono: '',
  rol: 'CLIENTE',
}

function rolBadge(rol) {
  const map = {
    ADMIN: 'badge-danger',
    EMPLEADO: 'badge-warning',
    CLIENTE: 'badge-blue',
    USER: 'badge-gray',
  }
  return <span className={`badge ${map[rol] || 'badge-gray'}`}>{rol}</span>
}

export default function Usuarios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/usuarios')
      setItems(data)
    } catch {
      setError('No fue posible cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      nombre: item.nombre || '',
      apellido: item.apellido || '',
      email: item.email || '',
      password: '',
      telefono: item.telefono || '',
      rol: item.rol || 'CLIENTE',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.put(`/usuarios/${editing.codeUsuario}`, payload)
      } else {
        await api.post('/usuarios', form)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar el usuario.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return
    try {
      await api.delete(`/usuarios/${id}`)
      load()
    } catch {
      setError('No fue posible eliminar el usuario.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Usuarios</h1>
          <span>Gestión de usuarios del sistema</span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Usuario
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No hay usuarios registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.codeUsuario}>
                  <td>{u.codeUsuario}</td>
                  <td>{u.nombre} {u.apellido}</td>
                  <td>{u.email}</td>
                  <td>{u.telefono || '—'}</td>
                  <td>{rolBadge(u.rol)}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => openEdit(u)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(u.codeUsuario)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showModal}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
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
                required={!editing}
                placeholder={editing ? '(dejar en blanco para no cambiar)' : ''}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
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
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
