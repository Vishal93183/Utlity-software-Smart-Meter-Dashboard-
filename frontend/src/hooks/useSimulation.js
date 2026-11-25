import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const MAX_POINTS = 30
const MAX_LOG = 60

export const DEFAULT_CONFIG = {
  mode: 'device',   // 'device' = MQTT device ko READ bhejo | 'browser' = browser me random values
  messageId: '',    // device mode: jis topic par device jawab deta hai
  intervalSec: 5,
  // browser mode
  vMin: 225,
  vMax: 235,
  aMin: 4,
  aMax: 7,
  speed: 60,        // 1 real second = 60 simulated seconds
  offlinePct: 0,    // har tick par meter offline hone ka chance (%)
}

const rand = (a, b) => a + Math.random() * (b - a)
const r1 = (v) => Math.round(v * 10) / 10
const r2 = (v) => Math.round(v * 100) / 100
const fmt = (v) => (v === null || v === undefined ? '--' : v)
const clock = () => new Date().toLocaleTimeString('en-GB')

const base = (m, status) => ({
  meterCode: m.meterCode,
  meterTypeId: m.meterTypeId ?? null,
  ipAddress: m.ipAddress ?? null,
  status,
})

/**
 * Do modes:
 *
 * device  : har tick par chune hue meter ko POST /api/request/send (READ) bhejta hai.
 *           Backend request ko MQTT par publish karta hai, device ka jawab database me
 *           save karta hai aur wahi yahan dikhta hai. Meters ek ek karke poll hote hain,
 *           kyunki ek Message ID par ek samay me ek hi request chal sakti hai.
 *
 * browser : browser khud random voltage / current / power / reading banata hai aur
 *           PUT /api/meters/{id} se database me likhta hai (MQTT use nahi hota).
 */
export function useSimulation({ meters, reloadMeters }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [selected, setSelected] = useState([])
  const [running, setRunning] = useState(false)
  const [ticks, setTicks] = useState(0)
  const [log, setLog] = useState([])
  const [series, setSeries] = useState([])
  const [error, setError] = useState('')

  const metersRef = useRef(meters)
  const cfgRef = useRef(config)
  const selRef = useRef(selected)
  const reloadRef = useRef(reloadMeters)
  metersRef.current = meters
  cfgRef.current = config
  selRef.current = selected
  reloadRef.current = reloadMeters

  const readings = useRef({})
  const busy = useRef(false)
  const fails = useRef(0)
  const initialised = useRef(false)

  useEffect(() => {
    if (!initialised.current && meters.length > 0) {
      initialised.current = true
      setSelected(meters.map((m) => m.id))
    }
  }, [meters])

  // ---------------- device (MQTT) ----------------
  async function pollDevice(m, cfg, entries, point) {
    if (!m.ipAddress) {
      point.p[m.id] = null
      entries.push({ kind: 'err', text: `${m.meterCode}   no IP address saved. Edit the meter and add one.` })
      return null
    }
    try {
      const res = await api.sendRequest({
        messageId: cfg.messageId.trim(),
        opType: 'READ',
        meterId: m.id,
        ipAddress: m.ipAddress,
      })
      const d = res.meters?.[0]?.data
      if (res.ipStatus) {
        point.p[m.id] = d?.power ?? null
        entries.push({
          kind: 'ok',
          text: `${m.meterCode}   ${fmt(d?.voltage)} V   ${fmt(d?.current)} A   ${fmt(d?.power)} W   ${fmt(d?.reading)} kWh`,
        })
      } else {
        point.p[m.id] = null
        entries.push({ kind: 'off', text: `${m.meterCode}   no reply from the device (marked offline)` })
      }
      return null
    } catch (e) {
      point.p[m.id] = null
      entries.push({ kind: 'err', text: `${m.meterCode}   ${e.message}` })
      // backend band / broker problem -> hard error
      return e.status === 0 || e.status === 502 ? e.message : null
    }
  }

  // ---------------- browser ----------------
  async function simulateLocal(m, cfg, entries, point) {
    if (Math.random() * 100 < cfg.offlinePct) {
      point.p[m.id] = null
      entries.push({ kind: 'off', text: `${m.meterCode}   went OFFLINE (simulated fault)` })
      await api.updateMeter(m.id, base(m, 'OFFLINE'))
      return
    }
    const voltage = r1(rand(cfg.vMin, cfg.vMax))
    const current = r1(rand(cfg.aMin, cfg.aMax))
    const power = r1(voltage * current)
    const prev = readings.current[m.id] ?? m.reading ?? 0
    const reading = r2(prev + (power / 1000) * ((cfg.intervalSec * cfg.speed) / 3600))
    readings.current[m.id] = reading

    point.p[m.id] = power
    entries.push({ kind: 'ok', text: `${m.meterCode}   ${voltage} V   ${current} A   ${power} W   ${reading} kWh` })
    await api.updateMeter(m.id, { ...base(m, 'ONLINE'), voltage, current, power, reading })
  }

  const runTick = useCallback(async () => {
    if (busy.current) return
    busy.current = true

    const cfg = cfgRef.current
    const targets = metersRef.current.filter((m) => selRef.current.includes(m.id))
    const entries = []
    const point = { t: Date.now(), p: {} }
    let hardError = null

    try {
      for (const m of targets) {
        if (cfg.mode === 'device') {
          hardError = (await pollDevice(m, cfg, entries, point)) || hardError
        } else {
          await simulateLocal(m, cfg, entries, point)
        }
      }
      await reloadRef.current()
    } catch (e) {
      hardError = e.message
      entries.push({ kind: 'err', text: e.message })
    } finally {
      busy.current = false
    }

    if (hardError) {
      fails.current += 1
      setError(hardError)
      if (fails.current >= 3) {
        setRunning(false)
        entries.push({ kind: 'err', text: 'Stopped after 3 failed updates in a row.' })
      }
    } else {
      fails.current = 0
      setError('')
    }

    const time = clock()
    setLog((l) => [...entries.map((e) => ({ ...e, time })).reverse(), ...l].slice(0, MAX_LOG))
    if (Object.keys(point.p).length > 0) setSeries((s) => [...s, point].slice(-MAX_POINTS))
    setTicks((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(runTick, config.intervalSec * 1000)
    return () => clearInterval(id)
  }, [running, config.intervalSec, runTick])

  const start = () => {
    if (selRef.current.length === 0) {
      setError('Select at least one meter.')
      return
    }
    readings.current = {}
    fails.current = 0
    setError('')
    setRunning(true)
    runTick()
  }

  const stop = () => setRunning(false)

  const clear = () => {
    setLog([])
    setSeries([])
    setTicks(0)
    setError('')
  }

  return { config, setConfig, selected, setSelected, running, start, stop, clear, ticks, log, series, error }
}
