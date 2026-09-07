import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import '../components/CrudPage.css'
import '../components/forms.css'

const ESTADOS = ['ACTIVO', 'PAGADO', 'FINALIZADO', 'CANCELADO']

const emptyForm = {
  fechaEntrada: '',
  fechaSalida: '',
  horasConsumidas: '',
  totalPagar: '',
  estado: 'ACTIVO',
  codeVehiculo: '',
  codeEstacionamiento: '',
  codeEspacio: '',
}

function estadoBadge(estado) {
  const map = {
    ACTIVO: 'badge-success',
    PAGADO: 'badge-blue',
    FINALIZADO: 'badge-gray',
    CANCELADO: 'badge-danger',
  }
  return <span className={`badge ${map[estado] || 'badge-gray'}`}>{estado}</span>
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export default function EntradasSalidas() {
  const [items, setItems] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [espacios, setEspacios] = useState([])
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
      const [entRes, vehRes, espRes, estRes] = await Promise.all([
        api.get('/entradaSalida'),
        api.get('/vehiculo'),
        api.get('/espacio'),
        api.get('/estacionamiento'),
      ])
      setItems(entRes.data)
      setVehiculos(vehRes.data)
      setEspacios(espRes.data)
      setEstacionamientos(estRes.data)
    } catch {
      setError('No fue posible cargar las entradas/salidas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'codeEstacionamiento') {
      const first = espacios.find(
        (s) => s.estacionamiento?.codeEstacionamiento === Number(value)
      )
      setForm({
        ...form,
        codeEstacionamiento: value,
        codeEspacio: first?.codeEspacio || '',
      })
      return
    }
    setForm({ ...form, [name]: value })
  }

  const openCreate = () => {
    setEditing(null)
    const lot = estacionamientos[0]?.codeEstacionamiento || ''
    const first = espacios.find(
      (s) => s.estacionamiento?.codeEstacionamiento === Number(lot)
    )
    setForm({
      ...emptyForm,
      codeVehiculo: vehiculos[0]?.codeVehiculo || '',
      codeEstacionamiento: lot,
      codeEspacio: first?.codeEspacio || '',
    })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      fechaEntrada: item.fechaEntrada || '',
      fechaSalida: item.fechaSalida || '',
      horasConsumidas: item.horasConsumidas ?? '',
      totalPagar: item.totalPagar ?? '',
      estado: item.estado || 'ACTIVO',
      codeVehiculo: item.vehiculo?.codeVehiculo || '',
      codeEstacionamiento:
        item.espacio?.estacionamiento?.codeEstacionamiento || '',
      codeEspacio: item.espacio?.codeEspacio || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        fechaEntrada: form.fechaEntrada ? form.fechaEntrada : null,
        fechaSalida: form.fechaSalida ? form.fechaSalida : null,
        horasConsumidas: form.horasConsumidas !== ''
          ? Number(form.horasConsumidas)
          : null,
        totalPagar: form.totalPagar !== '' ? Number(form.totalPagar) : null,
        estado: form.estado,
        vehiculo: form.codeVehiculo
          ? { codeVehiculo: Number(form.codeVehiculo) }
          : null,
        espacio: form.codeEspacio
          ? { codeEspacio: Number(form.codeEspacio) }
          : null,
      }
      if (editing) {
        await api.put(`/entradaSalida/${editing.codeEntradaSalida}`, payload)
      } else {
        await api.post('/entradaSalida', payload)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar la entrada/salida.')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await api.delete(`/entradaSalida/${confirmId}`)
      setConfirmId(null)
      load()
    } catch {
      setError('No fue posible ocultar el registro.')
    }
  }

  const espaciosVisibles =
    form.codeEstacionamiento === '' || !estacionamientos.length
      ? espacios
      : espacios.filter(
        (e) =>
          e.estacionamiento?.codeEstacionamiento ===
          Number(form.codeEstacionamiento)
      )

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Entradas / Salidas</h1>
          <span>Registro de movimientos de vehículos</span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva Entrada
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No hay registros de entrada/salida.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Vehículo</th>
                <th>Estacionamiento</th>
                <th>Espacio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.codeEntradaSalida}>
                  <td>{e.codeEntradaSalida}</td>
                  <td>{formatDate(e.fechaEntrada)}</td>
                  <td>{formatDate(e.fechaSalida)}</td>
                  <td>{e.horasConsumidas ?? '—'}</td>
                  <td>{e.totalPagar != null ? `$${e.totalPagar}` : '—'}</td>
                  <td>{estadoBadge(e.estado)}</td>
                  <td>{e.vehiculo?.placas || '—'}</td>
                  <td></td>
                  <td>{e.espacio?.numero || '—'}</td>
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
                        onClick={() => setConfirmId(e.codeEntradaSalida)}
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
        title={editing ? 'Editar Entrada/Salida' : 'Nueva Entrada/Salida'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Fecha de entrada</label>
            <input
              type="datetime-local"
              name="fechaEntrada"
              value={form.fechaEntrada}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Fecha de salida</label>
            <input
              type="datetime-local"
              name="fechaSalida"
              value={form.fechaSalida}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Horas consumidas</label>
              <input
                type="number"
                step="0.5"
                name="horasConsumidas"
                value={form.horasConsumidas}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Total a pagar</label>
              <input
                type="number"
                step="0.01"
                name="totalPagar"
                value={form.totalPagar}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select name="estado" value={form.estado} onChange={handleChange}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Vehículo</label>
            <select
              name="codeVehiculo"
              value={form.codeVehiculo}
              onChange={handleChange}
            >
              {vehiculos.map((v) => (
                <option key={v.codeVehiculo} value={v.codeVehiculo}>
                  {v.placas} ({v.marca} {v.modelo})
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
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
            <div className="form-group">
              <label>Espacio</label>
              <select
                name="codeEspacio"
                value={form.codeEspacio}
                onChange={handleChange}
              >
                {espaciosVisibles.map((e) => (
                  <option key={e.codeEspacio} value={e.codeEspacio}>
                    {e.numero} ({e.tipo}) · {e.estacionamiento?.nombre || '—'}
                  </option>
                ))}
              </select>
            </div>
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
        title="Ocultar registro"
        message="La entrada/salida se quitará de la interfaz, pero sus datos se conservarán en el Archivo para tus estadísticas. ¿Deseas continuar?"
        confirmLabel="Ocultar"
        tone="danger"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
