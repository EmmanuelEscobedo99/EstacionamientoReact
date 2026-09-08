import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import OperacionModals from '../components/OperacionModals'
import './EstacionamientoView.css'

const TIPO_LABELS = {
  AUTO: 'Auto',
  MOTO: 'Moto',
  CAMIONETA: 'Camioneta',
  DISCAPACITADO: 'Discapacitado',
}

const LIMITE_MIN = 120

function tiempoRestante(formatoMin) {
  const m = Math.round(formatoMin)
  if (m < 0) return 'Vencido'
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`
}

export default function EstacionamientoView() {
  const [items, setItems] = useState([])
  const [spaces, setSpaces] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [entries, setEntries] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(null)
  const [modal, setModal] = useState(null)
  const [ocupadoSpace, setOcupadoSpace] = useState(null)
  const [now, setNow] = useState(Date.now())

  const load = async () => {
    setLoading(true)
    try {
      const [l, s, v, e, p] = await Promise.all([
        api.get('/estacionamiento'),
        api.get('/espacio'),
        api.get('/vehiculo'),
        api.get('/entradaSalida'),
        api.get('/pago'),
      ])
      setItems(l.data)
      setSpaces(s.data)
      setVehicles(v.data)
      setEntries(e.data)
      setPayments(p.data)
      setError('')
    } catch {
      setError('No fue posible cargar los estacionamientos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (items.length > 0 && items.every((i) => i.codeEstacionamiento !== selectedId)) {
      setSelectedId(items[0].codeEstacionamiento)
    }
  }, [items, selectedId])

  const selected = items.find((i) => i.codeEstacionamiento === selectedId)
  const espacios = selected ? selected.espacios || [] : []
  const libres = espacios.filter((s) => s.disponible).length
  const ocupados = espacios.length - libres

  const activeEntries = entries.filter((e) => !e.fechaSalida)
  const paidIds = new Set(payments.map((p) => p.entradaSalida?.codeEntradaSalida))
  const esPagada = (entry) => paidIds.has(entry.codeEntradaSalida) || entry.estado === 'PAGADO'

  const entryDeEspacio = (spaceId) =>
    activeEntries.find((e) => e.espacio?.codeEspacio === spaceId)

  const marcarLibre = async (space) => {
    setSaving(space.codeEspacio)
    setError('')
    try {
      await api.put(`/espacio/${space.codeEspacio}`, {
        numero: space.numero,
        tipo: space.tipo,
        disponible: true,
      })
      setOcupadoSpace(null)
      load()
    } catch {
      setError(`No se pudo liberar el espacio ${space.numero}.`)
    } finally {
      setSaving(null)
    }
  }

  const onClickEspacio = (s) => {
    if (s.disponible) {
      setModal(`entrada:${selectedId}:${s.codeEspacio}`)
      return
    }
    setOcupadoSpace(s)
  }

  const entryOcupado = ocupadoSpace
    ? entryDeEspacio(ocupadoSpace.codeEspacio)
    : null

  return (
    <div className="sv-page">
      <div className="sv-header">
        <div>
          <h1>Estacionamiento</h1>
          <span>Mapa de espacios en tiempo real</span>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No hay estacionamientos registrados.</div>
      ) : (
        <>
          <div className="sv-lots">
            {items
              .filter((lot) => lot.activo !== false || lot.activo === undefined)
              .map((lot) => {
                const total = (lot.espacios || []).length
                const free = (lot.espacios || []).filter((s) => s.disponible).length
                const occupied = total - free
                return (
                  <button
                    key={lot.codeEstacionamiento}
                    className={`sv-lot-card ${lot.codeEstacionamiento === selectedId ? 'selected' : ''}`}
                    onClick={() => setSelectedId(lot.codeEstacionamiento)}
                  >
                    <strong>{lot.nombre}</strong>
                    <span>
                      {lot.ciudad} · {lot.direccion}
                    </span>
                    <small>
                      {free} libres · {occupied} ocupados
                    </small>
                  </button>
                )
              })}
          </div>

          {selected && (
            <div className="sv-panel">
              <div className="sv-panel-head">
                <div>
                  <h2>{selected.nombre}</h2>
                  <span>
                    {selected.ciudad || ''} {selected.direccion ? `· ${selected.direccion}` : ''}
                  </span>
                </div>
                <div className="sv-counters">
                  <span className="sv-counter free">Libres: {libres}</span>
                  <span className="sv-counter occupied">Ocupados: {ocupados}</span>
                  <span className="sv-counter total">Total: {espacios.length}</span>
                </div>
              </div>

              {espacios.length === 0 ? (
                <div className="empty-state">Este estacionamiento aún no tiene espacios.</div>
              ) : (
                <>
                  <p className="sv-hint">
                    Clic en un espacio libre para registrar la entrada de un vehículo;
                    clic en uno ocupado para registrar su salida o pago. Cada estancia
                    cuenta con 2 horas por defecto.
                  </p>
                  <div className="sv-grid">
                    {espacios.map((s) => {
                      const entry = s.disponible ? null : entryDeEspacio(s.codeEspacio)
                      const restMin = entry
                        ? LIMITE_MIN - (now - Date.parse(entry.fechaEntrada)) / 60000
                        : null
                      const vencido = restMin !== null && restMin < 0
                      return (
                        <button
                          key={s.codeEspacio}
                          className={`sv-space ${s.disponible ? 'free' : 'occupied'} ${saving === s.codeEspacio ? 'saving' : ''}`}
                          onClick={() => onClickEspacio(s)}
                          disabled={saving === s.codeEspacio}
                          title={s.disponible
                            ? 'Libre — clic para registrar entrada'
                            : `Ocupado — queda ${restMin !== null ? tiempoRestante(restMin) : 'sin entrada'}`}
                        >
                          <span className="sv-space-num">{s.numero}</span>
                          <span className="sv-space-tipo">
                            {TIPO_LABELS[s.tipo] || s.tipo}
                          </span>
                          <span className={`sv-switch ${s.disponible ? 'on' : 'off'}`}>
                            <span className="sv-switch-knob" />
                          </span>
                          <span className="sv-space-state">
                            {s.disponible ? 'Libre' : 'Ocupado'}
                          </span>
                          {!s.disponible && entry && (
                            <span className={`sv-space-time ${vencido ? 'over' : ''}`}>
                              ⏱ {tiempoRestante(restMin)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <OperacionModals
        modal={modal}
        setModal={setModal}
        lots={items}
        spaces={spaces}
        vehicles={vehicles}
        entries={entries}
        onSaved={load}
      />

      <Modal
        open={ocupadoSpace !== null}
        title={ocupadoSpace ? `Espacio ${ocupadoSpace.numero} ocupado` : ''}
        onClose={() => setOcupadoSpace(null)}
      >
        {entryOcupado ? (
          <>
            <p>
              Ocupado por <strong>{entryOcupado.vehiculo?.placas || 'vehículo'}</strong>
              {entryOcupado.vehiculo?.marca ? ` (${entryOcupado.vehiculo.marca})` : ''} desde{' '}
              {new Date(entryOcupado.fechaEntrada).toLocaleString()}.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOcupadoSpace(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-edit"
                onClick={() => {
                  setOcupadoSpace(null)
                  setModal(`salida:${entryOcupado.codeEntradaSalida}`)
                }}
              >
                Registrar salida
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={esPagada(entryOcupado)}
                onClick={() => {
                  setOcupadoSpace(null)
                  setModal(`pago:${entryOcupado.codeEntradaSalida}`)
                }}
              >
                {esPagada(entryOcupado) ? 'Ya pagado' : 'Cobrar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              Este espacio está marcado como ocupado pero no tiene una entrada
              registrada. Puedes liberarlo manualmente.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOcupadoSpace(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => marcarLibre(ocupadoSpace)}
                disabled={saving === ocupadoSpace?.codeEspacio}
              >
                Marcar libre
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}