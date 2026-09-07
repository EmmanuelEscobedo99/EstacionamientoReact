import { useEffect, useState } from 'react'
import api from '../api/axios'
import ConfirmDialog from '../components/ConfirmDialog'
import '../components/CrudPage.css'
import './Archivo.css'

const TABS = [
  { key: 'vehiculos', label: 'Vehículos' },
  { key: 'entradas', label: 'Entradas/Salidas' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'espacios', label: 'Espacios' },
  { key: 'estacionamientos', label: 'Estacionamientos' },
  { key: 'usuarios', label: 'Usuarios' },
]

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
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

export default function Archivo() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('vehiculos')
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/archivo')
      setData(data)
      setError('')
    } catch {
      setError('No fue posible cargar el archivo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const restaurar = async () => {
    if (!confirm) return
    try {
      await api.put(`/archivo/restaurar?tipo=${confirm.tipo}&id=${confirm.id}`)
      setConfirm(null)
      load()
    } catch {
      setError('No fue posible restaurar el registro.')
    }
  }

  const stats = data?.estadisticas
  const statsCards = stats
    ? [
        { label: 'Ingresos totales', value: `$${stats.ingresosTotales}`, accent: true },
        { label: 'Pagos registrados', value: stats.totalPagos },
        { label: 'Entradas registradas', value: stats.totalEntradas },
        { label: 'Vehículos dentro (activos)', value: stats.entradasActivas },
        { label: 'Vehículos', value: stats.totalVehiculos },
        { label: 'Espacios', value: stats.totalEspacios },
        { label: 'Estacionamientos', value: stats.totalEstacionamientos },
        { label: 'Usuarios', value: stats.totalUsuarios },
      ]
    : []

  const visible = (key) => (data ? (data[key] || []) : [])

  return (
    <div className="page archivo-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Archivo y estadísticas</h1>
          <span>
            Registros ocultos de la interfaz + estadísticas generales. Nada se
            borra de verdad.
          </span>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando archivo...</div>
      ) : stats ? (
        <>
          <div className="archivo-stats">
            {statsCards.map((c) => (
              <div key={c.label} className={`archivo-stat ${c.accent ? 'archivo-stat-accent' : ''}`}>
                <strong>{c.value}</strong>
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="archivo-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`archivo-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}{' '}
                <span className="archivo-count">{visible(t.key).length}</span>
              </button>
            ))}
          </div>

          <div className="table-card">
            {tab === 'vehiculos' &&
              (visible('vehiculos').length === 0 ? (
                <div className="empty-state">Sin vehículos ocultos.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Placas</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Propietario</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible('vehiculos').map((v) => (
                      <tr key={v.codeVehiculo}>
                        <td>{v.codeVehiculo}</td>
                        <td>{v.placas}</td>
                        <td>{v.marca || '—'}</td>
                        <td>{v.modelo || '—'}</td>
                        <td>{v.usuario?.email || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({ tipo: 'vehiculo', id: v.codeVehiculo, nombre: v.placas })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {tab === 'entradas' &&
              (visible('entradas').length === 0 ? (
                <div className="empty-state">Sin entradas/salidas ocultas.</div>
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
                      <th>Espacio</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible('entradas').map((e) => (
                      <tr key={e.codeEntradaSalida}>
                        <td>{e.codeEntradaSalida}</td>
                        <td>{formatDate(e.fechaEntrada)}</td>
                        <td>{formatDate(e.fechaSalida)}</td>
                        <td>{e.horasConsumidas ?? '—'}</td>
                        <td>{e.totalPagar != null ? `$${e.totalPagar}` : '—'}</td>
                        <td>{estadoBadge(e.estado)}</td>
                        <td>{e.vehiculo?.placas || '—'}</td>
                        <td>{e.espacio?.numero || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({
                                tipo: 'entrada',
                                id: e.codeEntradaSalida,
                                nombre: `entrada #${e.codeEntradaSalida}`,
                              })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {tab === 'pagos' &&
              (visible('pagos').length === 0 ? (
                <div className="empty-state">Sin pagos ocultos.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Monto</th>
                      <th>Fecha</th>
                      <th>Método</th>
                      <th>Entrada</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible('pagos').map((p) => (
                      <tr key={p.codePago}>
                        <td>{p.codePago}</td>
                        <td>${p.monto}</td>
                        <td>{formatDate(p.fechaPago)}</td>
                        <td>{p.metodoPago}</td>
                        <td>{p.entradaSalida?.codeEntradaSalida || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({
                                tipo: 'pago',
                                id: p.codePago,
                                nombre: `pago #${p.codePago}`,
                              })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {tab === 'espacios' &&
              (visible('espacios').length === 0 ? (
                <div className="empty-state">Sin espacios ocultos.</div>
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
                    {visible('espacios').map((e) => (
                      <tr key={e.codeEspacio}>
                        <td>{e.codeEspacio}</td>
                        <td>{e.numero}</td>
                        <td>{e.tipo}</td>
                        <td>{e.disponible ? 'Sí' : 'No'}</td>
                        <td>{e.estacionamiento?.nombre || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({
                                tipo: 'espacio',
                                id: e.codeEspacio,
                                nombre: `espacio ${e.numero}`,
                              })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {tab === 'estacionamientos' &&
              (visible('estacionamientos').length === 0 ? (
                <div className="empty-state">Sin estacionamientos ocultos.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Ciudad</th>
                      <th>Capacidad</th>
                      <th>Tarifa/hora</th>
                      <th>Activo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible('estacionamientos').map((e) => (
                      <tr key={e.codeEstacionamiento}>
                        <td>{e.codeEstacionamiento}</td>
                        <td>{e.nombre}</td>
                        <td>{e.ciudad || '—'}</td>
                        <td>{e.capacidadTotal}</td>
                        <td>${e.tarifaHora}</td>
                        <td>{e.activo ? 'Sí' : 'No'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({
                                tipo: 'estacionamiento',
                                id: e.codeEstacionamiento,
                                nombre: e.nombre,
                              })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {tab === 'usuarios' &&
              (visible('usuarios').length === 0 ? (
                <div className="empty-state">Sin usuarios ocultos.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible('usuarios').map((u) => (
                      <tr key={u.codeUsuario}>
                        <td>{u.codeUsuario}</td>
                        <td>
                          {u.nombre || '—'} {u.apellido || ''}
                        </td>
                        <td>{u.email || '—'}</td>
                        <td>{u.rol}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() =>
                              setConfirm({
                                tipo: 'usuario',
                                id: u.codeUsuario,
                                nombre: u.email || `usuario #${u.codeUsuario}`,
                              })
                            }
                          >
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
          </div>
        </>
      ) : (
        <div className="empty-state">Sin datos de archivo.</div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title="Restaurar registro"
        message={
          confirm
            ? `El registro ${confirm.nombre} volverá a aparecer en la interfaz. ¿Deseas continuar?`
            : ''
        }
        confirmLabel="Restaurar"
        tone="primary"
        onCancel={() => setConfirm(null)}
        onConfirm={restaurar}
      />
    </div>
  )
}