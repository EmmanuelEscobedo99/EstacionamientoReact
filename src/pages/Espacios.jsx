import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import '../components/CrudPage.css'
import '../components/forms.css'

const TIPOS = ['AUTO', 'MOTO', 'CAMIONETA', 'DISCAPACITADO']

const emptyForm = {
  numero: '',
  tipo: 'AUTO',
  disponible: true,
  codeEstacionamiento: '',
}

function tipoBadge(tipo) {
  const map = {
    AUTO: 'badge-blue',
    MOTO: 'badge-warning',
    CAMIONETA: 'badge-gray',
    DISCAPACITADO: 'badge-success',
  }
  return <span className={`badge ${map[tipo] || 'badge-gray'}`}>{tipo}</span>
}

export default function Espacios() {
  const [items, setItems] = useState([])
  const [estacionamientos, setEstacionamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [espRes, estRes] = await Promise.all([
        api.get('/espacio'),
        api.get('/estacionamiento'),
      ])
      setItems(espRes.data)
      setEstacionamientos(estRes.data)
      if (estRes.data.length > 0 && !form.codeEstacionamiento) {
        setForm((f) => ({ ...f, codeEstacionamiento: estRes.data[0].codeEstacionamiento }))
      }
    } catch {
      setError('No fue posible cargar los espacios.')
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
    setForm({
      ...emptyForm,
      codeEstacionamiento: estacionamientos[0]?.codeEstacionamiento || '',
    })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      numero: item.numero || '',
      tipo: item.tipo || 'AUTO',
      disponible: item.disponible,
      codeEstacionamiento: item.estacionamiento?.codeEstacionamiento || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        numero: form.numero,
        tipo: form.tipo,
        disponible: form.disponible,
        estacionamiento: form.codeEstacionamiento
          ? { codeEstacionamiento: Number(form.codeEstacionamiento) }
          : null,
      }
      if (editing) {
        await api.put(`/espacio/${editing.codeEspacio}`, payload)
      } else {
        await api.post('/espacio', payload)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar el espacio.')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await api.delete(`/espacio/${confirmId}`)
      setConfirmId(null)
      load()
    } catch {
      setError('No fue posible ocultar el espacio.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Espacios</h1>
          <span>Gestión de espacios de estacionamiento</span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Espacio
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No hay espacios registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Número</th>
                <th>Tipo</th>
                <th>Disponible</th>
                <th>Estacionamiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.codeEspacio}>
                  <td>{e.codeEspacio}</td>
                  <td>{e.numero}</td>
                  <td>{tipoBadge(e.tipo)}</td>
                  <td>
                    {e.disponible ? (
                      <span className="badge badge-success">Disponible</span>
                    ) : (
                      <span className="badge badge-danger">Ocupado</span>
                    )}
                  </td>
                  <td>{e.estacionamiento?.nombre || '—'}</td>
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
                        onClick={() => setConfirmId(e.codeEspacio)}
                      >
                        Ocultar
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
        title={editing ? 'Editar Espacio' : 'Nuevo Espacio'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Número</label>
              <input
                name="numero"
                value={form.numero}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Estacionamiento</label>
            <select
              name="codeEstacionamiento"
              value={form.codeEstacionamiento}
              onChange={handleChange}
            >
              {estacionamientos.map((e) => (
                <option key={e.codeEstacionamiento} value={e.codeEstacionamiento}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group form-checkbox">
            <input
              type="checkbox"
              name="disponible"
              checked={form.disponible}
              onChange={handleChange}
            />
            <label>Disponible</label>
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

      <ConfirmDialog
        open={confirmId !== null}
        title="Ocultar espacio"
        message="El espacio se quitará de la interfaz, pero sus datos se conservarán en el Archivo para tus estadísticas. ¿Deseas continuar?"
        confirmLabel="Ocultar"
        tone="danger"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
