import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Modal from '../components/Modal'
import OperacionModals from '../components/OperacionModals'
import { useAuth } from '../context/AuthContext'
import './EstacionamientoView.css'

const TIPO_LABELS = {
  AUTO: 'Auto',
  MOTO: 'Moto',
  CAMIONETA: 'Camioneta',
  DISCAPACITADO: 'Discapacitado',
}

const LIMITE_MIN = 120
const MINUTOS_OPCIONES = [5, 10, 15, 20, 30, 45, 60]

function tiempoRestante(formatoMin) {
  const m = Math.round(formatoMin)
  if (m < 0) return 'Vencido'
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`
}

export default function EstacionamientoView() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [spaces, setSpaces] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [entries, setEntries] = useState([])
  const [payments, setPayments] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(null)
  const [modal, setModal] = useState(null)
  const [ocupadoSpace, setOcupadoSpace] = useState(null)
  const [reservaSel, setReservaSel] = useState(null)
  const [libreSpace, setLibreSpace] = useState(null)
  const [reservaForm, setReservaForm] = useState(null)
  const [ocuparSel, setOcuparSel] = useState(null)
  const [pagoMetodo, setPagoMetodo] = useState('MONEDERO')
  const [tarjeta, setTarjeta] = useState({
    titular: '',
    numero: '',
    vence: '',
    cvv: '',
  })
  const [reservaVehId, setReservaVehId] = useState('')
  const [reservaMin, setReservaMin] = useState(15)
  const [ocuparVehId, setOcuparVehId] = useState('')
  const [now, setNow] = useState(Date.now())

  const load = async () => {
    setLoading(true)
    try {
      const [l, s, v, e, p, r] = await Promise.all([
        api.get('/estacionamiento'),
        api.get('/espacio'),
        api.get('/vehiculo'),
        api.get('/entradaSalida'),
        api.get('/pago'),
        api.get('/reserva'),
      ])
      setItems(l.data)
      setSpaces(s.data)
      setVehicles(v.data)
      setEntries(e.data)
      setPayments(p.data)
      setReservas(r.data)
      setError('')
    } catch {
      setError('No fue posible cargar los estacionamientos.')
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    try {
      const [s, r, e] = await Promise.all([
        api.get('/espacio'),
        api.get('/reserva'),
        api.get('/entradaSalida'),
      ])
      setSpaces(s.data)
      setReservas(r.data)
      setEntries(e.data)
      setError('')
    } catch {
      // mantener el estado anterior
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
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (items.length > 0 && items.every((i) => i.codeEstacionamiento !== selectedId)) {
      setSelectedId(items[0].codeEstacionamiento)
    }
  }, [items, selectedId])

  const selected = items.find((i) => i.codeEstacionamiento === selectedId)
  const espacios = selected ? selected.espacios || [] : []

  const reservaDe = (spaceId) => {
    const r = reservas.find(
      (x) =>
        x.estado === 'ACTIVA' &&
        x.espacio?.codeEspacio === spaceId &&
        Date.parse(x.fechaVencimiento) > now
    )
    return r || null
  }

  const reservados = espacios.filter((s) => reservaDe(s.codeEspacio)).length
  const libres = espacios.filter((s) => s.disponible && !reservaDe(s.codeEspacio)).length
  const ocupados = espacios.length - libres - reservados

  const activeEntries = entries.filter((e) => !e.fechaSalida)
  const paidIds = new Set(payments.map((p) => p.entradaSalida?.codeEntradaSalida))
  const esPagada = (entry) => paidIds.has(entry.codeEntradaSalida) || entry.estado === 'PAGADO'

  const entryDeEspacio = (spaceId) =>
    activeEntries.find((e) => e.espacio?.codeEspacio === spaceId)

  const misOcupados = new Set(
    activeEntries
      .filter((e) => e.vehiculo?.usuario?.codeUsuario === user.codeUsuario)
      .map((e) => e.espacio?.codeEspacio)
  )

  const misVehiculos = vehicles.filter((v) => v.usuario?.codeUsuario === user.codeUsuario)
  const vehiculosParaOcupar = user.rol === 'CLIENTE' ? misVehiculos : vehicles

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
    if (reservaDe(s.codeEspacio)) {
      setReservaSel({ space: s })
      return
    }
    if (s.disponible) {
      if (user.rol === 'CLIENTE') {
        setLibreSpace(s)
        return
      }
      setModal(`entrada:${selectedId}:${s.codeEspacio}`)
      return
    }
    setOcupadoSpace(s)
    setPagoMetodo('MONEDERO')
    setTarjeta({ titular: '', numero: '', vence: '', cvv: '' })
  }

  const crearReserva = async () => {
    setSaving('crear')
    setError('')
    try {
      await api.post('/reserva', {
        espacioId: reservaForm.codeEspacio,
        vehiculoId: reservaVehId ? Number(reservaVehId) : null,
        minutosVentana: Number(reservaMin),
      })
      setReservaForm(null)
      refresh()
    } catch (err) {
      setError(err.response?.data || 'No fue posible crear la reserva.')
    } finally {
      setSaving(null)
    }
  }

  const ocupar = async (reserva) => {
    setSaving(`reserva-${reserva.codeReserva}`)
    setError('')
    try {
      await api.post(`/reserva/${reserva.codeReserva}/ocupar`, {
        vehiculoId: ocuparVehId ? Number(ocuparVehId) : null,
      })
      setOcuparSel(null)
      setReservaSel(null)
      load()
    } catch (err) {
      setError(err.response?.data || 'No fue posible ocupar el espacio.')
    } finally {
      setSaving(null)
    }
  }

  const cancelarReserva = async (reserva) => {
    setSaving(`reserva-${reserva.codeReserva}`)
    setError('')
    try {
      await api.post(`/reserva/${reserva.codeReserva}/cancelar`)
      setReservaSel(null)
      refresh()
    } catch (err) {
      setError(err.response?.data || 'No fue posible cancelar la reserva.')
    } finally {
      setSaving(null)
    }
  }

  const entryOcupado = ocupadoSpace
    ? entryDeEspacio(ocupadoSpace.codeEspacio)
    : null
  const esMiEspacio =
    entryOcupado?.vehiculo?.usuario?.codeUsuario === user.codeUsuario

  const detalleMiEstancia = (entry) => {
    const inicio = Date.parse(entry.fechaEntrada)
    const fin = Date.now()
    const msec = Math.max(0, fin - inicio)
    const horas = Math.max(0.25, Math.round((msec / 3600000) * 100) / 100)
    const tarifa = Number(entry.espacio?.estacionamiento?.tarifaHora) || 0
    return {
      horasConsumidas: horas,
      totalPagar: tarifa > 0 ? Math.round(tarifa * horas * 100) / 100 : null,
    }
  }

  const cerrarYPagar = async (entry) => {
    if (!entry || !esMiEspacio) return
    setSaving(`pagar-${entry.codeEntradaSalida}`)
    setError('')
    try {
      const detalle = detalleMiEstancia(entry)
      const fechaSalida = new Date().toISOString()
      const monto = detalle.totalPagar != null ? detalle.totalPagar : 0
      if (pagoMetodo === 'MONEDERO') {
        await api.post(`/entradaSalida/${entry.codeEntradaSalida}/pagar-con-monedero`)
      } else {
        if (!tarjeta.titular.trim() || tarjeta.numero.trim().length < 12 || !tarjeta.vence || !tarjeta.cvv) {
          setError('Completa los datos de la tarjeta correctamente.')
          setSaving(null)
          return
        }
        await api.post('/pago', {
          monto,
          fechaPago: fechaSalida,
          metodoPago: pagoMetodo,
          entradaSalida: { codeEntradaSalida: entry.codeEntradaSalida },
        })
      }
      await api.put(`/entradaSalida/${entry.codeEntradaSalida}`, {
        fechaEntrada: entry.fechaEntrada,
        fechaSalida,
        horasConsumidas: detalle.horasConsumidas,
        totalPagar: monto,
        estado: 'PAGADO',
        vehiculo: entry.vehiculo?.codeVehiculo
          ? { codeVehiculo: entry.vehiculo.codeVehiculo }
          : null,
        espacio: entry.espacio?.codeEspacio
          ? { codeEspacio: entry.espacio.codeEspacio }
          : null,
      })
      setOcupadoSpace(null)
      load()
    } catch (err) {
      setError(err.response?.data || 'No fue posible cerrar y pagar la estancia.')
    } finally {
      setSaving(null)
    }
  }

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
                const resCount = (lot.espacios || []).filter((s) => reservaDe(s.codeEspacio)).length
                const free = (lot.espacios || []).filter(
                  (s) => s.disponible && !reservaDe(s.codeEspacio)
                ).length
                const occupied = total - free - resCount
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
                      {free} libres · {resCount} reservados · {occupied} ocupados
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
                  <span className="sv-counter reserved">Reservados: {reservados}</span>
                  <span className="sv-counter occupied">Ocupados: {ocupados}</span>
                  {user.rol === 'CLIENTE' && (
                    <span className="sv-counter mine">Tuyos: {misOcupados.size}</span>
                  )}
                  <span className="sv-counter total">Total: {espacios.length}</span>
                </div>
              </div>

              {espacios.length === 0 ? (
                <div className="empty-state">Este estacionamiento aún no tiene espacios.</div>
              ) : (
                <>
                  <p className="sv-hint">
                    Clic en un espacio libre para reservarlo o registrar una entrada; clic en uno
                    reservado para ocuparlo o ver su estado; clic en uno ocupado para registrar su
                    salida o pago. Cada estancia cuenta con 2 horas por defecto.
                  </p>
                  <div className="sv-grid">
                    {espacios.map((s) => {
                      const reserva = reservaDe(s.codeEspacio)
                      const esReservado = Boolean(reserva)
                      const entry = esReservado ? null : s.disponible ? null : entryDeEspacio(s.codeEspacio)
                      const esMio = s.disponible ? false : misOcupados.has(s.codeEspacio)
                      const restMin = entry
                        ? LIMITE_MIN - (now - Date.parse(entry.fechaEntrada)) / 60000
                        : null
                      const vencido = restMin !== null && restMin < 0
                      const resRestMin = reserva
                        ? (Date.parse(reserva.fechaVencimiento) - now) / 60000
                        : null
                      return (
                        <button
                          key={s.codeEspacio}
                          className={`sv-space ${esReservado ? 'reserved' : s.disponible ? 'free' : 'occupied'} ${esMio ? 'mine' : ''} ${saving === s.codeEspacio ? 'saving' : ''}`}
                          onClick={() => onClickEspacio(s)}
                          disabled={saving === s.codeEspacio}
                          title={
                            esReservado
                              ? `Reservado — vence en ${tiempoRestante(resRestMin)}`
                              : s.disponible
                                ? user.rol === 'CLIENTE'
                                  ? 'Libre — clic para reservar o entrar'
                                  : 'Libre — clic para registrar entrada'
                                : esMio
                                  ? `Tu espacio — queda ${restMin !== null ? tiempoRestante(restMin) : 'sin entrada'}`
                                  : `Ocupado — queda ${restMin !== null ? tiempoRestante(restMin) : 'sin entrada'}`
                          }
                        >
                          <span className="sv-space-num">{s.numero}</span>
                          <span className="sv-space-tipo">
                            {TIPO_LABELS[s.tipo] || s.tipo}
                          </span>
                          <span className={`sv-switch ${esReservado || s.disponible ? 'on' : 'off'}`}>
                            <span className="sv-switch-knob" />
                          </span>
                          <span className="sv-space-state">
                            {esReservado ? 'Reservado' : s.disponible ? 'Libre' : esMio ? 'Ocupado por ti' : 'Ocupado'}
                          </span>
                          {esReservado && resRestMin !== null && (
                            <span className="sv-space-time">
                              {tiempoRestante(resRestMin)}
                            </span>
                          )}
                          {!esReservado && !s.disponible && entry && (
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
        spaces={spaces.filter((s) => !reservaDe(s.codeEspacio))}
        vehicles={vehicles}
        entries={entries}
        onSaved={load}
      />

      {/* Espacio libre — cliente elige reservar o entrar */}
      <Modal
        open={libreSpace !== null}
        title={libreSpace ? `Espacio ${libreSpace.numero} libre` : ''}
        onClose={() => setLibreSpace(null)}
      >
        {libreSpace && (
          <>
            <p>Puedes apartar este espacio con una reserva, o entrar directamente sin reservarlo.</p>
            <p className="form-hint">
              Para reservar necesitas haber registrado el vehículo que usarás; la reserva
              solo te garantiza el lugar al llegar.
            </p>
            {user.rol === 'CLIENTE' && misVehiculos.length === 0 && (
              <div className="alert alert-warning">
                No tienes vehículos registrados. Para reservar, primero{' '}
                <Link to="/vehiculos">registra tu vehículo</Link>.
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setLibreSpace(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-edit"
                disabled={user.rol === 'CLIENTE' && misVehiculos.length === 0}
                onClick={() => {
                  const s = libreSpace
                  setLibreSpace(null)
                  setReservaForm(s)
                  setReservaVehId(misVehiculos[0]?.codeVehiculo ?? '')
                  setReservaMin(15)
                }}
              >
                Reservar espacio
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const s = libreSpace
                  setLibreSpace(null)
                  setModal(`entrada:${selectedId}:${s.codeEspacio}`)
                }}
              >
                Entrar ahora
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Escoger ventana y vehículo de la reserva */}
      <Modal
        open={reservaForm !== null}
        title={reservaForm ? `Reservar espacio ${reservaForm.numero}` : ''}
        onClose={() => setReservaForm(null)}
      >
        {reservaForm && (
          <form onSubmit={(e) => { e.preventDefault(); crearReserva() }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>Vehículo que ocupará el espacio</label>
              <select
                name="vehiculoReserva"
                value={reservaVehId}
                onChange={(e) => setReservaVehId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona tu vehículo
                </option>
                {misVehiculos.map((v) => (
                  <option key={v.codeVehiculo} value={v.codeVehiculo}>
                    {v.placas} ({v.marca} {v.modelo})
                  </option>
                ))}
              </select>
              <p className="form-hint">
                Si aún no tienes vehículos, <Link to="/vehiculos">regístralo primero</Link>{' '}
                y vuelve a reservar.
              </p>
            </div>
            <div className="form-group">
              <label>Ventana para ocuparlo</label>
              <select
                name="minutosReserva"
                value={reservaMin}
                onChange={(e) => setReservaMin(e.target.value)}
              >
                {MINUTOS_OPCIONES.map((m) => (
                  <option key={m} value={m}>{m} minutos</option>
                ))}
              </select>
              <p className="form-hint">
                Si no se ocupa en ese tiempo, el espacio vuelve a estar libre para cualquiera.
              </p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setReservaForm(null)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving !== null || !reservaVehId}
              >
                Reservar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Espacio reservado — ver estado, ocupar o cancelar */}
      <Modal
        open={reservaSel !== null}
        title={reservaSel ? `Espacio ${reservaSel.space.numero} reservado` : ''}
        onClose={() => setReservaSel(null)}
      >
        {reservaSel && (() => {
          const r = reservaDe(reservaSel.space.codeEspacio)
          if (!r) {
            return (
              <>
                <p>Este espacio ya no tiene una reserva vigente.</p>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setReservaSel(null)}>
                    Cerrar
                  </button>
                </div>
              </>
            )
          }
          const esClientePropietario =
            user.rol === 'CLIENTE' && r.usuario?.codeUsuario === user.codeUsuario
          const puedeOperar = user.rol !== 'CLIENTE' || esClientePropietario
          return (
            <>
              <p>
                Reservado por{' '}
                <strong>{r.usuario ? `${r.usuario.nombre || ''} ${r.usuario.apellido || ''}`.trim() : '—'}</strong>
                {r.usuario?.email ? ` (${r.usuario.email})` : ''} hasta las{' '}
                <strong>{new Date(r.fechaVencimiento).toLocaleTimeString()}</strong>.
              </p>
              <p className="form-hint">
                Vehículo:{' '}
                {r.vehiculo
                  ? `${r.vehiculo.placas} (${r.vehiculo.marca} ${r.vehiculo.modelo})`
                  : 'sin vehículo registrado'}
              </p>
              {puedeOperar && (
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setReservaSel(null)}>
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn btn-edit"
                    disabled={saving === `reserva-${r.codeReserva}`}
                    onClick={() => {
                      setReservaSel(null)
                      setOcuparSel(r)
                      setOcuparVehId(r.vehiculo?.codeVehiculo ?? '')
                    }}
                  >
                    Ocupar ahora
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={saving === `reserva-${r.codeReserva}`}
                    onClick={() => cancelarReserva(r)}
                  >
                    Cancelar reserva
                  </button>
                </div>
              )}
            </>
          )
        })()}
      </Modal>

      {/* Ocupar un espacio reservado */}
      <Modal
        open={ocuparSel !== null}
        title={ocuparSel ? `Ocupar espacio ${ocuparSel.espacio?.numero || ''}` : ''}
        onClose={() => setOcuparSel(null)}
      >
        {ocuparSel && (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <p>La reserva está vigente. Confirma el vehículo para registrar la entrada.</p>
            <div className="form-group">
              <label>Vehículo</label>
              <select
                name="vehiculoOcupar"
                value={ocuparVehId}
                onChange={(e) => setOcuparVehId(e.target.value)}
              >
                <option value="">Selecciona un vehículo</option>
                {vehiculosParaOcupar.map((v) => (
                  <option key={v.codeVehiculo} value={v.codeVehiculo}>
                    {v.placas} ({v.marca} {v.modelo})
                  </option>
                ))}
              </select>
            </div>
            {vehiculosParaOcupar.length === 0 && (
              <div className="alert alert-warning">
                No hay vehículos disponibles. {user.rol === 'CLIENTE'
                  ? <Link to="/vehiculos">Registra uno primero</Link>
                  : 'Registra o asigna un vehículo al cliente.'}
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOcuparSel(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ocuparVehId || saving === `reserva-${ocuparSel.codeReserva}`}
                onClick={() => ocupar(ocuparSel)}
              >
                Ocupar ahora
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={ocupadoSpace !== null}
        title={ocupadoSpace ? `Espacio ${ocupadoSpace.numero} ocupado` : ''}
        onClose={() => { setOcupadoSpace(null); setPagarMi(null); }}
      >
        {entryOcupado && esMiEspacio && !esPagada(entryOcupado) ? (
          (() => {
            const detalle = detalleMiEstancia(entryOcupado)
            return (
              <>
                {error && <div className="alert alert-error">{error}</div>}
                <p>
                  Tu estancia: <strong>{entryOcupado.vehiculo?.placas || 'tu vehículo'}</strong> desde{' '}
                  {new Date(entryOcupado.fechaEntrada).toLocaleString()}.
                </p>
                <p className="form-hint">
                  {detalle.horasConsumidas} h · Total a pagar:{' '}
                  {detalle.totalPagar != null ? `$${detalle.totalPagar}` : '—'}
                </p>
                <div className="form-group">
                  <label>Forma de pago</label>
                  <select
                    name="pagoMetodo"
                    value={pagoMetodo}
                    onChange={(e) => setPagoMetodo(e.target.value)}
                  >
                    <option value="MONEDERO">Monedero electrónico</option>
                    <option value="TARJETA_CREDITO">Tarjeta de crédito</option>
                    <option value="TARJETA_DEBITO">Tarjeta de débito</option>
                  </select>
                </div>
                {pagoMetodo !== 'MONEDERO' && (
                  <>
                    <div className="form-group">
                      <label>Nombre del titular</label>
                      <input
                        placeholder="Como aparece en la tarjeta"
                        value={tarjeta.titular}
                        onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Número de tarjeta</label>
                      <input
                        placeholder="16 dígitos"
                        maxLength={16}
                        value={tarjeta.numero}
                        onChange={(e) => setTarjeta({ ...tarjeta, numero: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Vencimiento</label>
                        <input
                          type="month"
                          value={tarjeta.vence}
                          onChange={(e) => setTarjeta({ ...tarjeta, vence: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          placeholder="3 o 4 dígitos"
                          maxLength={4}
                          value={tarjeta.cvv}
                          onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value.replace(/\D/g, '') })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setOcupadoSpace(null); setPagarMi(null); }}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving !== null}
                    onClick={() => cerrarYPagar(entryOcupado)}
                  >
                    {saving !== null ? 'Procesando...' : `Pagar y liberar${
                      detalle.totalPagar != null ? ` $${detalle.totalPagar}` : ''
                    }`}
                  </button>
                </div>
              </>
            )
          })()
        ) : entryOcupado ? (
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
              {user.rol !== 'CLIENTE' && (
                <>
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
                </>
              )}
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