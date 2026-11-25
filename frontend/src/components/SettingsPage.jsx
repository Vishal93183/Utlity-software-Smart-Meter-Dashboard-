import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { api, BASE } from '../lib/api.js'

export default function SettingsPage({ settings, onSave, onClearHistory }) {
  const [form, setForm] = useState({
    displayName: settings.displayName,
    currency: settings.currency,
    refreshIntervalSec: settings.refreshIntervalSec,
    defaultMessageId: settings.defaultMessageId,
  })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState(null)
  const [system, setSystem] = useState(null)
  const [systemError, setSystemError] = useState('')

  // saved settings backend se aaye to form bhi update ho
  useEffect(() => {
    setForm({
      displayName: settings.displayName,
      currency: settings.currency,
      refreshIntervalSec: settings.refreshIntervalSec,
      defaultMessageId: settings.defaultMessageId,
    })
  }, [settings])

  useEffect(() => {
    api.getSystemInfo().then(setSystem).catch((e) => setSystemError(e.message))
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    setSaving(true)
    setNote(null)
    try {
      await onSave({
        displayName: form.displayName,
        currency: form.currency,
        refreshIntervalSec: form.refreshIntervalSec === '' ? null : Number(form.refreshIntervalSec),
        defaultMessageId: form.defaultMessageId,
      })
      setNote({ kind: 'ok', text: 'Settings saved.' })
    } catch (e) {
      setNote({ kind: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('Delete the whole request history? This cannot be undone.')) return
    try {
      await onClearHistory()
      setNote({ kind: 'ok', text: 'Request history cleared.' })
    } catch (e) {
      setNote({ kind: 'err', text: e.message })
    }
  }

  return (
    <div className="page-stack">
      <div className="sim-grid">
        <section className="card">
          <div className="card-head">
            <h2><Icon name="gear" size={28} /> Settings</h2>
          </div>
          <div className="form">
            <label>
              Display name
              <input value={form.displayName} onChange={set('displayName')} maxLength={40} />
              <small className="hint">Shown at the top right.</small>
            </label>
            <label>
              Currency symbol
              <input value={form.currency} onChange={set('currency')} maxLength={5} />
              <small className="hint">Used for tariff, bills and billing reports.</small>
            </label>
            <label>
              Live data refresh (seconds)
              <input type="number" min="1" max="60" value={form.refreshIntervalSec} onChange={set('refreshIntervalSec')} />
              <small className="hint">How often the Real Time Data View asks the backend while Live Data is on.</small>
            </label>
            <label>
              Default Message ID
              <input value={form.defaultMessageId} onChange={set('defaultMessageId')} placeholder="e.g. device/abc/res" />
              <small className="hint">Pre-fills the Request Builder and the Simulation page. This is the topic your device replies on.</small>
            </label>

            {note && <div className={`note ${note.kind}`}>{note.text}</div>}
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
          </div>
        </section>

        <div className="page-stack">
          <section className="card">
            <div className="card-head">
              <h2><Icon name="bolt" size={28} /> Connection</h2>
            </div>
            {systemError && <div className="banner-error">{systemError}</div>}
            <dl className="info-list">
              <dt>Backend address</dt><dd>{BASE}</dd>
              <dt>Backend status</dt>
              <dd>
                <span className={`status ${system ? 'online' : 'offline'}`}>
                  <span className={`dot ${system ? 'green' : 'red'}`} />{system ? 'Reachable' : 'Not reachable'}
                </span>
              </dd>
              {system && (
                <>
                  <dt>MQTT mode</dt>
                  <dd>
                    <span className={`status ${system.mqttEnabled ? 'online' : 'offline'}`}>
                      <span className={`dot ${system.mqttEnabled ? 'green' : 'grey'}`} />{system.mqttEnabled ? 'Enabled' : 'Disabled (database only)'}
                    </span>
                  </dd>
                  <dt>Broker address</dt><dd>{system.brokerUrl || '--'}</dd>
                  <dt>Request topic</dt><dd>{system.requestTopic || '--'}</dd>
                  <dt>QoS</dt><dd>{system.qos}</dd>
                  <dt>Reply timeout</dt><dd>{system.responseTimeoutMs} ms</dd>
                </>
              )}
            </dl>
            <p className="hint">These values come from the backend's application.properties. Change them there and restart the backend.</p>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Data</h2>
            </div>
            <p className="hint">Removes every saved request from the Request History and the reports. Meters are not touched.</p>
            <button className="btn-soft danger-soft clear-history" onClick={clearHistory}>
              <Icon name="trash" size={17} /> Clear request history
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
