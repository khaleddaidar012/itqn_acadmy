export const CAIRO_ZONE = 'Africa/Cairo'
export function cairoDay(value: string) { return new Date(value).toLocaleDateString('en-CA', { timeZone: CAIRO_ZONE }) }
export function localDateTime(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
  const get = (key: string) => parts.find(p => p.type === key)!.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
export function cairoToIso(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) throw new Error('اختر تاريخًا ووقتًا صحيحين')
  const guess = Date.parse(raw + 'Z')
  if (!Number.isFinite(guess)) throw new Error('التاريخ غير صحيح')
  // Try both offsets observed around the date, handling Cairo daylight-saving changes.
  const offsets = [...new Set([-86400000, 0, 86400000].map(delta => new Intl.DateTimeFormat('en-US', { timeZone: CAIRO_ZONE, timeZoneName: 'longOffset' }).formatToParts(guess + delta).find(p => p.type === 'timeZoneName')!.value.replace('GMT', '') || '+00:00'))]
  const matches = offsets.map(offset => new Date(raw + offset).toISOString()).filter(iso => localDateTime(iso) === raw)
  if (matches.length !== 1) throw new Error('هذا الوقت غير موجود أو مكرر بسبب تغيير التوقيت. اختر وقتًا آخر.')
  return matches[0]
}
export function weekDays(week: number) {
  const first = new Date(`${cairoDay(new Date().toISOString())}T12:00:00Z`)
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 1) % 7) + week * 7)
  return Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setUTCDate(day.getUTCDate() + index); return cairoDay(day.toISOString()) })
}
export function weeklyStarts(raw: string, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error('اختر عدد أسابيع من 1 إلى 12')
  return Array.from({ length: count }, (_, index) => { const day = new Date(raw + 'Z'); day.setUTCDate(day.getUTCDate() + index * 7); return cairoToIso(day.toISOString().slice(0, 16)) })
}
export function daySegments(start: string, duration: number, day: string) {
  const from = new Date(start).getTime(); const to = from + duration * 60000
  const a = localDateTime(new Date(from).toISOString()); const b = localDateTime(new Date(to).toISOString())
  const first = a.slice(0, 10); const last = b.slice(0, 10)
  if (day < first || day > last) return null
  const minutes = (value: string) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16))
  const begin = day === first ? minutes(a) : 0
  const end = day === last ? minutes(b) : 1440
  return end > begin ? { begin, end } : null
}
