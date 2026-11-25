import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import BuilderPanel from './components/BuilderPanel.jsx'
import ResponsePanel from './components/ResponsePanel.jsx'
import DataPanel from './components/DataPanel.jsx'
import MeterModal from './components/MeterModal.jsx'
import SimulationPage from './components/SimulationPage.jsx'
import TariffPage from './components/TariffPage.jsx'
import ReportsPage from './components/ReportsPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import MeterDetailsPanel from './components/MeterDetailsPanel.jsx'
import { useSimulation } from './hooks/useSimulation.js'

const EMPTY_FORM = {
  messageId: '',
  opType: 'READ',
  meterId: '',
  ipAddress: '',
  meterTypeId: '',
  reading: '',
  voltage: '',
  current: '',
  power: '',
}

const DEFAULT_SETTINGS = { displayName: 'Operator', currency: '₹', refreshIntervalSec: 5, defaultMessageId: '' }

function buildPayload(f) {
  const payload = {
    messageId: f.messageId.trim(),
    opType: f.opType,
    meterId: f.meterId === '' ? null : Number(f.meterId),
    ipAddress: f.ipAddress.trim(),
  }
  if (f.opType === 'WRITE') {
    if (f.meterTypeId !== '') payload.meterTypeId = Number(f.meterTypeId)
    const data = {}
    ;['reading', 'voltage', 'current', 'power'].forEach((k) => {
      if (f[k] !== '') data[k] = Number(f[k])
    })
    if (Object.keys(data).length) payload.data = data
  }
  return payload
}

export default function App() {
  const [active, setActive] = useState('home')
  const [page, setPage] = useState('home') // 'home' | 'simulation' | 'tariff' | 'reports' | 'settings'
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [response, setResponse] = useState(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [responseNote, setResponseNote] = useState(null) // { kind: 'ok' | 'warn' | 'err', text }
  const [meters, setMeters] = useState([])
  const [dataError, setDataError] = useState('')
  const [live, setLive] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [meterModal, setMeterModal] = useState(null) // { meter: object | null }
  const [details, setDetails] = useState(null) // MeterDetails from backend
  const [detailsError, setDetailsError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await api.getHistory())
    } catch (e) {
      showToast(e.message)
    }
  }, [])

  const loadMeters = useCallback(async () => {
    try {
      setMeters(await api.getMeters())
      setDataError('')
    } catch (e) {
      setDataError(e.message)
    }
  }, [])

  // Request bhejne ke baad us meter ki details backend se laata hai
  const loadDetails = useCallback(async (id) => {
    if (id === null || id === undefined || id === '' || Number.isNaN(Number(id))) return
    try {
      setDetails(await api.getMeterDetails(Number(id)))
      setDetailsError('')
    } catch (e) {
      setDetails(null)
      setDetailsError(e.status === 404 ? `Meter ${id} was not found. It may have been deleted.` : e.message)
    }
  }, [])

  // settings backend se (display name, currency, refresh interval, default Message ID)
  useEffect(() => {
    api.getSettings()
      .then((st) => {
        setSettings(st)
        setForm((f) => (f.messageId ? f : { ...f, messageId: st.defaultMessageId || '' }))
      })
      .catch(() => {})
  }, [])

  // first load
  useEffect(() => {
    loadHistory()
    loadMeters()
  }, [loadHistory, loadMeters])

  // live polling
  useEffect(() => {
    if (!live) return
    const id = setInterval(loadMeters, Math.max(1, settings.refreshIntervalSec || 5) * 1000)
    return () => clearInterval(id)
  }, [live, loadMeters, settings.refreshIntervalSec])

  const handleSend = async () => {
    setErrors({})
    setSending(true)
    try {
      const res = await api.sendRequest(buildPayload(form))
      setResponse(res)
      setResponseIsError(!res.ipStatus)
      setResponseNote(
        res.ipStatus
          ? { kind: 'ok', text: 'Reply received. The meter values were saved.' }
          : { kind: 'warn', text: 'No reply from the device in time, or the meter is offline.' }
      )
      setSelectedId(null)
      loadMeters()
    } catch (e) {
      setResponse(e.body ?? { status: e.status, message: e.message })
      setResponseIsError(true)
      const text =
        e.status === 0 ? e.message
        : e.status === 502 ? `Broker or device problem: ${e.message}`
        : e.status === 409 ? `${e.message}. Wait a few seconds and try again.`
        : e.message
      setResponseNote({ kind: 'err', text })
      if (e.fieldErrors) setErrors(e.fieldErrors)
    } finally {
      setSending(false)
      loadDetails(form.meterId)
      loadHistory()
    }
  }

  const handleClear = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setResponse(null)
    setResponseIsError(false)
    setResponseNote(null)
    setSelectedId(null)
  }

  const handleSelectHistory = async (id) => {
    try {
      const item = await api.getHistoryItem(id)
      setSelectedId(id)
      if (item.requestJson) {
        const r = JSON.parse(item.requestJson)
        if (r.meterId != null) loadDetails(r.meterId)
        setForm({
          ...EMPTY_FORM,
          messageId: r.messageId ?? '',
          opType: r.opType ?? 'READ',
          meterId: r.meterId != null ? String(r.meterId) : '',
          ipAddress: r.ipAddress ?? '',
          meterTypeId: r.meterTypeId != null ? String(r.meterTypeId) : '',
          reading: r.data?.reading != null ? String(r.data.reading) : '',
          voltage: r.data?.voltage != null ? String(r.data.voltage) : '',
          current: r.data?.current != null ? String(r.data.current) : '',
          power: r.data?.power != null ? String(r.data.power) : '',
        })
      }
      if (item.responseJson) {
        setResponse(JSON.parse(item.responseJson))
        setResponseIsError(!item.success)
        setResponseNote({
          kind: item.success ? 'ok' : 'warn',
          text: item.success ? 'Loaded from history: this request was successful.' : 'Loaded from history: this request failed or got no reply.',
        })
      } else {
        setResponse({ message: 'This request failed and has no response body.' })
        setResponseIsError(true)
        setResponseNote({ kind: 'err', text: 'Loaded from history: the request failed before any reply.' })
      }
      setErrors({})
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleDeleteHistory = async (id) => {
    try {
      await api.deleteHistory(id)
      if (selectedId === id) setSelectedId(null)
      loadHistory()
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadMeters(), loadHistory()])
    setRefreshing(false)
  }

  const handleSaveMeter = async (payload) => {
    const id = meterModal?.meter?.id
    if (id) await api.updateMeter(id, payload)
    else await api.createMeter(payload)
    setMeterModal(null)
    await loadMeters()
    if (details?.meter?.id) loadDetails(details.meter.id)
  }

  const handleDeleteMeter = async (m) => {
    if (!window.confirm(`Delete meter ${m.meterCode}?`)) return
    try {
      await api.deleteMeter(m.id)
      if (details?.meter?.id === m.id) setDetails(null)
      loadMeters()
    } catch (e) {
      showToast(e.message)
    }
  }

  const sim = useSimulation({ meters, reloadMeters: loadMeters })

  const handleSaveSettings = async (data) => {
    const saved = await api.saveSettings(data)
    setSettings(saved)
  }

  const handleClearHistory = async () => {
    await api.clearHistory()
    setSelectedId(null)
    loadHistory()
  }

  const handleNavigate = (key) => {
    setActive(key)
    if (['simulation', 'tariff', 'reports', 'settings'].includes(key)) {
      setPage(key)
      window.scrollTo({ top: 0 })
      return
    }
    setPage('home')
    const target = {
      home: 'top',
      'request-builder': 'request-builder',
      'data-view': 'data-view',
      'meter-reading': 'data-view',
    }[key]
    setTimeout(() => {
      if (target === 'top') window.scrollTo({ top: 0, behavior: 'smooth' })
      else if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="app">
      <Sidebar active={active} onNavigate={handleNavigate} simRunning={sim.running} />
      <div className="main">
        <Topbar name={settings.displayName} />
        <main className="content">
          {page === 'simulation' ? (
            <SimulationPage sim={sim} meters={meters} defaultMessageId={form.messageId} />
          ) : page === 'tariff' ? (
            <TariffPage meters={meters} currency={settings.currency} />
          ) : page === 'reports' ? (
            <ReportsPage meters={meters} currency={settings.currency} />
          ) : page === 'settings' ? (
            <SettingsPage settings={settings} onSave={handleSaveSettings} onClearHistory={handleClearHistory} />
          ) : (
            <>
          <div className="top-grid">
            <HistoryPanel
              items={history}
              selectedId={selectedId}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
            />
            <BuilderPanel
              form={form}
              setForm={setForm}
              meters={meters}
              onSend={handleSend}
              onClear={handleClear}
              sending={sending}
              errors={errors}
            />
            <ResponsePanel response={response} isError={responseIsError} note={responseNote} />
          </div>

          {(details || detailsError) && (
            <MeterDetailsPanel
              details={details}
              liveMeter={details ? meters.find((x) => x.id === details.meter.id) : null}
              error={detailsError}
              onEdit={(m) => setMeterModal({ meter: m })}
              onDelete={handleDeleteMeter}
              onClose={() => {
                setDetails(null)
                setDetailsError('')
              }}
            />
          )}

          <DataPanel
            meters={meters}
            live={live}
            onToggleLive={() => setLive((v) => !v)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            error={dataError}
            onAdd={() => setMeterModal({ meter: null })}
            onEdit={(m) => setMeterModal({ meter: m })}
            onDelete={handleDeleteMeter}
          />
            </>
          )}
        </main>
      </div>
      {meterModal && (
        <MeterModal
          meter={meterModal.meter}
          onClose={() => setMeterModal(null)}
          onSave={handleSaveMeter}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
