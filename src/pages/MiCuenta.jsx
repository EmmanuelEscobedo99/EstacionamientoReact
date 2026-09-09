import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'
import QrCode from '../components/QrCode'
import { useAuth } from '../context/AuthContext'
import './MiCuenta.css'

function minutosBonitos(min) {
  const h = Math.floor(Math.abs(min) / 60)
  const m = Math.round(Math.abs(min) % 60)
  if (h <= 0) return `${m} min`
  return `${h} h ${m} min`
}

export default function MiCuenta() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recarga, setRecarga] = useState('')
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [w, e] = await Promise.all([
        api.get('/wallet'),
        api.get('/entradaSalida'),
      ])
      setWallet(w.data)
      setEntries(e.data)
    } catch {
      setError('No fue posible cargar la información de tu cuenta.')
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

  const esPagada = (entry) => entry.estado === 'PAGADO' || !!entry.pago

  const montoEstimado = (entry) => {
    const tarifa = Number(entry.espacio?.estacionamiento?.tarifaHora) || 0
    const minutos = ((now - Date.parse(entry.fechaEntrada)) / 60000)
    const horas = Math.max(0.25, minutos / 60)
    return (tarifa * horas).toFixed(2)
  }

  const misActivas = entries.filter(
    (e) =>
      !e.fechaSalida &&
      e.vehiculo?.usuario?.codeUsuario === user.codeUsuario
  )

  const recargar = async () => {
    const monto = Number(recarga)
    if (!monto || monto <= 0) {
      setError('Ingresa un monto válido para recargar.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await api.post('/wallet/recargar', { monto })
      setWallet(data)
      setRecarga('')
      setSuccess('Tu monedero fue recargado correctamente.')
    } catch {
      setError('No fue posible recargar tu monedero.')
    } finally {
      setSaving(false)
    }
  }

  const pagarConMonedero = async (entry) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/entradaSalida/${entry.codeEntradaSalida}/pagar-con-monedero`)
      const [w, e] = await Promise.all([
        api.get('/wallet'),
        api.get('/entradaSalida'),
      ])
      setWallet(w.data)
      setEntries(e.data)
      setSuccess('Pago registrado correctamente con tu monedero.')
    } catch {
      setError('No fue posible realizar el pago. Verifica tu saldo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading">Cargando tu cuenta...</div>
  }

  return (
    <div className="micuenta">
      <div className="micuenta-header">
        <div>
          <h1>Mi cuenta</h1>
          <span>Monedero y estancias a tu nombre</span>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="wallet-card">
        <div className="wallet-card-top">
          <div>
            <span className="wallet-label">Saldo disponible</span>
            <strong className="wallet-saldo">
              ${wallet ? wallet.saldo : '0.00'}
            </strong>
          </div>
          <span className="badge badge-success">ACTIVO</span>
        </div>
        <div className="wallet-recarga">
          <input
            type="number"
            min="1"
            step="1"
            value={recarga}
            onChange={(e) => setRecarga(e.target.value)}
            placeholder="Monto a recargar"
          />
          <button
            className="btn btn-primary"
            onClick={recargar}
            disabled={saving || !recarga}
          >
            Recargar monedero
          </button>
        </div>
        <p className="wallet-hint">
          Con tu saldo pagas tus estancias desde aquí o cuando el operador cobra
          tu QR en la salida.
        </p>
      </section>

      <section className="micuenta-section">
        <div className="micuenta-section-title">
          <h2>Mis estancias activas</h2>
          {misActivas.length === 0 && <span>No tienes estancias activas.</span>}
        </div>

        {misActivas.length > 0 && (
          <div className="micuenta-list">
            {misActivas.map((entry) => {
              const pagada = esPagada(entry)
              const minutos = ((now - Date.parse(entry.fechaEntrada)) / 60000)
              return (
                <div className={`estancia-card${pagada ? ' pagada' : ''}`} key={entry.codeEntradaSalida}>
                  <div className="estancia-info">
                    <div className="estancia-top">
                      <strong>{entry.vehiculo?.placas || '—'}</strong>
                      {pagada
                        ? <span className="badge badge-success">Pagada</span>
                        : <span className="badge badge-danger">Sin pago</span>}
                    </div>
                    <p>
                      {entry.espacio?.numero || '—'} ·{' '}
                      {entry.espacio?.estacionamiento?.nombre || ''}
                    </p>
                    <p>Entrada: {new Date(entry.fechaEntrada).toLocaleString()}</p>
                    <p>
                      Tiempo transcurrido:{' '}
                      <strong>{minutosBonitos(minutos)}</strong>
                    </p>
                    <p>
                      Total estimado:{' '}
                      <strong>${montoEstimado(entry)}</strong>
                    </p>
                    {!pagada && (
                      <button
                        className="btn btn-primary"
                        onClick={() => pagarConMonedero(entry)}
                        disabled={saving || Number(wallet?.saldo || 0) < Number(montoEstimado(entry))}
                      >
                        Pagar con monedero
                      </button>
                    )}
                  </div>
                  <div className="estancia-qr">
                    <span className="estancia-qr-label">Muestra este QR al salir</span>
                    {entry.qrCode ? (
                      <>
                        <QrCode value={entry.qrCode} size={140} />
                        <code className="estancia-qr-code">{entry.qrCode}</code>
                      </>
                    ) : (
                      <span className="estancia-qr-empty">Sin código QR</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}