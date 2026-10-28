const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const istDay = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const istTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** 199900 → "₹1,999" */
export const formatINR = (paise: number): string => inr.format(Math.round(paise) / 100)

/** ISO string → "Sat, 13 Mar · 7:00 PM" (IST) */
export const formatIST = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${istDay.format(d)} · ${istTime.format(d).toUpperCase()}`
}
