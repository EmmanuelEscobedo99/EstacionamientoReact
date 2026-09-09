import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import Icon from './Icon'

function tipoLabel(tipo) {
  if (tipo === 'RESERVA') return 'Reserva'
  return tipo || 'Aviso'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  const load = async () => {
    try {
      const [list, counter] = await Promise.all([
        api.get('/notificacion'),
        api.get('/notificacion/contador'),
      ])
      setNotifications(list.data || [])
      setCount(counter.data || 0)
    } catch {
      // el backend podría no estar disponible; mantener el estado
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  const marcarLeidas = async () => {
    setLoading(true)
    try {
      await api.post('/notificacion/leer-todas')
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
      setCount(0)
    } catch {
      // mantener el estado
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="notif-box" ref={boxRef}>
      <button
        className="notif-btn"
        onClick={toggle}
        type="button"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Icon name="bell" size={18} />
        {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notificaciones</strong>
            <span>{count > 0 ? `${count} sin leer` : 'Todo al día'}</span>
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No hay notificaciones.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.codeNotificacion} className={`notif-item ${n.leida ? '' : 'unread'}`}>
                  <div className="notif-item-top">
                    <span className="notif-chip">{tipoLabel(n.tipo)}</span>
                    <span className="notif-date">
                      {new Date(n.fecha).toLocaleString()}
                    </span>
                  </div>
                  <p className="notif-msg">{n.mensaje}</p>
                </div>
              ))
            )}
          </div>
          <div className="notif-panel-foot">
            <button
              className="notif-mark"
              type="button"
              onClick={marcarLeidas}
              disabled={loading || count === 0}
            >
              Marcar todas como leídas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}