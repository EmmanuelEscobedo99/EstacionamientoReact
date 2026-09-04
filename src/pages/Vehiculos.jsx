import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import '../components/CrudPage.css'
import '../components/forms.css'

const emptyForm = {
  placas: '',
  marca: '',
  modelo: '',
  color: '',
  tipo: '',
  codeUsuario: '',
}

export default function Vehiculos() {
  const [items, setItems] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [vehRes, usrRes] = await Promise.all([
        api.get('/vehiculo'),
        api.get('/usuarios'),
      ])
      setItems(vehRes.data)
      setUsuarios(usrRes.data)
    } catch {
      setError('No fue posible cargar los vehículos.')
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
    setForm({ ...emptyForm, codeUsuario: usuarios[0]?.codeUsuario || '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      placas: item.placas || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      color: item.color || '',
      tipo: item.tipo || '',
      codeUsuario: item.usuario?.codeUsuario || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        placas: form.placas,
        marca: form.marca,
        modelo: form.modelo,
        color: form.color,
        tipo: form.tipo,
        usuario: form.codeUsuario
          ? { codeUsuario: Number(form.codeUsuario) }
          : null,
      }
      if (editing) {
        await api.put(`/vehiculo/${editing.codeVehiculo}`, payload)
      } else {
        await api.post('/vehiculo', payload)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar el vehículo.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este vehículo?')) return
    try {
      await api.delete(`/vehiculo/${id}`)
      load()
    } catch {
      setError('No fue posible eliminar el vehículo.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Vehículos</h1>
          <span>Gestión de vehículos registrados</span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Vehículo
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No hay vehículos registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Placas</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Color</th>
                <th>Tipo</th>
                <th>Propietario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.codeVehiculo}>
                  <td>{v.codeVehiculo}</td>
                  <td>{v.placas}</td>
                  <td>{v.marca || '—'}</td>
                  <td>{v.modelo || '—'}</td>
                  <td>{v.color || '—'}</td>
                  <td>{v.tipo || '—'}</td>
                  <td>{v.usuario?.email || '—'}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => openEdit(v)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(v.codeVehiculo)}
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
        title={editing ? 'Editar Vehículo' : 'Nuevo Vehículo'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Placas</label>
            <input
              name="placas"
              value={form.placas}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Marca</label>
              <input
                name="marca"
                value={form.marca}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <input
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Color</label>
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                placeholder="Ej. Sedan"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Propietario</label>
            <select
              name="codeUsuario"
              value={form.codeUsuario}
              onChange={handleChange}
            >
              {usuarios.map((u) => (
                <option key={u.codeUsuario} value={u.codeUsuario}>
                  {u.email} ({u.nombre} {u.apellido})
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
