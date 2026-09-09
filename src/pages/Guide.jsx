import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import OperacionModals from '../components/OperacionModals'
import { useAuth } from '../context/AuthContext'
import './Guide.css'

const TIPOS_VEH = ['AUTO', 'MOTO', 'CAMIONETA', 'SEDAN', 'SUV', 'OTRO']

function minutosBonitos(min) {
  const h = Math.floor(Math.abs(min) / 60)
  const m = Math.round(Math.abs(min) % 60)
  const negativo = min < 0 ? '-' : ''
  if (h <= 0) return `${negativo}${m} min`
  return `${negativo}${h} h ${m} min`
}

function estadoChip(pagado) {
  return pagado ? 'Pagado' : 'Sin pago'
}

export default function Guide() {
  const { user } = useAuth()
  const [lots, setLots] = useState([])
  const [spaces, setSpaces] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [entries, setEntries] = useState([])
  const [payments, setPayments] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)
  const [limpiando, setLimpiando] = useState(false)

  const [vehForm, setVehForm] = useState({
    placas: '', marca: '', modelo: '', color: '', tipo: 'AUTO', propietario: '',
  })

  const load = useCallback(async () => {
    try {
      const [l, s, v, e, p, r] = await Promise.all([
        api.get('/estacionamiento'),
        api.get('/espacio'),
        api.get('/vehiculo'),
        api.get('/entradaSalida'),
        api.get('/pago'),
        api.get('/reserva'),
      ])
      setLots(l.data)
      setSpaces(s.data)
      setVehicles(v.data)
      setEntries(e.data)
      setPayments(p.data)
      setReservas(r.data)
      setError('')
    } catch {
      setError('No fue posible cargar la información del sistema.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const activeEntries = entries.filter((e) => !e.fechaSalida)
  const closedEntries = entries.filter((e) => e.fechaSalida)
  const reservadaDe = (spaceId) =>
    reservas.some(
      (rx) => rx.estado === 'ACTIVA' && rx.espacio?.codeEspacio === spaceId
    )
  const freeSpaces = spaces.filter((s) => s.disponible && !reservadaDe(s.codeEspacio))
  const espaciosReservados = spaces.filter((s) => reservadaDe(s.codeEspacio)).length
  const paidIds = new Set(payments.map((p) => p.entradaSalida?.codeEntradaSalida))

  const esPagada = (entry) => paidIds.has(entry.codeEntradaSalida) || entry.estado === 'PAGADO'

  const datosActivo = (entry) => {
    const inicio = Date.parse(entry.fechaEntrada)
    const elapsedMin = ((now - inicio) / 60000).toFixed(0)
    const pago = payments.find((p) => p.entradaSalida?.codeEntradaSalida === entry.codeEntradaSalida)
    const tarifa = Number(entry.espacio?.estacionamiento?.tarifaHora) || 0
    const monto = Number(pago?.monto) || 0
    const pagado = esPagada(entry)
    let restMin = null
    if (pagado && tarifa > 0 && monto > 0) {
      const cubiertasMin = (monto / tarifa) * 60
      restMin = Math.round(cubiertasMin - Number(elapsedMin))
    }
    return { elapsedMin: Number(elapsedMin), monto, tarifa, pagado, restMin }
  }

  const openVehiculo = () => {
    setVehForm({
      placas: '', marca: '', modelo: '', color: '', tipo: 'AUTO',
      propietario: '',
    })
    setModal('vehiculo')
  }

  const openEntrada = () => setModal('entrada')

  const openSalida = (entry) => setModal(`salida:${entry.codeEntradaSalida}`)

  const openPago = (entry) => setModal(`pago:${entry.codeEntradaSalida}`)

  const limpiarInterfaz = async () => {
    setLimpiando(true)
    setError('')
    try {
      await api.post('/archivo/limpiar')
      setConfirmLimpiar(false)
      load()
    } catch {
      setError('No fue posible limpiar la interfaz.')
    } finally {
      setLimpiando(false)
    }
  }

  const guardarVehiculo = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/vehiculo', {
        placas: vehForm.placas,
        marca: vehForm.marca,
        modelo: vehForm.modelo,
        color: vehForm.color,
        tipo: vehForm.tipo,
        propietario: vehForm.propietario,
      })
      setModal(null)
      load()
    } catch {
      setError('No fue posible completar la operación.')
    } finally {
      setSaving(false)
    }
  }

  if (user.rol !== 'ADMIN') {
    return (
      <div className="guide">
        <div className="guide-empty">
          <h2>Solo el administrador opera el sistema</h2>
          <p>
            Los clientes y empleados hacen uso del estacionamiento; el registro y
            control lo realiza el administrador.
          </p>
          <Link to="/estacionamiento" className="btn btn-primary">
            Ver mapa de espacios
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading">Cargando panel...</div>
  }

  return (
    <div className="guide">
      <div className="guide-header">
        <div>
          <h1>Panel de operación</h1>
          <span>Control de vehículos dentro del estacionamiento</span>
        </div>
        <div className="guide-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setConfirmLimpiar(true)}
            disabled={closedEntries.length === 0 || limpiando}
          >
            Limpiar interfaz
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            Actualizar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="guide-stats">
        <div className="guide-stat">
          <strong>{activeEntries.length}</strong>
          <span>Vehículos dentro</span>
        </div>
        <div className="guide-stat">
          <strong>{freeSpaces.length}/{spaces.length}</strong>
          <span>Espacios libres</span>
        </div>
        <div className="guide-stat">
          <strong>{espaciosReservados}</strong>
          <span>Espacios reservados</span>
        </div>
        <div className="guide-stat">
          <strong>{activeEntries.filter((e) => !esPagada(e)).length}</strong>
          <span>Sin pagar</span>
        </div>
      </div>

      <div className="guide-actions">
        <button className="btn btn-primary" onClick={openVehiculo}>
          + Registrar vehículo
        </button>
        <button
          className="btn btn-primary"
          onClick={openEntrada}
          disabled={vehicles.length === 0 || freeSpaces.length === 0}
        >
          + Registrar entrada
        </button>
        {freeSpaces.length === 0 && spaces.length === 0 && (
          <Link to="/espacios" className="guide-hint-link">
            No hay espacios; créalos cuando quieras en Espacios
          </Link>
        )}
      </div>

      <section className="guide-section">
        <div className="guide-section-title">
          <h2>Vehículos en el estacionamiento ahora</h2>
          {activeEntries.length === 0 && <span>No hay vehículos dentro.</span>}
        </div>

        {activeEntries.length > 0 && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Lugar</th>
                  <th>Entrada</th>
                  <th>Tiempo transcurrido</th>
                  <th>Tiempo restante</th>
                  <th>Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeEntries.map((entry) => {
                  const d = datosActivo(entry)
                  const vencido = d.pagado && d.restMin !== null && d.restMin < 0
                  return (
                    <tr key={entry.codeEntradaSalida}>
                      <td>
                        <strong>{entry.vehiculo?.placas || '—'}</strong>{' '}
                        {entry.vehiculo?.marca ? `(${entry.vehiculo.marca})` : ''}
                      </td>
                      <td>
                        {entry.espacio?.numero || '—'} · {entry.espacio?.estacionamiento?.nombre || ''}
                      </td>
                      <td>{new Date(entry.fechaEntrada).toLocaleString()}</td>
                      <td className="guide-timer">{minutosBonitos(d.elapsedMin)}</td>
                      <td className={vencido ? 'guide-over' : 'guide-ok'}>
                        {d.pagado && d.restMin !== null
                          ? minutosBonitos(d.restMin)
                          : '— (sin pago)'}
                      </td>
                      <td>
                        {d.pagado
                          ? <span className="badge badge-success">{estadoChip(true)}</span>
                          : <span className="badge badge-danger">{estadoChip(false)}</span>}
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() => openSalida(entry)}
                          >
                            Salida
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openPago(entry)}
                            disabled={esPagada(entry)}
                          >
                            Cobrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {closedEntries.length > 0 && (
        <section className="guide-section">
          <div className="guide-section-title">
            <h2>Historial de estancias</h2>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Lugar</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Total</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {closedEntries.map((entry) => (
                  <tr key={entry.codeEntradaSalida}>
                    <td>{entry.vehiculo?.placas || '—'}</td>
                    <td>{entry.espacio?.numero || '—'}</td>
                    <td>{new Date(entry.fechaEntrada).toLocaleString()}</td>
                    <td>{new Date(entry.fechaSalida).toLocaleString()}</td>
                    <td>
                      {entry.totalPagar != null ? `$${entry.totalPagar}` : '—'}
                    </td>
                    <td>
                      {esPagada(entry)
                        ? <span className="badge badge-success">Pagado</span>
                        : <span className="badge badge-danger">Sin pago</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="guide-note">
        Estacionamientos y espacios son configurables desde sus pestañas cuando lo
        necesites; no bloquean el registro diario.
      </div>

      <OperacionModals
        modal={modal}
        setModal={setModal}
        lots={lots}
        spaces={freeSpaces}
        vehicles={vehicles}
        entries={entries}
        onSaved={load}
      />

      <Modal open={modal === 'vehiculo'} title="Registrar vehículo" onClose={() => setModal(null)}>
        <form onSubmit={(e) => { e.preventDefault(); guardarVehiculo() }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Placas</label>
            <input
              name="placas"
              value={vehForm.placas}
              onChange={(e) => setVehForm({ ...vehForm, placas: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Marca</label>
              <input
                name="marca"
                value={vehForm.marca}
                onChange={(e) => setVehForm({ ...vehForm, marca: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <input
                name="modelo"
                value={vehForm.modelo}
                onChange={(e) => setVehForm({ ...vehForm, modelo: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Color</label>
              <input
                name="color"
                value={vehForm.color}
                onChange={(e) => setVehForm({ ...vehForm, color: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                name="tipo"
                value={vehForm.tipo}
                onChange={(e) => setVehForm({ ...vehForm, tipo: e.target.value })}
              >
                {TIPOS_VEH.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Propietario</label>
            <input
              name="propietario"
              value={vehForm.propietario}
              onChange={(e) => setVehForm({ ...vehForm, propietario: e.target.value })}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmLimpiar}
        title="Limpiar interfaz"
        message={`Se ocultarán ${closedEntries.length} estancia(s) terminada(s) del panel (y sus pagos). Ningún dato se borra: todo queda en el Archivo para tus estadísticas. ¿Deseas continuar?`}
        confirmLabel="Limpiar"
        tone="primary"
        onCancel={() => setConfirmLimpiar(false)}
        onConfirm={limpiarInterfaz}
      />
    </div>
  )
}