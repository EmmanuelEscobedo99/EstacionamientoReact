import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { SearchInput, Pagination } from '../components/ListTools'
import '../components/CrudPage.css'
import '../components/forms.css'

const PAGE_SIZE = 5
const METODOS = ['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA']

const emptyForm = {
  monto: '',
  fechaPago: '',
  metodoPago: 'EFECTIVO',
  codeEntradaSalida: '',
}

function metodoBadge(metodo) {
  const map = {
    EFECTIVO: 'badge-success',
    TARJETA_CREDITO: 'badge-blue',
    TARJETA_DEBITO: 'badge-warning',
    TRANSFERENCIA: 'badge-gray',
  }
  return <span className={`badge ${map[metodo] || 'badge-gray'}`}>{metodo}</span>
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export default function Pagos() {
  const { user } = useAuth()
  const editable = user.rol !== 'CLIENTE'

  const [items, setItems] = useState([])
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const [pagoRes, entRes] = await Promise.all([
        api.get('/pago'),
        api.get('/entradaSalida'),
      ])
      setItems(pagoRes.data)
      setEntradas(entRes.data)
    } catch {
      setError('No fue posible cargar los pagos.')
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
    setForm({
      ...emptyForm,
      codeEntradaSalida: entradas[0]?.codeEntradaSalida || '',
    })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      monto: item.monto ?? '',
      fechaPago: item.fechaPago || '',
      metodoPago: item.metodoPago || 'EFECTIVO',
      codeEntradaSalida: item.entradaSalida?.codeEntradaSalida || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        monto: Number(form.monto),
        fechaPago: form.fechaPago ? form.fechaPago : null,
        metodoPago: form.metodoPago,
        entradaSalida: form.codeEntradaSalida
          ? { codeEntradaSalida: Number(form.codeEntradaSalida) }
          : null,
      }
      if (editing) {
        await api.put(`/pago/${editing.codePago}`, payload)
      } else {
        await api.post('/pago', payload)
      }
      setShowModal(false)
      load()
    } catch {
      setError('No fue posible guardar el pago.')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await api.delete(`/pago/${confirmId}`)
      setConfirmId(null)
      load()
    } catch {
      setError('No fue posible ocultar el pago.')
    }
  }

  const pagoBuscar = (p) => [
    p.codePago,
    p.monto,
    p.fechaPago,
    p.metodoPago,
    p.entradaSalida?.codeEntradaSalida,
  ]

  const q = search.trim().toLowerCase()
  const filtered = q
    ? items.filter((p) =>
        pagoBuscar(p).some((f) => String(f ?? '').toLowerCase().includes(q)),
      )
    : items
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages)
  const shown = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Pagos</h1>
          <span>Gestión de pagos de estacionamiento</span>
        </div>
        {editable && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo Pago
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <div className="lt-toolbar">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
          <span className="lt-results">
            {filtered.length} de {items.length}
          </span>
        </div>
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {search ? 'Sin resultados para tu búsqueda.' : 'No hay pagos registrados.'}
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Entrada/Salida</th>
                  {editable && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                <tr key={p.codePago}>
                  <td>{p.codePago}</td>
                  <td>${p.monto}</td>
                  <td>{formatDate(p.fechaPago)}</td>
                  <td>{metodoBadge(p.metodoPago)}</td>
                  <td>{p.entradaSalida?.codeEntradaSalida || '—'}</td>
                  {editable && (
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-sm btn-edit"
                          onClick={() => openEdit(p)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setConfirmId(p.codePago)}
                        >
                          Ocultar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              </tbody>
            </table>
            <Pagination page={cur} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={showModal}
        title={editing ? 'Editar Pago' : 'Nuevo Pago'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                step="0.01"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Método de pago</label>
              <select
                name="metodoPago"
                value={form.metodoPago}
                onChange={handleChange}
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fecha de pago</label>
            <input
              type="datetime-local"
              name="fechaPago"
              value={form.fechaPago}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Entrada/Salida asociada</label>
            <select
              name="codeEntradaSalida"
              value={form.codeEntradaSalida}
              onChange={handleChange}
            >
              {entradas.map((e) => (
                <option key={e.codeEntradaSalida} value={e.codeEntradaSalida}>
                  #{e.codeEntradaSalida} - {e.estado}
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

      <ConfirmDialog
        open={confirmId !== null}
        title="Ocultar pago"
        message="El pago se quitará de la interfaz, pero sus datos se conservarán en el Archivo para tus estadísticas. ¿Deseas continuar?"
        confirmLabel="Ocultar"
        tone="danger"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
