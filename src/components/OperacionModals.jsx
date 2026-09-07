import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from './Modal'

const METODOS = ['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA']

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function entradaPayload(entry, overrides = {}) {
  return {
    fechaEntrada: entry.fechaEntrada,
    fechaSalida: entry.fechaSalida,
    horasConsumidas: entry.horasConsumidas ?? null,
    totalPagar: entry.totalPagar ?? null,
    estado: overrides.estado ?? entry.estado ?? 'ACTIVO',
    vehiculo: entry.vehiculo?.codeVehiculo ? { codeVehiculo: entry.vehiculo.codeVehiculo } : null,
    espacio: entry.espacio?.codeEspacio ? { codeEspacio: entry.espacio.codeEspacio } : null,
    ...overrides,
  }
}

export default function OperacionModals({
  modal,
  setModal,
  lots,
  spaces,
  vehicles,
  entries,
  onSaved,
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [entForm, setEntForm] = useState({
    codeVehiculo: '',
    codeEstacionamiento: '',
    codeEspacio: '',
    fechaEntrada: nowLocal(),
  })
  const [salForm, setSalForm] = useState({ fechaSalida: nowLocal() })
  const [pagForm, setPagForm] = useState({
    monto: '',
    metodoPago: 'EFECTIVO',
    fechaPago: nowLocal(),
  })

  const tipo = typeof modal === 'string' ? modal.split(':')[0] : null
  const entradaId = modal?.startsWith('entrada:') ? modal.split(':')[1] : null
  const espacioId = modal?.startsWith('entrada:') ? modal.split(':')[2] : null
  const salidaId = tipo === 'salida' ? Number(modal.split(':')[1]) : null
  const pagoId = tipo === 'pago' ? Number(modal.split(':')[1]) : null

  const freeSpaces = spaces.filter((s) => s.disponible)

  useEffect(() => {
    if (tipo === 'entrada') {
      const lotId = entradaId ? Number(entradaId) : lots[0]?.codeEstacionamiento || ''
      const delLote = freeSpaces.filter(
        (s) => s.estacionamiento?.codeEstacionamiento === Number(lotId)
      )
      setEntForm({
        codeVehiculo: vehicles[0]?.codeVehiculo || '',
        codeEstacionamiento: lotId,
        codeEspacio:
          (espacioId ? Number(espacioId) : delLote[0]?.codeEspacio) || '',
        fechaEntrada: nowLocal(),
      })
      setError('')
    } else if (tipo === 'pago') {
      const entry = entries.find((e) => e.codeEntradaSalida === pagoId)
      const tarifa = Number(entry?.espacio?.estacionamiento?.tarifaHora) || 0
      const horas = entry?.horasConsumidas || 1
      setPagForm({
        monto: tarifa > 0 ? (tarifa * horas).toFixed(2) : '',
        metodoPago: 'EFECTIVO',
        fechaPago: nowLocal(),
      })
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, tipo, entradaId, espacioId, salidaId, pagoId])

  const ejecutar = async () => {
    setSaving(true)
    setError('')
    try {
      if (tipo === 'entrada') {
        await api.post('/entradaSalida', {
          fechaEntrada: entForm.fechaEntrada,
          fechaSalida: null,
          horasConsumidas: null,
          totalPagar: null,
          estado: 'ACTIVO',
          vehiculo: entForm.codeVehiculo
            ? { codeVehiculo: Number(entForm.codeVehiculo) }
            : null,
          espacio: entForm.codeEspacio
            ? { codeEspacio: Number(entForm.codeEspacio) }
            : null,
        })
      } else if (tipo === 'salida') {
        const entry = entries.find((e) => e.codeEntradaSalida === salidaId)
        if (!entry) throw new Error('registro no encontrado')
        await api.put(`/entradaSalida/${salidaId}`, entradaPayload(entry, {
          fechaSalida: salForm.fechaSalida,
          estado: 'ACTIVO',
        }))
      } else if (tipo === 'pago') {
        const entry = entries.find((e) => e.codeEntradaSalida === pagoId)
        await api.post('/pago', {
          monto: Number(pagForm.monto),
          fechaPago: pagForm.fechaPago || null,
          metodoPago: pagForm.metodoPago,
          entradaSalida: { codeEntradaSalida: pagoId },
        })
        if (entry) {
          await api.put(`/entradaSalida/${pagoId}`, entradaPayload(entry, {
            estado: 'PAGADO',
          }))
        }
      }
      setModal(null)
      if (onSaved) onSaved()
    } catch {
      setError('No fue posible completar la operación.')
    } finally {
      setSaving(false)
    }
  }

  const opcionesEspacio = (() => {
    const list = freeSpaces.filter(
      (s) => s.estacionamiento?.codeEstacionamiento === Number(entForm.codeEstacionamiento)
    )
    if (espacioId && !list.some((o) => o.codeEspacio === Number(espacioId))) {
      const pre = spaces.find((s) => s.codeEspacio === Number(espacioId))
      if (pre) list.unshift(pre)
    }
    return list
  })()

  return (
    <>
      <Modal
        open={tipo === 'entrada'}
        title="Registrar entrada"
        onClose={() => setModal(null)}
      >
        <form onSubmit={(e) => { e.preventDefault(); ejecutar() }}>
          {error && <div className="alert alert-error">{error}</div>}
          {vehicles.length === 0 && (
            <div className="alert alert-warning">
              No hay vehículos registrados. Regístralo primero (desde el panel o Vehículos).
            </div>
          )}
          <div className="form-group">
            <label>Vehículo</label>
            <select
              name="codeVehiculo"
              value={entForm.codeVehiculo}
              onChange={(e) => setEntForm({ ...entForm, codeVehiculo: e.target.value })}
            >
              {vehicles.map((v) => (
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
                value={entForm.codeEstacionamiento}
                onChange={(e) => {
                  const lot = e.target.value
                  const first = freeSpaces.find(
                    (s) => s.estacionamiento?.codeEstacionamiento === Number(lot)
                  )
                  setEntForm({
                    ...entForm,
                    codeEstacionamiento: lot,
                    codeEspacio: first?.codeEspacio || '',
                  })
                }}
              >
                {lots.map((l) => (
                  <option key={l.codeEstacionamiento} value={l.codeEstacionamiento}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Espacio libre</label>
              <select
                name="codeEspacio"
                value={entForm.codeEspacio}
                onChange={(e) => setEntForm({ ...entForm, codeEspacio: e.target.value })}
              >
                {opcionesEspacio.map((s) => (
                  <option key={s.codeEspacio} value={s.codeEspacio}>
                    {s.numero} ({s.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Hora de entrada</label>
            <input
              type="datetime-local"
              name="fechaEntrada"
              value={entForm.fechaEntrada}
              onChange={(e) => setEntForm({ ...entForm, fechaEntrada: e.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || vehicles.length === 0}
            >
              Registrar entrada
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={tipo === 'salida'}
        title="Registrar salida"
        onClose={() => setModal(null)}
      >
        <form onSubmit={(e) => { e.preventDefault(); ejecutar() }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Hora de salida</label>
            <input
              type="datetime-local"
              name="fechaSalida"
              value={salForm.fechaSalida}
              onChange={(e) => setSalForm({ ...salForm, fechaSalida: e.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Registrar salida
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={tipo === 'pago'}
        title="Registrar pago"
        onClose={() => setModal(null)}
      >
        <form onSubmit={(e) => { e.preventDefault(); ejecutar() }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                step="0.01"
                name="monto"
                value={pagForm.monto}
                onChange={(e) => setPagForm({ ...pagForm, monto: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Método de pago</label>
              <select
                name="metodoPago"
                value={pagForm.metodoPago}
                onChange={(e) => setPagForm({ ...pagForm, metodoPago: e.target.value })}
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fecha de pago</label>
            <input
              type="datetime-local"
              name="fechaPago"
              value={pagForm.fechaPago}
              onChange={(e) => setPagForm({ ...pagForm, fechaPago: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Cobrar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}