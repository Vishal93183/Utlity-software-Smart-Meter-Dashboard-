import { useCallback, useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from '../lib/api.js'
import { downloadCsv } from '../lib/csv.js'
import { formatDateTime, money, num } from '../lib/format.js'

const TABS = [
  { key: 'meters', label: 'Meters' },
  { key: 'requests', label: 'Requests' },
  { key: 'billing', label: 'Billing' },
]

const stamp = () => new Date().toISOString().slice(0, 10)

export default function ReportsPage({ meters, currency }) {
  const [tab, setTab] = useState('meters')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({ opType: '', success: '', from: '', to: '' })
  const [requests, setRequests] = useState([])
  const [billing, setBilling] = useState([])

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.getReportSummary())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const loadRequests = useCallback(async (f) => {
    try {
      setRequests(await api.getRequestReport(f))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const loadBilling = useCallback(async () => {
    try {
      setBilling(await api.getBillingReport())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    loadSummary()
    loadRequests({})
    loadBilling()
  }, [loadSummary, loadRequests, loadBilling])

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const apply = () => loadRequests(filters)
  const resetFilters = () => {
    const empty = { opType: '', success: '', from: '', to: '' }
    setFilters(empty)
    loadRequests(empty)
  }

  const refresh = () => {
    loadSummary()
    loadRequests(filters)
    loadBilling()
  }

  // ---- CSV ----
  const download = () => {
    if (tab === 'meters') {
      downloadCsv(`meters-report-${stamp()}.csv`, [
        { label: 'Meter code', value: (m) => m.meterCode },
        { label: 'Status', value: (m) => m.status },
        { label: 'IP address', value: (m) => m.ipAddress },
        { label: 'Voltage (V)', value: (m) => m.voltage },
        { label: 'Current (A)', value: (m) => m.current },
        { label: 'Power (W)', value: (m) => m.power },
        { label: 'Reading (kWh)', value: (m) => m.reading },
        { label: 'Last updated', value: (m) => formatDateTime(m.lastUpdated) },
      ], meters)
    } else if (tab === 'requests') {
      downloadCsv(`requests-report-${stamp()}.csv`, [
        { label: 'Id', value: (r) => r.id },
        { label: 'Time', value: (r) => formatDateTime(r.createdAt) },
        { label: 'Request', value: (r) => r.name },
        { label: 'Operation', value: (r) => r.opType },
        { label: 'Message ID', value: (r) => r.messageId },
        { label: 'Meter ID', value: (r) => r.meterId },
        { label: 'IP address', value: (r) => r.ipAddress },
        { label: 'Result', value: (r) => (r.success ? 'Success' : 'Failed') },
      ], requests)
    } else {
      downloadCsv(`billing-report-${stamp()}.csv`, [
        { label: 'Meter code', value: (b) => b.meterCode },
        { label: 'Status', value: (b) => b.status },
        { label: 'Units (kWh)', value: (b) => b.units },
        { label: `Energy charge (${currency})`, value: (b) => b.energyCharge },
        { label: `Fixed charge (${currency})`, value: (b) => b.fixedCharge },
        { label: `Tax (${currency})`, value: (b) => b.tax },
        { label: `Total (${currency})`, value: (b) => b.total },
      ], billing)
    }
  }

  const tile = (label, value, sub) => (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </div>
  )

  const billTotal = billing.reduce((sum, b) => sum + b.total, 0)

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-head">
          <h2><Icon name="doc" size={28} /> Reports</h2>
          <div className="head-actions no-print">
            <button className="btn-soft" onClick={refresh}><Icon name="refresh" size={18} /> Refresh</button>
          </div>
        </div>
        {error && <div className="banner-error">{error}</div>}

        {summary && (
          <div className="summary-tiles">
            {tile('Meters', summary.totalMeters, `${summary.onlineMeters} online, ${summary.offlineMeters} offline`)}
            {tile('Total energy', `${num(summary.totalEnergyKwh)} kWh`)}
            {tile('Average voltage', summary.averageVoltage == null ? '--' : `${summary.averageVoltage} V`, 'online meters')}
            {tile('Average power', summary.averagePower == null ? '--' : `${summary.averagePower} W`, 'online meters')}
            {tile('Requests', summary.totalRequests, `${summary.readRequests} read, ${summary.writeRequests} write`)}
            {tile('Success rate', summary.totalRequests === 0 ? '--' : `${Math.round((summary.successfulRequests * 100) / summary.totalRequests)}%`,
              `${summary.successfulRequests} ok, ${summary.failedRequests} failed`)}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div className="tabs no-print" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="head-actions no-print">
            <button className="btn-soft" onClick={download}><Icon name="download" size={18} /> Download CSV</button>
            <button className="btn-soft" onClick={() => window.print()}><Icon name="print" size={18} /> Print</button>
          </div>
        </div>

        {tab === 'meters' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Meter</th><th>Status</th><th>IP address</th><th>Voltage (V)</th><th>Current (A)</th><th>Power (W)</th><th>Reading (kWh)</th><th>Last updated</th></tr>
              </thead>
              <tbody>
                {meters.length === 0 && <tr><td colSpan="8" className="empty-cell">No meters yet.</td></tr>}
                {meters.map((m) => {
                  const online = m.status === 'ONLINE'
                  return (
                    <tr key={m.id}>
                      <td>{m.meterCode}</td>
                      <td>
                        <span className={`status ${online ? 'online' : 'offline'}`}>
                          <span className={`dot ${online ? 'green' : 'red'}`} />{online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>{m.ipAddress || '--'}</td>
                      <td>{online ? num(m.voltage) : '--'}</td>
                      <td>{online ? num(m.current) : '--'}</td>
                      <td>{online ? num(m.power) : '--'}</td>
                      <td>{online ? num(m.reading) : '--'}</td>
                      <td>{formatDateTime(m.lastUpdated)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'requests' && (
          <>
            <div className="filters no-print">
              <label>Operation
                <select value={filters.opType} onChange={setFilter('opType')}>
                  <option value="">All</option><option value="READ">READ</option><option value="WRITE">WRITE</option>
                </select>
              </label>
              <label>Result
                <select value={filters.success} onChange={setFilter('success')}>
                  <option value="">All</option><option value="true">Success</option><option value="false">Failed</option>
                </select>
              </label>
              <label>From<input type="date" value={filters.from} onChange={setFilter('from')} /></label>
              <label>To<input type="date" value={filters.to} onChange={setFilter('to')} /></label>
              <button className="btn-save" onClick={apply}>Apply</button>
              <button className="btn-soft" onClick={resetFilters}>Reset</button>
            </div>
            <p className="hint table-hint">{requests.length} request(s) shown, newest first (at most 1000).</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>Request</th><th>Operation</th><th>Message ID</th><th>Meter ID</th><th>IP address</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {requests.length === 0 && <tr><td colSpan="7" className="empty-cell">No requests match.</td></tr>}
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateTime(r.createdAt)}</td>
                      <td>{r.name}</td>
                      <td><span className={`pill small ${r.opType === 'WRITE' ? 'write' : 'read'}`}>{r.opType}</span></td>
                      <td>{r.messageId}</td>
                      <td>{r.meterId}</td>
                      <td>{r.ipAddress}</td>
                      <td>
                        <span className={`status ${r.success ? 'online' : 'offline'}`}>
                          <span className={`dot ${r.success ? 'green' : 'red'}`} />{r.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'billing' && (
          <>
            <p className="hint table-hint">Units are each meter's stored reading (kWh), billed with the current tariff.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Meter</th><th>Status</th><th>Units (kWh)</th><th>Energy</th><th>Fixed</th><th>Tax</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {billing.length === 0 && <tr><td colSpan="7" className="empty-cell">No meters yet.</td></tr>}
                  {billing.map((b) => (
                    <tr key={b.meterId}>
                      <td>{b.meterCode}</td>
                      <td>{b.status === 'ONLINE' ? 'Online' : 'Offline'}</td>
                      <td>{num(b.units)}</td>
                      <td>{money(b.energyCharge, currency)}</td>
                      <td>{money(b.fixedCharge, currency)}</td>
                      <td>{money(b.tax, currency)}</td>
                      <td><strong>{money(b.total, currency)}</strong></td>
                    </tr>
                  ))}
                  {billing.length > 0 && (
                    <tr className="total-row"><td colSpan="6">Total of all meters</td><td>{money(billTotal, currency)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
