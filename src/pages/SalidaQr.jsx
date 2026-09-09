import { useEffect, useState } from 'react'
import api from '../api/axios'
import './SalidaQr.css'

const METODOS = ['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'MONEDERO']

export default function SalidaQr() {
  const [codigo, setCodigo] = useState('')
  const [entrada, setEntrada] = useState(null)
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const minutos = entrada
    ? ((now - Date.parse(entrada.fechaEntrada)) / 60000)
    : 0

  const montoCalculado = () => {
    if (!entrada) return ''
    const tarifa = Number(entrada.espacio?.estacionamiento?.tarifaHora) || 0
    const horas = Math.max(0.25, minutos / 60)
    return (tarifa * horas).toFixed(2)
  }

  const buscar = async () => {
    setError('')
    setSuccess('')
    if (!codigo.trim()) {
      setError('Ingresa el código QR de la entrada.')
      return
    }
    setBusy(true)
    setEntrada(null)
    try {
      const { data } = await api.post('/entradaSalida/buscar-por-qr', { codigoQr: codigo.trim() })
      setEntrada(data)
      setMonto('')
    } catch {
      setEntrada(null)
      setMonto('')
      setError('No fue posible encontrar una entrada con ese código QR.')
    } finally {
      setBusy(false)
    }
  }

  const cobrar = async () => {
    setError('')
    setSuccess('')
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido.')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/entradaSalida/pagar-por-qr', {
        codigoQr: entrada.qrCode,
        monto: montoNum,
        metodoPago: metodo,
      })
      setSuccess(
        `Pago de $${data.monto} con ${data.metodoPago} registrado correctamente.`
      )
      setEntrada(null)
      setCodigo('')
      setMonto('')
    } catch {
      setError('No fue posible registrar el pago. Verifica el código y el método.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="salidaqr">
      <div className="salidaqr-header">
        <div>
          <h1>Cobrar por QR</h1>
          <span>Busca la estancia con el código QR del cliente</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="salidaqr-buscar">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar() }}
          placeholder="Escanea o teclea el código QR"
        />
        <button className="btn btn-primary" onClick={buscar} disabled={busy}>
          {busy ? 'Buscando...' : 'Buscar entrada'}
        </button>
      </section>

      {entrada && (
        <section className="salidaqr-result">
          <div className="salidaqr-info">
            <p><strong>Vehículo:</strong> {entrada.vehiculo?.placas || '—'} {entrada.vehiculo?.marca ? `(${entrada.vehiculo.marca})` : ''}</p>
            <p><strong>Lugar:</strong> {entrada.espacio?.numero || '—'} · {entrada.espacio?.estacionamiento?.nombre || ''}</p>
            <p><strong>Entrada:</strong> {new Date(entrada.fechaEntrada).toLocaleString()}</p>
            <p><strong>Monto calculado:</strong> ${montoCalculado()}</p>
            {entrada.vehiculo?.usuario?.email && (
              <p><strong>Propietario:</strong> {entrada.vehiculo.usuario.email}</p>
            )}
          </div>

          <div className="salidaqr-pago">
            <div className="form-group">
              <label>Monto a cobrar</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder={montoCalculado()}
              />
            </div>
            <div className="form-group">
              <label>Método de pago</label>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="salidaqr-actions">
              <button className="btn btn-secondary" onClick={() => setEntrada(null)} disabled={busy}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={cobrar} disabled={busy || !monto}>
                Cobrar ${monto || montoCalculado()}
              </button>
            </div>
            {metodo === 'MONEDERO' && !entrada.vehiculo?.usuario && (
              <span className="salidaqr-warn">
                Este vehículo no pertenece a un cliente con monedero.
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}