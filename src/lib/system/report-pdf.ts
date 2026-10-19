import { jsPDF } from 'jspdf'
import assets from './report-assets.json'
import type { StudentReport } from './student-report'
const number = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })
const period = (value: string) => new Date(value + '-15T12:00:00Z').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' })
export function reportPdf(report: StudentReport) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  pdf.addFileToVFS('Amiri.ttf', assets.font); pdf.addFont('Amiri.ttf', 'Amiri', 'normal'); pdf.setFont('Amiri')
  pdf.setProperties({ title: 'تقرير تقدم الطالب - أكاديمية إتقان', author: 'أكاديمية إتقان', subject: 'تقرير متابعة شهري لولي الأمر' })
  let page = 0
  function text(value: string, x: number, y: number, size = 13, align: 'right' | 'left' | 'center' = 'right') {
    // jsPDF's Arabic processor and bidi engine already order Unicode Arabic.
    pdf.setFontSize(size); pdf.setR2L(false); pdf.text(value, x, y, { align })
  }
  function header() {
    page++; pdf.setFillColor(19, 94, 73); pdf.rect(0, 0, 210, 4, 'F')
    pdf.addImage('data:image/png;base64,' + assets.logo, 'PNG', 169, 12, 23, 23)
    pdf.setTextColor(23, 59, 50); text('أكاديمية إتقان', 162, 22, 21); text('تقرير متابعة الطالب لولي الأمر', 162, 32, 12)
    pdf.setDrawColor(218, 228, 221); pdf.line(18, 42, 192, 42)
    pdf.setTextColor(105, 120, 113); text('أخلص النية لله سبحانه وتعالى', 105, 282, 11, 'center'); text(`أكاديمية إتقان • صفحة ${number(page)}`, 105, 290, 9, 'center')
    pdf.setTextColor(23, 59, 50)
  }
  header()
  let nameSize = 20
  pdf.setFontSize(nameSize)
  while (nameSize > 10 && pdf.getTextWidth(report.student) > 170) { nameSize--; pdf.setFontSize(nameSize) }
  const nameLines = pdf.splitTextToSize(report.student, 174) as string[]
  nameLines.forEach((line, index) => text(line, 192, 55 + index * 6, nameSize))
  text(`تقرير ${period(report.month)}`, 192, 72, 13)
  text(`صدر في ${new Date(report.generated).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })} • المواعيد بتوقيت القاهرة`, 192, 81, 10)
  pdf.setFillColor(240, 246, 242); pdf.roundedRect(18, 86, 174, 57, 3, 3, 'F')
  text('مقارنة الحضور وتقدم الحفظ', 184, 97, 15)
  text('الشهر', 182, 110, 11); text('ساعات الحضور', 112, 110, 11); text('الصفحات المتقنة', 56, 110, 11)
  const pages = (n: number | null) => n === null ? 'غير موثق' : `${number(n)} من ٦٠٤`
  ;([[report.previousMonth, report.previous], [report.month, report.current]] as const).forEach(([m, item], i) => {
    const y = 122 + i * 12; text(period(m), 182, y, 12); text(number(item.hours), 100, y, 13); text(pages(item.pages), 56, y, 12)
  })
  let y = 155
  text(`حصص حضرها الطالب هذا الشهر: ${number(report.current.attended)}`, 192, y, 14); y += 10
  if (report.current.pages !== null && report.previous.pages !== null) {
    text(`تغير الصفحات المتقنة عن الشهر السابق: ${number(report.current.pages - report.previous.pages)}`, 192, y, 12); y += 10
  }
  text('ساعات الحضور = مدد الحصص المنتهية التي سُجل فيها الطالب حاضرًا.', 192, y, 10); y += 7
  text('الحفظ وفق آخر توثيق متاح حتى نهاية الشهر أو وقت إصدار التقرير.', 192, y, 10); y += 7
  text('الحصص الملغاة والغائبة لا تُضاف إلى ساعات حضور الطالب.', 192, y, 10); y += 15
  const states: Record<string, string> = { attended: 'حضر', absent: 'غاب', cancelled: 'ألغيت', late_cancelled: 'إلغاء متأخر', postponed: 'تأجلت', scheduled: 'لم يسجل الحضور' }
  function nextSpace(height: number) { if (y + height > 267) { pdf.addPage(); header(); y = 54 } }
  text('سجل الحصص المنتهية خلال الشهر', 192, y, 15); y += 10
  if (!report.lessons.length) { text('لا توجد حصص منتهية مسجلة خلال هذا الشهر.', 192, y, 12); y += 12 }
  for (const lesson of report.lessons) {
    nextSpace(23)
    const when = new Date(lesson.start).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' })
    pdf.setFillColor(247, 249, 247); pdf.rect(18, y - 5, 174, 20, 'F')
    text(`${when} • ${lesson.subject}`, 188, y + 1, 12)
    text(`${states[lesson.status] || lesson.status} • ${number(lesson.duration)} دقيقة`, 25, y + 1, 11, 'left')
    const teacher = `المعلم: ${lesson.teacher_name}`
    pdf.setFontSize(11)
    text(teacher, 188, y + 10, Math.min(11, 11 * 160 / Math.max(1, pdf.getTextWidth(teacher)))); y += 25
  }
  if (report.notes.length) { nextSpace(20); text('ملاحظات المعلم خلال الشهر', 192, y, 15); y += 10 }
  for (const note of report.notes) {
    // Wrap manually before shaping; jsPDF shapes and orders each Arabic line itself.
    pdf.setFontSize(12)
    const lines = pdf.splitTextToSize(note.note, 165) as string[]
    nextSpace(18); text(`${number(note.pages)} صفحة متقنة • ${new Date(note.created).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}`, 192, y, 11); y += 8
    for (const line of lines) { nextSpace(8); text(line, 192, y, 12); y += 7 }
    y += 6
  }
  return new Uint8Array(pdf.output('arraybuffer'))
}
