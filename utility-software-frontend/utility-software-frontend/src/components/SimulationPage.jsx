import { useEffect } from 'react'
import Icon from './Icon.jsx'
import LineChart from './LineChart.jsx'
import { formatDateTime, num } from '../lib/format.js'

export default function SimulationPage({ sim, meters, defaultMessageId }) {
  const { config, setConfig, selected, setSelected, running, start, stop, clear, ticks, log, series, error } = sim
  const device = config.mode === 'device'

  // Request Builder me jo Message ID likha tha wahi pehle se bhar do
  useEffect(() => {
    if (!config.messageId && defaultMessageId) setConfig((c) => ({ ...c, messageId: defaultMessageId }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setNum = (key) => (e) => setConfig({ ...config, [key]: e.target.value === '' ? '' : Number(e.target.value) })
  const setMode = (mode) => !running && setConfig({ ...config, mode })
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const problems = []
  if (!(config.intervalSec >= 1)) problems.push('Interval must be at least 1 second')
  if (device) {
    const id = (config.messageId || '').trim()
    if (!id) problems.push('Message ID is required (the topic your device replies on)')
    else if (/[+#]/.test(id)) problems.push('Message ID cannot contain + or #')
  } else {
    if (!(config.vMin > 0 && config.vMax > config.vMin)) problems.push('Voltage: max must be greater than min')
    if (!(config.aMin > 0 && config.aMax > config.aMin)) problems.push('Current: max must be greater than min')
  }
  if (selected.length === 0) problems.push('Select at least one meter')
  const valid = problems.length === 0

  const chosen = meters.filter((m) => selected.includes(m.id))
  const lines = chosen.map((m) => ({ id: m.id, label: m.meterCode }))
  const missingIp = device ? chosen.filter((m) => !m.ipAddress) : []

  return (
    <div className="sim-page">
      <div className="sim-grid">
        <section className="card">
          <div className="card-head">
            <h2><Icon name="gear" size={28} /> Simulation</h2>
            <span className={`live-pill ${running ? '' : 'paused'}`}>
              <span className={`dot ${running ? 'green pulse' : 'grey'}`} />
              {running ? 'Running' : 'Stopped'}
            </span>
          </div>

          <div className="form">
            <div className="seg" role="tablist" aria-label="Simulation mode">
              <button className={device ? 'on' : ''} onClick={() => setMode('device')} disabled={running && !device}>
                Device (MQTT)
              </button>
              <button className={!device ? 'on' : ''} onClick={() => setMode('browser')} disabled={running && device}>
                Browser simulation
              </button>
            </div>
            <p className="hint">
              {device
                ? 'Sends a READ request for every selected meter through the backend. The backend publishes it over MQTT, and your device\'s reply is saved and shown here.'
                : 'Creates random values in the browser and saves them to the database. MQTT is not used.'}
            </p>

            {device && (
              <label>
                Message ID (reply topic)
                <input
                  value={config.messageId}
                  onChange={(e) => setConfig({ ...config, messageId: e.target.value })}
                  placeholder="e.g. device/abc/res"
                  disabled={running}
                />
              </label>
            )}

            <div className="two-col">
              <label>
                Update every (s)
                <input type="number" min="1" max="600" value={config.intervalSec} onChange={setNum('intervalSec')} />
              </label>
              {!device && (
                <label>
                  Energy speed
                  <div className="select-wrap">
                    <select value={config.speed} onChange={setNum('speed')}>
                      <option value={1}>1x (real time)</option>
                      <option value={10}>10x</option>
                      <option value={60}>60x</option>
                      <option value={600}>600x</option>
                    </select>
                    <Icon name="chevron" size={18} />
                  </div>
                </label>
              )}
            </div>

            {!device && (
              <>
                <div className="two-col">
                  <label>Voltage min (V)<input type="number" value={config.vMin} onChange={setNum('vMin')} /></label>
                  <label>Voltage max (V)<input type="number" value={config.vMax} onChange={setNum('vMax')} /></label>
                </div>
                <div className="two-col">
                  <label>Current min (A)<input type="number" step="0.1" value={config.aMin} onChange={setNum('aMin')} /></label>
                  <label>Current max (A)<input type="number" step="0.1" value={config.aMax} onChange={setNum('aMax')} /></label>
                </div>
                <label>
                  Random offline chance: {config.offlinePct}% per update
                  <input type="range" min="0" max="30" step="1" value={config.offlinePct} onChange={setNum('offlinePct')} className="slider" />
                </label>
              </>
            )}

            <fieldset className="write-box">
              <legend>Meters</legend>
              {meters.length === 0 ? (
                <p className="empty">No meters yet. Add a meter on the Home page first.</p>
              ) : (
                <div className="meter-checks">
                  <button type="button" className="link-btn" onClick={() => setSelected(meters.map((m) => m.id))}>Select all</button>
                  {meters.map((m) => (
                    <label key={m.id} className="check">
                      <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                      {m.meterCode} <span className="id-tag">id {m.id}</span>
                      {device && !m.ipAddress && <span className="warn-tag">no IP</span>}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            {missingIp.length > 0 && (
              <div className="banner-error">
                {missingIp.map((m) => m.meterCode).join(', ')}: no IP address saved. Use Edit on the Home page to add one,
                otherwise these meters are skipped.
              </div>
            )}
            {problems.length > 0 && <div className="banner-error">{problems.join('. ')}.</div>}
            {error && <div className="banner-error">{error}</div>}

            <div className="sim-actions">
              {running ? (
                <button className="btn-stop" onClick={stop}><Icon name="stop" size={18} /> Stop</button>
              ) : (
                <button className="btn-primary sim-start" onClick={start} disabled={!valid}>
                  <Icon name="play" size={18} /> {device ? 'Start polling' : 'Start simulation'}
                </button>
              )}
              <button className="btn-soft" onClick={clear}>Clear log</button>
            </div>
            <p className="hint">
              Updates so far: {ticks}. It keeps running if you switch pages.
              {device && ' Each poll also appears in Request History, and meters are polled one after another.'}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2><Icon name="bars" size={28} /> Live Power</h2>
          </div>
          <LineChart series={series} lines={lines} />
        </section>
      </div>

      <div className="sim-grid sim-bottom">
        <section className="card">
          <div className="card-head">
            <h2><Icon name="doc" size={28} /> Values in the backend</h2>
          </div>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr><th>Meter</th><th>Status</th><th>V</th><th>A</th><th>W</th><th>kWh</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {chosen.length === 0 && <tr><td colSpan="7" className="empty-cell">No meters selected.</td></tr>}
                {chosen.map((m) => {
                  const online = m.status === 'ONLINE'
                  return (
                    <tr key={m.id}>
                      <td>{m.meterCode}</td>
                      <td>
                        <span className={`status ${online ? 'online' : 'offline'}`}>
                          <span className={`dot ${online ? 'green' : 'red'}`} />{online ? 'Online' : 'Offline'}
                        </span>
                      </td>
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
        </section>

        <section className="card">
          <div className="card-head">
            <h2><Icon name="history" size={28} /> Event Log</h2>
          </div>
          <div className="log-box">
            {log.length === 0 ? (
              <p className="empty">Nothing yet. Start the {device ? 'polling' : 'simulation'}.</p>
            ) : (
              log.map((e, i) => (
                <div key={i} className={`log-line ${e.kind}`}>
                  <span className="log-time">{e.time}</span>
                  <span>{e.text}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
