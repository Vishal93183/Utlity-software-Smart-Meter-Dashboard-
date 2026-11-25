import Icon from './Icon.jsx'
import { formatDateTime, num } from '../lib/format.js'

export default function MeterDetailsPanel({ details, liveMeter, error, onEdit, onDelete, onClose }) {
  if (error) {
    return (
      <section className="card details-card" id="meter-details">
        <div className="card-head">
          <h2><Icon name="gauge" size={28} /> Meter Details</h2>
          <button className="kebab" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <div className="banner-error">{error}</div>
      </section>
    )
  }
  if (!details) return null

  // live values (Home page polling / simulation) ko details se upar rakho
  const m = liveMeter ?? details.meter
  const online = m.status === 'ONLINE'
  const tile = (label, value, unit) => (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{online ? num(value) : '--'}<small>{online ? unit : ''}</small></span>
    </div>
  )

  return (
    <section className="card details-card" id="meter-details">
      <div className="card-head">
        <h2>
          <Icon name="gauge" size={28} /> Meter Details: {m.meterCode}
          <span className={`status ${online ? 'online' : 'offline'} detail-status`}>
            <span className={`dot ${online ? 'green' : 'red'}`} />{online ? 'Online' : 'Offline'}
          </span>
        </h2>
        <div className="head-actions">
          <button className="btn-soft" onClick={() => onEdit(m)}><Icon name="edit" size={17} /> Edit</button>
          <button className="btn-soft danger-soft" onClick={() => onDelete(m)}><Icon name="trash" size={17} /> Delete</button>
          <button className="kebab" onClick={onClose} aria-label="Close details"><Icon name="close" size={20} /></button>
        </div>
      </div>

      <div className="details-grid">
        <div>
          <h3>Information</h3>
          <dl className="info-list">
            <dt>Meter ID</dt><dd>{m.id}</dd>
            <dt>Meter code</dt><dd>{m.meterCode}</dd>
            <dt>Meter type ID</dt><dd>{num(m.meterTypeId)}</dd>
            <dt>IP address</dt><dd>{m.ipAddress || '--'}</dd>
            <dt>Last updated</dt><dd>{formatDateTime(m.lastUpdated)}</dd>
          </dl>
        </div>

        <div>
          <h3>Latest values</h3>
          <div className="tiles">
            {tile('Voltage', m.voltage, 'V')}
            {tile('Current', m.current, 'A')}
            {tile('Power', m.power, 'W')}
            {tile('Reading', m.reading, 'kWh')}
          </div>
        </div>

        <div>
          <h3>Request activity</h3>
          <div className="stats">
            <span><strong>{details.totalRequests}</strong> total</span>
            <span className="ok-text"><strong>{details.successfulRequests}</strong> successful</span>
            <span className="err-text"><strong>{details.failedRequests}</strong> failed</span>
          </div>
          <ul className="recent">
            {details.recentRequests.length === 0 && <li className="empty">No requests for this meter yet.</li>}
            {details.recentRequests.map((r) => (
              <li key={r.id}>
                <span className={`pill small ${r.opType === 'WRITE' ? 'write' : 'read'}`}>{r.opType}</span>
                <span className="recent-time">{formatDateTime(r.createdAt)}</span>
                <span className={`dot ${r.success ? 'green' : 'red'}`} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
