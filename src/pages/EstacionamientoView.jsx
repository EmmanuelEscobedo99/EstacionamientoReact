import { useEffect, useState } from 'react'
import api from '../api/axios'
import './EstacionamientoView.css'

const TIPO_LABELS = {
  AUTO: 'Auto',
  MOTO: 'Moto',
  CAMIONETA: 'Camioneta',
  DISCAPACITADO: 'Discapacitado',
}

export default function EstacionamientoView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/estacionamiento')
      setItems(data)
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
    if (items.length > 0 && items.every((i) => i.codeEstacionamiento !== selectedId)) {
      setSelectedId(items[0].codeEstacionamiento)
    }
  }, [items, selectedId])

  const selected = items.find((i) => i.codeEstacionamiento === selectedId)
  const espacios = selected ? selected.espacios || [] : []
  const libres = espacios.filter((s) => s.disponible).length
  const ocupados = espacios.length - libres

  const toggleEspacio = async (space) => {
    const flip = !space.disponible
    setSaving(space.codeEspacio)
    setError('')

    setItems((prev) =>
      prev.map((lot) =>
        lot.codeEstacionamiento === selectedId
          ? {
              ...lot,
              espacios: lot.espacios.map((s) =>
                s.codeEspacio === space.codeEspacio ? { ...s, disponible: flip } : s
              ),
            }
          : lot
      )
    )

    try {
      const { data } = await api.put(`/espacio/${space.codeEspacio}`, {
        numero: space.numero,
        tipo: space.tipo,
        disponible: flip,
      })
      setItems((prev) =>
        prev.map((lot) =>
          lot.codeEstacionamiento === selectedId
            ? {
                ...lot,
                espacios: lot.espacios.map((s) =>
                  s.codeEspacio === space.codeEspacio
                    ? { ...s, disponible: data.disponible }
                    : s
                ),
              }
            : lot
        )
      )
    } catch {
      setError(`No se pudo cambiar el estado del espacio ${space.numero}.`)
      setItems((prev) =>
        prev.map((lot) =>
          lot.codeEstacionamiento === selectedId
            ? {
                ...lot,
                espacios: lot.espacios.map((s) =>
                  s.codeEspacio === space.codeEspacio ? { ...s, disponible: !flip } : s
                ),
              }
            : lot
        )
      )
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
                <div className="sv-grid">
                  {espacios.map((s) => (
                    <button
                      key={s.codeEspacio}
                      className={`sv-space ${s.disponible ? 'free' : 'occupied'} ${saving === s.codeEspacio ? 'saving' : ''}`}
                      onClick={() => toggleEspacio(s)}
                      disabled={saving === s.codeEspacio}
                      title={s.disponible ? 'Libre — clic para marcar ocupado' : 'Ocupado — clic para marcar libre'}
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}