const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

// "05 Oct 2026 22:10:15"
export function formatDateTime(value) {
  if (!value) return '--'
  const d = new Date(value)
  if (isNaN(d)) return '--'
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const num = (v) => (v === null || v === undefined ? '--' : v)

// money: money(1234.5, '₹') -> '₹ 1,234.50'
export function money(value, currency = '₹') {
  if (value === null || value === undefined || value === '') return '--'
  return `${currency} ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
