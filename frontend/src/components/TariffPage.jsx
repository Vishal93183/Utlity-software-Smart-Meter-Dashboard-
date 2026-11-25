import { useCallback, useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from '../lib/api.js'
import { money, num } from '../lib/format.js'

const toRows = (slabs) =>
  slabs.map((s) => ({ upTo: s.upToUnits === null || s.upToUnits === undefined ? '' : String(s.upToUnits), rate: String(s.rate) }))

export default function TariffPage({ meters, currency }) {
  const [rows, setRows] = useState([])
  const [fixed, setFixed] = useState('')
  const [tax, setTax] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveNote, setSaveNote] = useState(null)

  const [meterId, setMeterId] = useState('')
  const [units, setUnits] = useState('')
  const [bill, setBill] = useState(null)
  const [billError, setBillError] = useState('')

  const [billing, setBilling] = useState([])

  const loadBilling = useCallback(async () => {
    try {
      setBilling(await api.getBillingReport())
    } catch (e) {
      setLoadError(e.message)
    }
  }, [])

  const loadTariff = useCallback(async () => {
    try {
      const t = await api.getTariff()
      setRows(toRows(t.slabs))
      setFixed(String(t.fixedCharge))
      setTax(String(t.taxPercent))
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
    }
  }, [])

  useEffect(() => {
    loadTariff()
    loadBilling()
  }, [loadTariff, loadBilling])

  const setRow = (i, key, value) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  const last = rows.length - 1

  const addSlab = () => {
    const prev = rows.length > 1 ? Number(rows[last - 1].upTo) || 0 : 0
    const next = [...rows]
    next.splice(last, 0, { upTo: String(prev + 100), rate: rows[last]?.rate ?? '0' })
    setRows(next)
  }
  const removeSlab = (i) => setRows(rows.filter((_, idx) => idx !== i))

  const save = async () => {
    setSaving(true)
    setSaveNote(null)
    try {
      await api.saveTariff({
        slabs: rows.map((r, i) => ({ upToUnits: i === last ? null : Number(r.upTo), rate: Number(r.rate) })),
        fixedCharge: Number(fixed),
        taxPercent: Number(tax),
      })
      setSaveNote({ kind: 'ok', text: 'Tariff saved. The bills below use the new rates.' })
      await loadTariff()
      loadBilling()
      setBill(null)
    } catch (e) {
      setSaveNote({ kind: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const onMeter = (e) => {
    const id = e.target.value
    setMeterId(id)
    const m = meters.find((x) => String(x.id) === id)
    setUnits(m && m.reading !== null && m.reading !== undefined ? String(m.reading) : '')
  }

  const calculate = async () => {
    setBillError('')
    try {
      setBill(
        await api.calculateBill({
          units: units === '' ? null : Number(units),
          meterId: meterId === '' ? null : Number(meterId),
        })
      )
    } catch (e) {
      setBill(null)
      setBillError(e.message)
    }
  }

  return (
    <div className="page-stack">
      {loadError && <div className="banner-error">{loadError}</div>}

      <div className="sim-grid">
        {/* ---------- tariff editor ---------- */}
        <section className="card">
          <div className="card-head">
            <h2><Icon name="rupee" size={28} /> Tariff & Charges</h2>
          </div>

          <div className="table-wrap">
            <table className="compact slab-table">
              <thead>
                <tr><th>Slab</th><th>Up to (kWh)</th><th>Rate per kWh ({currency})</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {i === last ? (
                        <span className="muted">and above</span>
                      ) : (
                        <input type="number" min="0" value={r.upTo} onChange={(e) => setRow(i, 'upTo', e.target.value)} />
                      )}
                    </td>
                    <td><input type="number" min="0" step="0.01" value={r.rate} onChange={(e) => setRow(i, 'rate', e.target.value)} /></td>
                    <td>
                      <button className="icon-btn danger" onClick={() => removeSlab(i)} disabled={rows.length <= 1} aria-label={`Remove slab ${i + 1}`}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="link-btn add-slab" onClick={addSlab}>+ Add slab</button>

          <div className="two-col charge-fields">
            <label>
              Fixed charge ({currency})
              <input type="number" min="0" step="0.01" value={fixed} onChange={(e) => setFixed(e.target.value)} />
            </label>
            <label>
              Tax (%)
              <input type="number" min="0" max="100" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </label>
          </div>

          {saveNote && <div className={`note ${saveNote.kind}`}>{saveNote.text}</div>}
          <button className="btn-primary" onClick={save} disabled={saving || rows.length === 0}>
            {saving ? 'Saving...' : 'Save tariff'}
          </button>
          <p className="hint">Energy charge = units in each slab x its rate. Tax is applied on energy charge plus fixed charge.</p>
        </section>

        {/* ---------- calculator ---------- */}
        <section className="card">
          <div className="card-head">
            <h2><Icon name="doc" size={28} /> Bill Calculator</h2>
          </div>
          <div className="form">
            <label>
              Meter (optional)
              <div className="select-wrap">
                <select value={meterId} onChange={onMeter}>
                  <option value="">Enter units manually</option>
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>{m.meterCode} (id {m.id})</option>
                  ))}
                </select>
                <Icon name="chevron" size={18} />
              </div>
            </label>
            <label>
              Units (kWh)
              <input type="number" min="0" step="0.01" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 250" />
            </label>
            <button className="btn-primary calc-btn" onClick={calculate}>Calculate bill</button>
            {billError && <div className="banner-error">{billError}</div>}
          </div>

          {bill && (
            <div className="bill">
              <table className="compact">
                <thead><tr><th>Slab</th><th>Units</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>
                  {bill.slabs.map((s) => (
                    <tr key={s.range}>
                      <td>{s.range}</td><td>{s.units}</td><td>{s.rate}</td><td>{money(s.amount, currency)}</td>
                    </tr>
                  ))}
                  <tr className="sum-row"><td colSpan="3">Energy charge</td><td>{money(bill.energyCharge, currency)}</td></tr>
                  <tr className="sum-row"><td colSpan="3">Fixed charge</td><td>{money(bill.fixedCharge, currency)}</td></tr>
                  <tr className="sum-row"><td colSpan="3">Tax ({bill.taxPercent}%)</td><td>{money(bill.tax, currency)}</td></tr>
                  <tr className="total-row"><td colSpan="3">Total for {bill.units} kWh</td><td>{money(bill.total, currency)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ---------- charges by meter ---------- */}
      <section className="card">
        <div className="card-head">
          <h2><Icon name="bars" size={28} /> Charges by Meter</h2>
        </div>
        <p className="hint table-hint">Units are taken from each meter's stored reading (kWh).</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Meter</th><th>Status</th><th>Units (kWh)</th><th>Energy</th><th>Fixed</th><th>Tax</th><th>Total</th></tr>
            </thead>
            <tbody>
              {billing.length === 0 && <tr><td colSpan="7" className="empty-cell">No meters yet.</td></tr>}
              {billing.map((b) => {
                const online = b.status === 'ONLINE'
                return (
                  <tr key={b.meterId}>
                    <td>{b.meterCode}</td>
                    <td>
                      <span className={`status ${online ? 'online' : 'offline'}`}>
                        <span className={`dot ${online ? 'green' : 'red'}`} />{online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>{num(b.units)}</td>
                    <td>{money(b.energyCharge, currency)}</td>
                    <td>{money(b.fixedCharge, currency)}</td>
                    <td>{money(b.tax, currency)}</td>
                    <td><strong>{money(b.total, currency)}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
