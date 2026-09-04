import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import '../components/CrudPage.css'
import '../components/forms.css'

const emptyForm = {
  nombre: '',
  direccion: '',
  ciudad: '',
  capacidadTotal: '',
  tarifaHora: '',
  activo: true,
}

export default function Estacionamientos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/estacionamiento')
      setItems(data)
    } catch {
      setError('No fue posible cargar los estacionamientos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
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
      direccion: item.direccion || '',
      ciudad: item.ciudad || '',
      capacidadTotal: item.capacidadTotal ?? '',
      tarifaHora: item.tarifaHora ?? '',
      activo: item.activo,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        capacidadTotal: Number(form.capacidadTotal),
        tarifaHora: Number(form.tarifaHora),
      }
      if (editing) {
        await api.put(`/estacionamiento/${editing.codeEstacionamiento}`, payload)
      } else {
        await api.post('/estacionamiento', payload)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar el estacionamiento.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este estacionamiento?')) return
    try {
      await api.delete(`/estacionamiento/${id}`)
      load()
    } catch {
      setError('No fue posible eliminar el estacionamiento.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Estacionamientos</h1>
          <span>Gestión de estacionamientos</span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Estacionamiento
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No hay estacionamientos registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Ciudad</th>
                <th>Capacidad</th>
                <th>Tarifa/hora</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.codeEstacionamiento}>
                  <td>{e.codeEstacionamiento}</td>
                  <td>{e.nombre}</td>
                  <td>{e.direccion || '—'}</td>
                  <td>{e.ciudad || '—'}</td>
                  <td>{e.capacidadTotal}</td>
                  <td>${e.tarifaHora}</td>
                  <td>
                    {e.activo ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => openEdit(e)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(e.codeEstacionamiento)}
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
        title={editing ? 'Editar Estacionamiento' : 'Nuevo Estacionamiento'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
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
            <label>Dirección</label>
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Ciudad</label>
            <input
              name="ciudad"
              value={form.ciudad}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacidad total</label>
              <input
                type="number"
                name="capacidadTotal"
                value={form.capacidadTotal}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Tarifa por hora</label>
              <input
                type="number"
                step="0.01"
                name="tarifaHora"
                value={form.tarifaHora}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group form-checkbox">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleChange}
            />
            <label>Activo</label>
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
