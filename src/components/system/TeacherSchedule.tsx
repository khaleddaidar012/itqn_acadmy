'use client'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@/lib/system/db'
import type { Lesson } from '@/lib/system/accounting'
import { cairoToIso, daySegments, weekDays, weeklyStarts } from '@/lib/system/calendar'
const label = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'short' })
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const status: Record<string, string> = { scheduled: 'مجدولة', attended: 'حضر', absent: 'غاب', late_cancelled: 'إلغاء متأخر' }
type Props = { teachers: User[]; students: User[]; lessons: Lesson[]; busy: boolean; act: (body: Record<string, unknown>) => Promise<boolean> }
export default function TeacherSchedule({ teachers, students, lessons, busy, act }: Props) {
  const [teacherId, setTeacherId] = useState('')
  const [week, setWeek] = useState(0)
  const [slot, setSlot] = useState('')
  const [studentId, setStudentId] = useState('')
  const [duration, setDuration] = useState(30)
  const [subject, setSubject] = useState('')
  const [weeks, setWeeks] = useState(1)
  const [error, setError] = useState('')
  const [selectedLesson, setSelectedLesson] = useState<Lesson>()
  const scroll = useRef<HTMLDivElement>(null)
  const editor = useRef<HTMLElement>(null)
  const days = weekDays(week)
  const teacher = teachers.find(t => String(t.id) === teacherId)
  const student = students.find(s => String(s.id) === studentId)
  const subjects: string[] = student ? JSON.parse(student.subjects) : []
  const appointments = lessons.filter(l => String(l.teacher_id) === teacherId && !['cancelled', 'postponed'].includes(l.status))
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 8 * 72 }, [teacherId, week])
  function chooseTeacher(value: string) { setTeacherId(value); setSlot(''); setSelectedLesson(undefined); setError('') }
  function chooseSlot(day: string, minute: number) {
    setError(''); setSelectedLesson(undefined)
    const raw = `${day}T${time(minute)}`
    try { if (Date.parse(cairoToIso(raw)) <= Date.now()) { setError('اختر موعدًا مستقبليًا'); return } } catch (e) { setError((e as Error).message); return }
    setSlot(raw); requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    try {
      const starts = weeklyStarts(slot, weeks)
      if (!teacher || !student || !subjects.includes(subject)) throw new Error('اختر المعلم والطالب والمادة')
      for (const start of starts) {
        const a = Date.parse(start); const b = a + duration * 60000
        if (lessons.some(l => !['cancelled', 'postponed'].includes(l.status) && (l.teacher_id === teacher.id || l.student_id === student.id) && Date.parse(l.start) < b && Date.parse(l.start) + l.duration * 60000 > a)) throw new Error('الموعد يتعارض مع حصة للمعلم أو الطالب ضمن الأسابيع المختارة')
      }
      if (await act({ action: 'schedule', teacher_id: teacher.id, student_id: student.id, subject, starts, duration })) { setSlot(''); setStudentId(''); setSubject(''); setWeeks(1) }
    } catch (e) { setError((e as Error).message) }
  }
  return <section className="space-y-5">
    <div className="bg-white border rounded-2xl p-5 flex flex-wrap gap-5 items-end justify-between"><div><h2 className="text-xl font-bold">تعيين الطلاب وجدول المعلم</h2><p className="text-sm text-slate-500 mt-2">اختر المعلم، ثم اضغط على وقت فارغ لتعيين حصة. كل خانة 15 دقيقة.</p></div><label className="w-full sm:w-72 text-sm font-medium">المعلم<select value={teacherId} onChange={e => chooseTeacher(e.target.value)} className="system-input"><option value="">اختر المعلم…</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}
    {!teacher ? <div className="bg-white border border-dashed rounded-2xl p-12 text-center text-slate-500">اختر معلمًا من القائمة لعرض أيامه وساعاته.</div> : <>
      <div className="flex flex-wrap gap-3 items-center justify-between"><div><h3 className="font-bold">جدول {teacher.name}</h3><p className="text-xs text-slate-500 mt-1">{label(days[0])} — {label(days[6])} • بتوقيت القاهرة</p></div><div className="flex gap-2"><button className="border bg-white rounded-lg px-3 py-2" onClick={() => { setWeek(week - 1); setSlot('') }}>السابق</button><button className="border bg-white rounded-lg px-3 py-2" onClick={() => { setWeek(0); setSlot('') }}>هذا الأسبوع</button><button className="border bg-white rounded-lg px-3 py-2" onClick={() => { setWeek(week + 1); setSlot('') }}>التالي</button></div></div>
      <div ref={scroll} className="max-h-[560px] overflow-auto rounded-2xl border bg-white" aria-label={`الجدول الأسبوعي للمعلم ${teacher.name}`}>
        <div className="min-w-[1060px]">
          <div className="sticky top-0 z-20 grid bg-[#eef5ef] border-b" style={{ gridTemplateColumns: '64px repeat(7, minmax(140px, 1fr))' }}><div className="p-3 text-xs text-slate-500">الوقت</div>{days.map(day => <h4 key={day} className="text-center text-xs font-bold p-3 border-r">{label(day)}</h4>)}</div>
          <div className="grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(140px, 1fr))' }}><div className="relative bg-slate-50" style={{ height: 1728 }}>{Array.from({ length: 24 }, (_, hour) => <span key={hour} className="absolute inset-x-0 text-center text-xs text-slate-500 border-t pt-1" style={{ top: hour * 72 }}>{time(hour * 60)}</span>)}</div>
            {days.map(day => <div key={day} className="relative border-r" style={{ height: 1728 }}>{Array.from({ length: 96 }, (_, index) => <button key={index} type="button" disabled={busy} aria-label={`تعيين حصة ${label(day)} الساعة ${time(index * 15)}`} onClick={() => chooseSlot(day, index * 15)} className={`absolute inset-x-0 w-full hover:bg-emerald-100 focus-visible:bg-emerald-100 focus-visible:outline focus-visible:outline-emerald-600 ${index % 4 === 0 ? 'border-t border-slate-200' : 'border-t border-slate-100'}`} style={{ top: index * 18, height: 18 }} />)}
              {appointments.map(l => { const segment = daySegments(l.start, l.duration, day); if (!segment) return null; return <button key={l.id} type="button" onClick={() => { setSelectedLesson(l); setSlot('') }} title={`${l.student_name} • ${l.subject} • ${l.duration} دقيقة • ${status[l.status] || l.status}`} className={`absolute z-10 inset-x-1 rounded-lg px-2 text-right overflow-hidden border shadow-sm ${l.status === 'late_cancelled' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900'}`} style={{ top: segment.begin * 1.2, height: Math.max(18, (segment.end - segment.begin) * 1.2 - 1) }}><p className="text-[11px] font-bold truncate">{l.student_name}</p><p className="text-[10px] truncate">{time(segment.begin)} — {time(segment.end)} • {l.subject}</p></button> })}
              {slot.startsWith(day) && <div className="absolute z-10 inset-x-1 pointer-events-none border-2 border-dashed border-emerald-600 rounded-lg bg-emerald-50/90 p-1 text-[10px] text-emerald-800" style={{ top: (Number(slot.slice(11, 13)) * 60 + Number(slot.slice(14, 16))) * 1.2, height: Math.min(duration, 1440 - Number(slot.slice(11, 13)) * 60 - Number(slot.slice(14, 16))) * 1.2 }}>حصة جديدة • {duration} دقيقة</div>}
            </div>)}
          </div>
        </div>
      </div>
      {selectedLesson && <div className="bg-white border rounded-2xl p-5"><h3 className="font-bold">{selectedLesson.student_name} • {selectedLesson.subject}</h3><p className="text-sm text-slate-500 mt-2">{new Date(selectedLesson.start).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} • {selectedLesson.duration} دقيقة • {status[selectedLesson.status]}</p><p className="text-xs mt-3">الموعد محجوز. يمكنك تعديل الحالة أو التأجيل والإلغاء من سجل الحصص.</p></div>}
      {slot && <section ref={editor} className="bg-white rounded-2xl border border-emerald-200 p-6"><h3 className="font-bold text-xl mb-5">تعيين حصة للمعلم {teacher.name}</h3><form method="post" onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><label className="text-sm">الطالب المؤكد<select value={studentId} onChange={e => { setStudentId(e.target.value); const s = students.find(u => String(u.id) === e.target.value); setSubject(s ? JSON.parse(s.subjects)[0] || '' : '') }} className="system-input" required><option value="">اختر الطالب…</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm">المادة<select className="system-input" value={subject} onChange={e => setSubject(e.target.value)} required><option value="">اختر المادة…</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label><label className="text-sm">الموعد بتوقيت القاهرة<input type="datetime-local" step={60} value={slot} onChange={e => setSlot(e.target.value)} className="system-input" required /></label><label className="text-sm">مدة الحصة<select className="system-input" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[5, 15, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n} دقيقة</option>)}</select></label><label className="text-sm">عدد الأسابيع<input type="number" min={1} max={12} value={weeks} onChange={e => setWeeks(Number(e.target.value))} className="system-input" required /></label><div className="flex gap-3 items-end"><button disabled={busy} className="system-button">حفظ الحصة</button><button type="button" className="border rounded-xl px-3 py-2" onClick={() => setSlot('')}>إلغاء</button></div></form></section>}
    </>}
  </section>
}
