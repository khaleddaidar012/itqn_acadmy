'use client'
import { useState } from 'react'
import { CalendarDays, ChevronRight, ChevronLeft, Users, GraduationCap, Search } from 'lucide-react'
import type { Lesson } from '@/lib/system/accounting'
import type { User } from '@/lib/system/db'
import { cairoDay } from '@/lib/system/calendar'
import LessonAttendance from './LessonAttendance'

const states: Record<string, { label: string; style: string }> = {
  scheduled: { label: 'مجدولة', style: 'bg-emerald-50 text-emerald-800' },
  attended: { label: 'حضر', style: 'bg-blue-50 text-blue-800' },
  absent: { label: 'غاب', style: 'bg-red-50 text-red-700' },
  postponed: { label: 'مؤجلة', style: 'bg-amber-50 text-amber-800' },
  cancelled: { label: 'ملغاة', style: 'bg-slate-100 text-slate-500' },
  late_cancelled: { label: 'إلغاء متأخر', style: 'bg-orange-50 text-orange-800' },
}
const format = (value: string, options: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', ...options })
type Props = { lessons: Lesson[]; teachers: User[]; students: User[]; days: Date[]; week: number; setWeek: (week: number) => void; openHistory: () => void }
export default function WeeklySchedule({ lessons, teachers, students, days, week, setWeek, openHistory }: Props) {
  const [teacher, setTeacher] = useState('')
  const [student, setStudent] = useState('')
  const [status, setStatus] = useState('')
  const dayKeys = new Set(days.map(d => cairoDay(d.toISOString())))
  const weekLessons = lessons.filter(l => dayKeys.has(cairoDay(l.start)))
  const rows = weekLessons.filter(l => (!teacher || String(l.teacher_id) === teacher) && (!student || String(l.student_id) === student) && (!status || l.status === status)).sort((a, b) => a.start.localeCompare(b.start) || a.teacher_id - b.teacher_id || a.id - b.id)
  const teacherNames = new Map(teachers.map(t => [t.id, t.name]))
  const studentNames = new Map(students.map(s => [s.id, s.name]))
  for (const lesson of lessons) {
    if (!teacherNames.has(lesson.teacher_id)) teacherNames.set(lesson.teacher_id, lesson.teacher_name || 'معلم')
    if (!studentNames.has(lesson.student_id)) studentNames.set(lesson.student_id, lesson.student_name || 'طالب')
  }
  const hasFilters = !!(teacher || student || status)
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">جدول المعلمين والطلاب</h2><p className="text-sm text-slate-500 mt-2">{format(days[0].toISOString(), { day: 'numeric', month: 'long' })} — {format(days[6].toISOString(), { day: 'numeric', month: 'long', year: 'numeric' })} · جميع المواعيد بتوقيت القاهرة</p></div><div className="flex gap-2"><button aria-label="الأسبوع السابق" className="flex items-center gap-1 bg-white border rounded-xl px-3 py-2.5 text-sm" onClick={() => setWeek(week - 1)}><ChevronRight size={16} />السابق</button><button className="bg-white border rounded-xl px-3 py-2.5 text-sm" onClick={() => setWeek(0)}>هذا الأسبوع</button><button aria-label="الأسبوع التالي" className="flex items-center gap-1 bg-white border rounded-xl px-3 py-2.5 text-sm" onClick={() => setWeek(week + 1)}>التالي<ChevronLeft size={16} /></button></div></div>
    <div className="bg-white rounded-2xl border border-[#dfe8e1] p-5"><div className="grid sm:grid-cols-3 gap-4"><label className="text-sm font-medium">المعلم<select className="system-input" value={teacher} onChange={e => setTeacher(e.target.value)}><option value="">كل المعلمين</option>{[...teacherNames].sort((a, b) => a[1].localeCompare(b[1], 'ar')).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="text-sm font-medium">الطالب<select className="system-input" value={student} onChange={e => setStudent(e.target.value)}><option value="">كل الطلاب</option>{[...studentNames].sort((a, b) => a[1].localeCompare(b[1], 'ar')).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="text-sm font-medium">حالة الحصة<select className="system-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">كل الحالات</option>{Object.entries(states).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label></div>{hasFilters && <button className="text-sm text-emerald-700 mt-4" onClick={() => { setTeacher(''); setStudent(''); setStatus('') }}>إلغاء الفلاتر وعرض الجميع</button>}</div>
    <div className="flex flex-wrap gap-3 text-sm"><span className="flex items-center gap-2 rounded-xl bg-[#eaf3ee] px-4 py-2.5"><CalendarDays size={17} />{rows.length} حصة</span><span className="flex items-center gap-2 rounded-xl bg-white border px-4 py-2.5"><Users size={17} />{new Set(rows.map(l => l.teacher_id)).size} معلم في الجدول</span><span className="flex items-center gap-2 rounded-xl bg-white border px-4 py-2.5"><GraduationCap size={17} />{new Set(rows.map(l => l.student_id)).size} طالب في الجدول</span></div>
    <div className="overflow-x-auto rounded-2xl border border-[#dfe8e1] bg-white"><table className="w-full min-w-[850px] text-right text-sm"><caption className="sr-only">جدول جميع حصص المعلمين والطلاب للأسبوع المحدد</caption><thead className="bg-[#edf3ee] text-[#365347]"><tr>{['اليوم والتاريخ', 'موعد الحصة', 'المعلم', 'الطالب', 'المادة', 'المدة', 'حضور الطالب', 'حضور المعلم', 'الحالة', ''].map((label, index) => <th key={index} scope="col" className="px-5 py-4 font-semibold whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{rows.map((lesson, index) => { const state = states[lesson.status]; const startOfDay = index === 0 || cairoDay(rows[index - 1].start) !== cairoDay(lesson.start); return <tr key={lesson.id} className={'border-t border-[#e9eee6] hover:bg-[#f8faf6] ' + (startOfDay && index > 0 ? 'border-t-2' : '')}><td className="px-5 py-4 whitespace-nowrap"><p className="font-semibold">{format(lesson.start, { weekday: 'long' })}</p><p className="text-xs text-slate-500 mt-1">{format(lesson.start, { day: 'numeric', month: 'short' })}</p></td><td className="px-5 py-4 whitespace-nowrap"><p className="font-semibold">{format(lesson.start, { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs text-slate-500 mt-1">إلى {format(new Date(Date.parse(lesson.start) + lesson.duration * 60000).toISOString(), { hour: '2-digit', minute: '2-digit' })}</p></td><td className="px-5 py-4 font-medium">{lesson.teacher_name || teacherNames.get(lesson.teacher_id)}</td><td className="px-5 py-4 font-medium">{lesson.student_name || studentNames.get(lesson.student_id)}</td><td className="px-5 py-4 whitespace-nowrap">{lesson.subject}</td><td className="px-5 py-4 whitespace-nowrap">{lesson.duration} دقيقة</td><td className="px-5 py-4"><LessonAttendance lesson={lesson} who="student" /></td><td className="px-5 py-4"><LessonAttendance lesson={lesson} who="teacher" /></td><td className="px-5 py-4"><span className={'inline-block rounded-full px-3 py-1.5 text-xs whitespace-nowrap ' + (state?.style || 'bg-slate-100')}>{state?.label || lesson.status}</span></td><td className="px-5 py-4"><button className="text-xs text-emerald-800 whitespace-nowrap hover:underline" onClick={openHistory}>سجل الحصص</button></td></tr> })}</tbody></table>{!rows.length && <div className="py-14 px-5 text-center"><Search size={28} className="mx-auto text-slate-300 mb-4" /><p className="font-semibold">{hasFilters ? 'لا توجد حصص مطابقة للفلاتر هذا الأسبوع' : 'لا توجد حصص معيّنة لهذا الأسبوع'}</p><p className="text-sm text-slate-500 mt-2">{hasFilters ? 'غيّر المعلم أو الطالب، أو ألغِ الفلاتر لعرض الجميع.' : 'تنقل بين الأسابيع لعرض الحصص المسجلة، أو أضف مواعيد من تعيين الحصص.'}</p></div>}</div>
  </section>
}
