export function participantZoomUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2000) throw Error('الصق رابط دخول اجتماع Zoom الصحيح')
  let url: URL
  try { url = new URL(value.trim()) } catch { throw Error('رابط الاجتماع غير صحيح') }
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !(url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us')) ||
      !/^\/(?:j|wc\/join)\/\d{9,11}\/?$/.test(url.pathname)) throw Error('استخدم رابط دخول المشاركين إلى اجتماع Zoom، وليس رابط بدء المضيف')
  url.hash = ''
  return url.toString()
}
export function lessonAvailable(lesson: {status: string; start: string; completed_at?: string | null}, now = Date.now()) {
  return ['scheduled','attended','absent','late_cancelled'].includes(lesson.status) && !lesson.completed_at && now >= Date.parse(lesson.start) - 300000
}
