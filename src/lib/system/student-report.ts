export type ReportLesson = { id: number; start: string; duration: number; status: string; subject: string; teacher_name: string }
export type ReportProgress = { id: number; pages: number; created: string; note: string }
export type StudentReport = {
  version: 1; student: string; month: string; previousMonth: string; generated: string;
  previous: { hours: number; attended: number; pages: number | null };
  current: { hours: number; attended: number; pages: number | null };
  lessons: ReportLesson[]; notes: ReportProgress[];
}
export function monthOf(iso: string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).format(new Date(iso)) }
export function makeStudentReport(student: string, month: string, lessons: ReportLesson[], progress: ReportProgress[], now = new Date().toISOString()): StudentReport {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month) || month > monthOf(now)) throw new Error('اختر شهرًا صحيحًا لا يتجاوز الشهر الحالي')
  const [year, mm] = month.split('-').map(Number)
  const previousMonth = new Date(Date.UTC(year, mm - 2, 15)).toISOString().slice(0, 7)
  const completed = lessons.filter(l => Date.parse(l.start) + l.duration * 60000 <= Date.parse(now))
  const snapshot = (period: string) => {
    const attendance = completed.filter(l => monthOf(l.start) === period && l.status === 'attended')
    const last = progress.filter(p => Date.parse(p.created) <= Date.parse(now) && monthOf(p.created) <= period).sort((a, b) => b.created.localeCompare(a.created) || b.id - a.id)[0]
    return { hours: attendance.reduce((s, l) => s + l.duration / 60, 0), attended: attendance.length, pages: last ? last.pages : null }
  }
  return { version: 1, student, month, previousMonth, generated: now, previous: snapshot(previousMonth), current: snapshot(month), lessons: completed.filter(l => monthOf(l.start) === month).sort((a, b) => a.start.localeCompare(b.start)), notes: progress.filter(p => monthOf(p.created) === month && p.created <= now).sort((a, b) => a.created.localeCompare(b.created)) }
}
