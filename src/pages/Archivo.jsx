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

const PAGE_SIZE = 3

const PALETA = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const money = (v) => '$' + Number(v ?? 0).toFixed(2)

const etiquetaDia = (f) => {
  const p = String(f).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}` : String(f)
}

const etiquetaMes = (m) => `${MESES[(Number(m.mes) || 0) - 1] ?? m.mes} ${m.anio}`

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

function SearchInput({ value, onChange }) {
  return (
    <div className="archivo-search-wrap">
      <input
        className="archivo-search"
        placeholder="Buscar..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="archivo-pagination">
      <button
        className="btn btn-sm btn-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹ Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button
        className="btn btn-sm btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente ›
      </button>
    </div>
  )
}

export default function Archivo() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('vehiculos')
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState({})
  const [page, setPage] = useState({})
  const [pagoResumen, setPagoResumen] = useState(null)
  const [porMetodo, setPorMetodo] = useState([])
  const [porDia, setPorDia] = useState([])
  const [porMes, setPorMes] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [arch, res, met, dia, mes] = await Promise.all([
        api.get('/archivo'),
        api.get('/pago/estadisticas'),
        api.get('/pago/por-metodo'),
        api.get('/pago/por-dia'),
        api.get('/pago/por-mes'),
      ])
      setData(arch.data)
      setPagoResumen(res.data)
      setPorMetodo(met.data || [])
      setPorDia(dia.data || [])
      setPorMes(mes.data || [])
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

  const visible = (key) => (data ? data[key] || [] : [])

  const setTabSearch = (key, value) => {
    setSearch((prev) => ({ ...prev, [key]: value }))
    setPage((prev) => ({ ...prev, [key]: 1 }))
  }

  const setTabPage = (key, value) => {
    setPage((prev) => ({ ...prev, [key]: value }))
  }

  const TAB_CONF = {
    vehiculos: {
      columns: ['ID', 'Placas', 'Marca', 'Modelo', 'Propietario', 'Acciones'],
      empty: 'Sin vehículos ocultos.',
      fields: [
        (r) => r.codeVehiculo,
        (r) => r.placas,
        (r) => r.marca,
        (r) => r.modelo,
        (r) => r.propietario,
        (r) => r.usuario?.email,
      ],
      row: (v) => (
        <tr key={v.codeVehiculo}>
          <td>{v.codeVehiculo}</td>
          <td>{v.placas}</td>
          <td>{v.marca || '—'}</td>
          <td>{v.modelo || '—'}</td>
          <td>{v.usuario?.email || v.propietario || '—'}</td>
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
      ),
    },
    entradas: {
      columns: ['ID', 'Entrada', 'Salida', 'Horas', 'Total', 'Estado', 'Vehículo', 'Espacio', 'Acciones'],
      empty: 'Sin entradas/salidas ocultas.',
      fields: [
        (r) => r.codeEntradaSalida,
        (r) => r.fechaEntrada,
        (r) => r.fechaSalida,
        (r) => r.horasConsumidas,
        (r) => r.totalPagar,
        (r) => r.estado,
        (r) => r.vehiculo?.placas,
        (r) => r.espacio?.numero,
      ],
      row: (e) => (
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
      ),
    },
    pagos: {
      columns: ['ID', 'Monto', 'Fecha', 'Método', 'Entrada', 'Acciones'],
      empty: 'Sin pagos ocultos.',
      fields: [
        (r) => r.codePago,
        (r) => r.monto,
        (r) => r.fechaPago,
        (r) => r.metodoPago,
        (r) => r.entradaSalida?.codeEntradaSalida,
      ],
      row: (p) => (
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
      ),
    },
    espacios: {
      columns: ['ID', 'Número', 'Tipo', 'Disponible', 'Estacionamiento', 'Acciones'],
      empty: 'Sin espacios ocultos.',
      fields: [
        (r) => r.codeEspacio,
        (r) => r.numero,
        (r) => r.tipo,
        (r) => (r.disponible ? 'Sí' : 'No'),
        (r) => r.estacionamiento?.nombre,
      ],
      row: (e) => (
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
      ),
    },
    estacionamientos: {
      columns: ['ID', 'Nombre', 'Ciudad', 'Capacidad', 'Tarifa/hora', 'Activo', 'Acciones'],
      empty: 'Sin estacionamientos ocultos.',
      fields: [
        (r) => r.codeEstacionamiento,
        (r) => r.nombre,
        (r) => r.ciudad,
        (r) => r.capacidadTotal,
        (r) => r.tarifaHora,
        (r) => (r.activo ? 'Sí' : 'No'),
      ],
      row: (e) => (
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
      ),
    },
    usuarios: {
      columns: ['ID', 'Nombre', 'Email', 'Rol', 'Acciones'],
      empty: 'Sin usuarios ocultos.',
      fields: [
        (r) => r.codeUsuario,
        (r) => r.nombre,
        (r) => r.apellido,
        (r) => r.email,
        (r) => r.rol,
      ],
      row: (u) => (
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
      ),
    },
  }

  const buildPage = (conf) => {
    const list = visible(tab)
    const q = (search[tab] || '').trim().toLowerCase()
    const filtered = q
      ? list.filter((r) =>
          conf.fields.some((f) => String(f(r) ?? '').toLowerCase().includes(q)),
        )
      : list
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const cur = Math.min(page[tab] || 1, totalPages)
    return {
      shown: filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE),
      totalPages,
      cur,
      totalCount: filtered.length,
      totalAll: list.length,
    }
  }

  const conf = TAB_CONF[tab]
  const paged = buildPage(conf)

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

          {pagoResumen && (
            <div className="archivo-pagos">
              <div className="archivo-section-title">
                <h2>Estadísticas de ingresos</h2>
                <span>Tendencia y desglose de la recaudación por pagos</span>
              </div>

              <div className="archivo-resumen">
                <div className="archivo-resumen-card archivo-resumen-accent">
                  <span>Total recaudado</span>
                  <strong>{money(pagoResumen.totalRecaudado)}</strong>
                </div>
                <div className="archivo-resumen-card">
                  <span>Total de pagos</span>
                  <strong>{pagoResumen.totalPagos}</strong>
                </div>
                <div className="archivo-resumen-card">
                  <span>Promedio por pago</span>
                  <strong>{money(pagoResumen.promedioPago)}</strong>
                </div>
                <div className="archivo-resumen-card">
                  <span>Pago más alto</span>
                  <strong>{money(pagoResumen.pagoMayor)}</strong>
                </div>
                <div className="archivo-resumen-card">
                  <span>Pago más bajo</span>
                  <strong>{money(pagoResumen.pagoMenor)}</strong>
                </div>
              </div>

              {pagoResumen.totalPagos > 0 && (
                <div className="archivo-charts">
                  <div className="archivo-chart">
                    <div className="archivo-chart-head">
                      <h3>Recaudación por método de pago</h3>
                      <span>Total acumulado por forma de pago</span>
                    </div>
                    {porMetodo.length === 0 ? (
                      <div className="empty-state">Sin datos por método.</div>
                    ) : (
                      <div className="archivo-bars-h">
                        {porMetodo.map((m, i) => {
                          const max = Math.max(...porMetodo.map((x) => x.totalRecaudado))
                          const pct = max > 0 ? (m.totalRecaudado / max) * 100 : 0
                          return (
                            <div className="archivo-bar-h" key={m.metodoPago}>
                              <div className="archivo-bar-h-label">{m.metodoPago}</div>
                              <div className="archivo-bar-h-track">
                                <div
                                  className="archivo-bar-h-fill"
                                  style={{ width: `${pct}%`, background: PALETA[i % PALETA.length] }}
                                />
                              </div>
                              <div className="archivo-bar-h-count">
                                <strong>{money(m.totalRecaudado)}</strong>
                                <span>{m.cantidadPagos} pago(s)</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="archivo-chart">
                    <div className="archivo-chart-head">
                      <h3>Recaudación por mes</h3>
                      <span>Total ingresado cada mes</span>
                    </div>
                    {porMes.length === 0 ? (
                      <div className="empty-state">Sin datos por mes.</div>
                    ) : (
                      <div className="archivo-bars-v">
                        {porMes.map((m) => {
                          const max = Math.max(...porMes.map((x) => x.totalRecaudado))
                          const pct = max > 0 ? (m.totalRecaudado / max) * 100 : 0
                          return (
                            <div
                              className="archivo-bar-v"
                              key={`${m.anio}${m.mes}`}
                              title={`${etiquetaMes(m)} · ${money(m.totalRecaudado)} · ${m.pagos} pago(s)`}
                            >
                              <div className="archivo-bar-v-value">{money(m.totalRecaudado)}</div>
                              <div className="archivo-bar-v-track">
                                <div className="archivo-bar-v-fill" style={{ height: `${pct}%` }} />
                              </div>
                              <div className="archivo-bar-v-label">{etiquetaMes(m)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="archivo-chart archivo-chart-full">
                    <div className="archivo-chart-head">
                      <h3>Recaudación por día</h3>
                      <span>Total ingresado cada día (del más antiguo al más reciente)</span>
                    </div>
                    {porDia.length === 0 ? (
                      <div className="empty-state">Sin datos por día.</div>
                    ) : (
                      <div className="archivo-bars-v archivo-bars-dia">
                        {[...porDia].reverse().map((d) => {
                          const max = Math.max(...porDia.map((x) => x.total))
                          const pct = max > 0 ? (d.total / max) * 100 : 0
                          return (
                            <div
                              className="archivo-bar-v"
                              key={d.fecha}
                              title={`${d.fecha} · ${money(d.total)} · ${d.pagos} pago(s)`}
                            >
                              <div className="archivo-bar-v-value">{money(d.total)}</div>
                              <div className="archivo-bar-v-track">
                                <div className="archivo-bar-v-fill" style={{ height: `${pct}%` }} />
                              </div>
                              <div className="archivo-bar-v-label">{etiquetaDia(d.fecha)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
            <div className="archivo-toolbar">
              <SearchInput
                value={search[tab] || ''}
                onChange={(value) => setTabSearch(tab, value)}
              />
              <span className="archivo-results">
                {paged.totalCount} de {paged.totalAll}
              </span>
            </div>

            {paged.totalCount === 0 ? (
              <div className="empty-state">
                {search[tab]
                  ? 'Sin resultados para tu búsqueda.'
                  : conf.empty}
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      {conf.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{paged.shown.map(conf.row)}</tbody>
                </table>
                <Pagination
                  page={paged.cur}
                  totalPages={paged.totalPages}
                  onChange={(value) => setTabPage(tab, value)}
                />
              </>
            )}
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