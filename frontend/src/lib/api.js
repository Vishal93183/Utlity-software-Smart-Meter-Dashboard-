// Frontend backend se seedha connect hota hai (CORS backend me allow hai)
export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081'

async function http(path, options = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw {
      status: 0,
      message: `Cannot reach the backend at ${BASE}. Check that it is running.`,
    }
  }

  if (res.status === 204) return null
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw {
      status: res.status,
      message: body?.message || res.statusText,
      fieldErrors: body?.fieldErrors,
      body,
    }
  }
  return body
}

const json = (method, data) => ({ method, body: JSON.stringify(data) })

export const api = {
  // request builder
  sendRequest: (payload) => http('/api/request/send', json('POST', payload)),

  // history
  getHistory: () => http('/api/history'),
  getHistoryItem: (id) => http(`/api/history/${id}`),
  deleteHistory: (id) => http(`/api/history/${id}`, { method: 'DELETE' }),

  clearHistory: () => http('/api/history', { method: 'DELETE' }),

  // tariff and charges
  getTariff: () => http('/api/tariff'),
  saveTariff: (data) => http('/api/tariff', json('PUT', data)),
  calculateBill: (data) => http('/api/tariff/calculate', json('POST', data)),

  // settings
  getSettings: () => http('/api/settings'),
  saveSettings: (data) => http('/api/settings', json('PUT', data)),
  getSystemInfo: () => http('/api/settings/system'),

  // reports
  getReportSummary: () => http('/api/reports/summary'),
  getRequestReport: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) q.append(k, v)
    })
    const qs = q.toString()
    return http('/api/reports/requests' + (qs ? `?${qs}` : ''))
  },
  getBillingReport: () => http('/api/reports/billing'),

  // meters
  getMeters: () => http('/api/meters'),
  getMeterDetails: (id) => http(`/api/meters/${id}/details`),
  createMeter: (data) => http('/api/meters', json('POST', data)),
  updateMeter: (id, data) => http(`/api/meters/${id}`, json('PUT', data)),
  deleteMeter: (id) => http(`/api/meters/${id}`, { method: 'DELETE' }),
}
