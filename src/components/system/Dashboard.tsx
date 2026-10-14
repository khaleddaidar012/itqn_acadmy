'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/system/db'
import type { Lesson } from '@/lib/system/accounting'
import { allowed, type Permission } from '@/lib/system/permissions'
import { ACADEMY_CONTACT } from '@/data/pricing'
import StaffPanel from './StaffPanel'
import StudentsPanel from './StudentsPanel'

type DisplayLesson = Lesson & { minutes?: number; lateMinutes?: number; lateDeduction?: number; earned?: number }
type Progress = { id: number; student_id: number; pages: number; note: string; created: string; teacher_name: string }
type Data = { user: User; users: User[]; staff: User[]; lessons: DisplayLesson[]; progress: Progress[]; reports: { teacher_id: number; start: string; joined: boolean; minutes: number; earned?: number; currency?: string }[]; cancelHours: number }
const statuses: Record<string, string> = { scheduled: 'مجدولة', attended: 'حضر ✅', absent: 'غاب ❌', postponed: 'تم تأجيلها 🔄', cancelled: 'ألغيت في الموعد المسموح 🚫', late_cancelled: 'إلغاء متأخر — تحتسب على الطالب ⚠️' }
const roles: Record<string, string> = { admin: 'مدير الأكاديمية', teacher: 'معلم', student: 'طالب', parent: 'ولي أمر' }
const date = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', ...options })
const money = (value: number, currency: string) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(value)
const decimal = (value: number) => value.toLocaleString('ar-EG', { maximumFractionDigits: 1 })
function cairoDay(value: string) { return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }) }
function cairoMonth(value: string) { return cairoDay(value).slice(0, 7) }
function cairoInput(value: FormDataEntryValue | null) {
  // Determine Cairo's current offset for the selected date, including daylight saving.
  const raw = String(value || '')
  const tentative = Date.parse(raw + 'Z')
  if (!Number.isFinite(tentative)) throw new Error('اختر تاريخًا صحيحًا')
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(tentative)
  const offset = parts.find(p => p.type === 'timeZoneName')?.value.replace('GMT', '') || '+00:00'
  return new Date(raw + offset).toISOString()
}
export default function Dashboard({ locale }: { locale: string }) {
  const router = useRouter()
  const [data, setData] = useState<Data>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  const [accountType, setAccountType] = useState('teacher')
  const [week, setWeek] = useState(0)
  const [month, setMonth] = useState(cairoMonth(new Date().toISOString()))
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/system', { cache: 'no-store' })
      if (response.status === 401) { router.replace(`/${locale}/login`); return }
      const result = await response.json(); if (!response.ok) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات') }
  }, [locale, router])
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 60000); return () => clearInterval(timer) }, [load])
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json(); if (!response.ok) throw new Error(result.error)
      if (body.action === 'logout') { router.replace(`/${locale}/login`); router.refresh() } else { await load(); setNotice('تم حفظ التغيير') }
      return true
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الاتصال بالخادم'); return false } finally { setBusy(false) }
  }
  async function form(event: React.FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault(); const element = event.currentTarget; const values = new FormData(element)
    try {
      const body: Record<string, unknown> = Object.fromEntries(values.entries()); body.action = action
      if (action !== 'createUser' && values.has('manage')) body.manage = values.get('manage') === 'on'
      if (values.has('start')) body.start = cairoInput(values.get('start'))
      if (action === 'schedule') {
        const count = Number(values.get('weeks') || 1)
        const raw = String(values.get('start'))
        body.starts = Array.from({ length: count }, (_, i) => {
          const d = new Date(raw + 'Z'); d.setUTCDate(d.getUTCDate() + i * 7)
          return cairoInput(d.toISOString().slice(0, 16))
        })
      }
      if (await act(body) && action !== 'updateTeacher') element.reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'بيانات غير صحيحة') }
  }
  if (!data) return <main className="pt-32 px-6 text-center" dir="rtl"><p role="status">{error || 'جارٍ تجهيز مساحتك…'}</p>{error && <button onClick={() => void load()} className="system-button mt-4">إعادة المحاولة</button>}</main>
  const { user, users, lessons, progress, staff } = data
  const manage = allowed(user, 'schedule_manage')
  const teamAccess = ['staff_create', 'staff_edit', 'staff_delete', 'pay_view', 'hours_view'].some(p => allowed(user, p as Permission))
  const students = users.filter(u => u.role === 'student' && u.enrollment_status === 'active')
  const allStudents = users.filter(u => u.role === 'student')
  const teachers = users.filter(u => u.role === 'teacher' && !u.disabled)
  const reportTeachers = staff.length ? staff : teachers
  if (user.role === 'student' && user.enrollment_status !== 'active') return <main dir="rtl" className="min-h-screen pt-32 px-4 pb-16 bg-[#f6f8f5] text-[#173b32]"><section className="max-w-xl mx-auto bg-white border rounded-3xl p-8 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-3xl mb-5">✓</div><h1 className="text-2xl font-bold">تم تسجيل حسابك</h1><p className="mt-4 text-slate-600 leading-8">الرجاء الانتظار لحين تأكيد حسابك بعد مراجعة الاشتراك. بمجرد التأكيد ستظهر هنا حصصك والمواعيد التي تحددها الإدارة.</p><a href={`https://wa.me/${ACADEMY_CONTACT.whatsappRaw}?text=${encodeURIComponent('مرحبًا، سجلت حساب طالب وأرغب في متابعة الاشتراك وتأكيد الحساب.') }`} target="_blank" rel="noopener noreferrer" className="system-button inline-block mt-6">تواصل مع الأكاديمية على واتساب</a><div className="flex justify-center gap-4 mt-6"><button className="text-sm text-emerald-700" onClick={() => void load()}>التحقق من تأكيد الحساب</button><button disabled={busy} className="text-sm text-slate-500" onClick={() => void act({ action: 'logout' })}>تسجيل الخروج</button></div>{error && <p role="alert" className="text-red-700 mt-4">{error}</p>}</section></main>
  const monthLessons = lessons.filter(l => cairoMonth(l.start) === month)
  const ownLessons = monthLessons.filter(l => l.teacher_id === user.id)
  const weekStart = new Date(`${cairoDay(new Date().toISOString())}T12:00:00Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 1) % 7) + week * 7)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + i); return d })
  const weekLessons = lessons.filter(l => days.some(d => cairoDay(d.toISOString()) === cairoDay(l.start)))
  const tabs = [{ id: 'overview', label: 'نظرة عامة' }, ...(teamAccess ? [{ id: 'accounts', label: 'المعلمون والموظفون' }] : []), ...(allowed(user, 'students_manage') ? [{ id: 'students', label: 'الطلاب وطلبات التسجيل' }] : []), { id: 'week', label: 'الجدول الأسبوعي' }, { id: 'history', label: 'سجل الحصص' }, { id: 'progress', label: 'تقدم الحفظ' }, ...(manage ? [{ id: 'schedule', label: 'تعيين الحصص' }] : []),  { id: 'settings', label: 'حسابي' }]
  const field = (label: string, name: string, type = 'text', extra: Record<string, unknown> = {}) => <label className="block text-sm">{label}<input className="system-input" name={name} type={type} required {...extra} /></label>
  const selectUser = (label: string, name: string, list: User[]) => <label className="block text-sm">{label}<select className="system-input" name={name} required defaultValue=""><option value="" disabled>اختر…</option>{list.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
  function lessonCard(l: DisplayLesson) {
    const end = Date.parse(l.start) + l.duration * 60000
    const open = Date.now() >= Date.parse(l.start) - 300000 && Date.now() < end
    const editable = ['scheduled', 'attended', 'absent'].includes(l.status)
    const current = ['scheduled', 'attended', 'absent', 'late_cancelled'].includes(l.status)
    return <article key={l.id} className="border border-[#dfe8e1] bg-white rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{l.subject} • {l.student_name}</h3><p className="text-sm text-slate-500 mt-1">المعلم: {l.teacher_name}</p></div><span className="text-xs rounded-full bg-[#eef5ef] px-3 py-2 h-fit">{statuses[l.status]}</span></div>
      <p className="text-sm">{date(l.start, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} • {l.duration} دقيقة</p>
      {user.role === 'teacher' && l.teacher_id === user.id && <div className="text-sm bg-slate-50 rounded-xl p-3">{l.joined ? `دخولك: ${date(l.joined, { hour: '2-digit', minute: '2-digit' })} • تأخير ${decimal(l.lateMinutes || 0)} دقيقة • قيمة دقائق التأخير ${money(l.lateDeduction || 0, l.currency)}` : 'لم تسجّل دخول الحصة بعد'}<p>دقائق الحضور المسجلة: {decimal(l.minutes || 0)} • المستحق حتى الآن: {money(l.earned || 0, l.currency)}</p></div>}
      <div className="flex flex-wrap gap-2 text-sm">
        {user.role === 'teacher' && l.teacher_id === user.id && current && open && !l.left_at && <button disabled={busy} className="system-button" onClick={() => void act({ action: l.joined ? 'leave' : 'join', id: l.id })}>{l.joined ? 'إنهاء حضور الحصة' : 'تسجيل دخول الحصة'}</button>}
        {user.role === 'teacher' && l.teacher_id === user.id && current && Date.now() >= end && <span className="text-slate-500">انتهت الفترة المحددة للحصة</span>}
        {(allowed(user, 'attendance_manage') || user.role === 'teacher' && l.teacher_id === user.id) && editable && Date.now() >= Date.parse(l.start) && <><button disabled={busy} className="system-button" onClick={() => void act({ action: 'attendance', id: l.id, status: 'attended' })}>الطالب حضر</button><button disabled={busy} className="px-3 py-2 rounded-xl border" onClick={() => void act({ action: 'attendance', id: l.id, status: 'absent' })}>الطالب غاب</button></>}
        {(manage || ['student', 'parent'].includes(user.role)) && l.status === 'scheduled' && !l.joined && Date.parse(l.start) > Date.now() && <button disabled={busy} className="px-3 py-2 rounded-xl border border-amber-300 text-amber-800" onClick={() => { const late = Date.parse(l.start) - Date.now() < data!.cancelHours * 3600000; if (window.confirm(late ? 'الإلغاء متأخر وستُحتسب الحصة على الطالب. تأكيد الإلغاء؟' : 'تأكيد إلغاء الحصة في المهلة المسموحة؟')) void act({ action: 'cancel', id: l.id }) }}>إلغاء الحصة</button>}
      </div>
      {manage && l.status === 'scheduled' && !l.joined && <details><summary className="cursor-pointer text-sm text-emerald-700">تأجيل إلى موعد آخر</summary><form onSubmit={e => void form(e, 'postpone')} className="flex flex-wrap items-end gap-3 mt-3"><input type="hidden" name="id" value={l.id} />{field('الموعد الجديد بتوقيت القاهرة', 'start', 'datetime-local')}<button disabled={busy} className="system-button">حفظ الموعد الجديد</button></form></details>}
      {user.role === 'teacher' && l.teacher_id === user.id && l.joined && l.subject === 'حفظ القرآن' && ['scheduled', 'attended'].includes(l.status) && <details><summary className="cursor-pointer text-sm text-emerald-700">توثيق الحفظ والمراجعة</summary><form onSubmit={e => void form(e, 'progress')} className="space-y-3 mt-3"><input type="hidden" name="id" value={l.id} />{field('إجمالي الصفحات المتقنة حتى الآن من 604', 'pages', 'number', { min: 0, max: 604 })}<label className="block text-sm">ما تم حفظه ومراجعته<textarea name="note" required maxLength={2000} className="system-input" /></label><button disabled={busy} className="system-button">حفظ التقدم</button></form></details>}
    </article>
  }
  return <main dir="rtl" className="min-h-screen pt-28 pb-16 bg-[#f6f8f5] text-[#173b32] px-4 sm:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start gap-4 mb-8"><div><p className="text-sm text-emerald-700">أكاديمية إتقان / {roles[user.role]}{user.manage && user.role === 'teacher' ? ' • مسؤول الجداول' : ''}</p><h1 className="text-3xl sm:text-4xl font-bold mt-2">أهلًا، {user.name}</h1><p className="text-slate-500 text-sm mt-3">كل حصة لها أثر. تابع جدولك، حضورك، ورحلة الحفظ في مكان واحد.</p></div><button disabled={busy} onClick={() => void act({ action: 'logout' })} className="border rounded-xl bg-white px-4 py-2 text-sm">خروج</button></div>
      <nav aria-label="أقسام النظام" className="flex gap-2 overflow-x-auto pb-3 mb-5">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm ${tab === t.id ? 'bg-[#10634f] text-white' : 'bg-white border border-[#dfe8e1]'}`}>{t.label}</button>)}</nav>
      <div aria-live="polite">{error && <p role="alert" className="p-4 mb-4 rounded-xl bg-red-50 text-red-700">{error}</p>}{notice && <p className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-800">{notice}</p>}</div>
      {tab === 'overview' && <>
        {(teamAccess || allowed(user, 'students_manage') || manage) && <section className="bg-white rounded-2xl border border-emerald-100 p-6 mb-6"><h2 className="text-xl font-bold">إدارة فريق الأكاديمية</h2><p className="text-sm text-slate-500 mt-2 mb-5">أضف معلمين وموظفين وحدد من يدير الطلاب والجداول.</p><div className="flex flex-wrap gap-3">{allowed(user, 'staff_create') && <button className="system-button" onClick={() => { setAccountType('teacher'); setTab('accounts') }}>+ إضافة معلم</button>}{user.role === 'admin' && <button className="system-button" onClick={() => { setAccountType('manager'); setTab('accounts') }}>+ إضافة مسؤول سيستم</button>}{teamAccess && <button className="border rounded-xl px-4 py-3" onClick={() => setTab('accounts')}>عرض الفريق والصلاحيات</button>}{allowed(user, 'students_manage') && <button className="system-button" onClick={() => setTab('students')}>الطلاب وطلبات التسجيل ({allStudents.filter(s => s.enrollment_status === 'pending').length})</button>}{manage && <button className="border rounded-xl px-4 py-3" onClick={() => setTab('schedule')}>تعيين الحصص والمواعيد</button>}</div></section>}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">{[['حصص هذا الأسبوع', weekLessons.filter(l => !['postponed', 'cancelled'].includes(l.status)).length], ['حضور الطلاب هذا الأسبوع', weekLessons.filter(l => l.status === 'attended').length], ['حصص قادمة', lessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).length]].map(([label, value]) => <div key={String(label)} className="bg-white rounded-2xl border p-6"><p className="text-sm text-slate-500">{label}</p><p className="text-4xl font-bold mt-3">{value}</p></div>)}</div>
        {(user.role === 'teacher' || allowed(user, 'hours_view')) && <section className="bg-white border rounded-2xl p-6 mb-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-xl">{user.role === 'teacher' ? 'ساعاتي ومستحقاتي' : 'أداء المعلمين'}</h2><label className="text-sm">الشهر<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="system-input" /></label></div>
          {user.role === 'teacher' && <div className="grid sm:grid-cols-3 gap-4 mt-5"><p>حضور مسجل<br /><strong className="text-2xl">{decimal(ownLessons.reduce((s, l) => s + (l.minutes || 0), 0) / 60)} ساعة</strong></p><p>ساعات متبقية مجدولة<br /><strong className="text-2xl">{decimal(ownLessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).reduce((s, l) => s + l.duration / 60, 0))}</strong></p><p>مستحق الشهر<br /><strong className="text-2xl">{money(ownLessons.filter(l => l.currency === 'EGP').reduce((s, l) => s + (l.earned || 0), 0), 'EGP')}</strong><br /><strong>{money(ownLessons.filter(l => l.currency === 'USD').reduce((s, l) => s + (l.earned || 0), 0), 'USD')}</strong></p></div>}
          {allowed(user, 'hours_view') && <div className="overflow-x-auto mt-5"><table className="w-full text-sm text-right"><caption className="text-right text-slate-500 mb-3">حضور المعلمين خلال الأسبوع المعروض، ومستحقات الشهر المختار حسب العملة</caption><thead><tr className="border-b"><th className="p-3">المعلم</th><th>حصص دخلها هذا الأسبوع</th><th>ساعات الشهر</th><th>ج.م</th><th>USD</th></tr></thead><tbody>{reportTeachers.map(t => { const monthly = (data.reports || []).filter(l => l.teacher_id === t.id && cairoMonth(l.start) === month); return <tr key={t.id} className="border-b"><td className="p-3">{t.name}</td><td>{(data.reports || []).filter(l => l.teacher_id === t.id && l.joined && days.some(d => cairoDay(d.toISOString()) === cairoDay(l.start))).length}</td><td>{decimal(monthly.reduce((s, l) => s + (l.minutes || 0), 0) / 60)}</td><td>{allowed(user, 'pay_view') ? money(monthly.filter(l => l.currency === 'EGP').reduce((s, l) => s + (l.earned || 0), 0), 'EGP') : '—'}</td><td>{allowed(user, 'pay_view') ? money(monthly.filter(l => l.currency === 'USD').reduce((s, l) => s + (l.earned || 0), 0), 'USD') : '—'}</td></tr> })}</tbody></table>{!reportTeachers.length && <p className="p-4 text-slate-500">لم تُضف حسابات معلمين بعد.</p>}</div>}
          <p className="text-xs text-slate-500 mt-5">المستحق يعتمد على دقائق الحضور المسجلة داخل موعد الحصة. التسجيل هنا لا يثبت حضور اجتماع خارجي.</p>
        </section>}
        <h2 className="text-xl font-bold mb-4">حصصك القادمة</h2><div className="grid md:grid-cols-2 gap-4">{lessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4).map(lessonCard)}</div>{!lessons.length && <Empty />}
      </>}
      {tab === 'week' && <><div className="flex flex-wrap justify-between gap-3 mb-5"><h2 className="font-bold text-xl">{date(days[0].toISOString(), { day: 'numeric', month: 'long' })} — {date(days[6].toISOString(), { day: 'numeric', month: 'long' })}</h2><div className="flex gap-2"><button className="border rounded-lg px-3 py-2" onClick={() => setWeek(week - 1)}>السابق</button><button className="border rounded-lg px-3 py-2" onClick={() => setWeek(0)}>هذا الأسبوع</button><button className="border rounded-lg px-3 py-2" onClick={() => setWeek(week + 1)}>التالي</button></div></div><p className="text-sm text-slate-500 mb-4">جميع المواعيد بتوقيت القاهرة</p><div className="grid md:grid-cols-2 xl:grid-cols-7 gap-3">{days.map(day => <section key={day.toISOString()} className="bg-[#edf3ee] rounded-2xl p-3 min-h-48"><h3 className="text-sm font-bold mb-3">{date(day.toISOString(), { weekday: 'long', day: 'numeric' })}</h3>{weekLessons.filter(l => cairoDay(l.start) === cairoDay(day.toISOString())).sort((a, b) => a.start.localeCompare(b.start)).map(l => <button key={l.id} className="bg-white w-full p-3 rounded-xl text-right mb-2 border text-xs space-y-2" onClick={() => setTab('history')}><p className="font-bold">{date(l.start, { hour: '2-digit', minute: '2-digit' })} • {l.duration} د</p><p>{l.student_name}</p><p>{l.teacher_name} • {l.subject}</p><p className="text-emerald-700">{statuses[l.status]}</p></button>)}</section>)}</div></>}
      {tab === 'history' && <><h2 className="text-xl font-bold mb-2">السجل الكامل للحصص</h2><p className="text-sm text-slate-500 mb-5">الإلغاء قبل {data.cancelHours} ساعة مسموح، والإلغاء بعد ذلك يحتسب على الطالب.</p><div className="grid md:grid-cols-2 gap-4">{lessons.map(lessonCard)}</div>{!lessons.length && <Empty />}</>}
      {tab === 'progress' && <><h2 className="text-xl font-bold mb-5">رحلة حفظ القرآن</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{students.map(s => <article key={s.id} className="bg-white p-6 rounded-2xl border"><h3 className="font-bold">{s.name}</h3><p className="text-3xl font-bold my-4">{decimal(s.pages / 604 * 100)}٪</p><progress aria-label={`تقدم حفظ ${s.name}`} max={604} value={s.pages} className="w-full accent-emerald-700" /><p className="text-sm text-slate-500 mt-3">{s.pages} صفحة متقنة من 604</p></article>)}</div><p className="text-sm text-slate-500 mb-4">النسبة توثيق المعلم للصفحات المتقنة، ويظهر أدناه سجل الملاحظات.</p>{progress.map(p => <article key={p.id} className="bg-white p-5 rounded-xl border mb-3"><p className="font-bold">{users.find(u => u.id === p.student_id)?.name || 'الطالب'} • {p.pages} صفحة</p><p className="my-2 whitespace-pre-wrap">{p.note}</p><p className="text-xs text-slate-500">{p.teacher_name} • {date(p.created)}</p></article>)}{!progress.length && <p className="text-slate-500">لا توجد ملاحظات حفظ مسجلة بعد.</p>}</>}
      {tab === 'schedule' && manage && <section className="max-w-2xl bg-white rounded-2xl border p-6"><h2 className="text-xl font-bold mb-5">تعيين حصة جديدة</h2><form onSubmit={e => void form(e, 'schedule')} className="grid sm:grid-cols-2 gap-5">{selectUser('المعلم', 'teacher_id', teachers)}{selectUser('الطالب', 'student_id', students)}<label className="block text-sm">المادة<select name="subject" className="system-input">{['حفظ القرآن', 'التجويد', 'اللغة العربية'].map(s => <option key={s}>{s}</option>)}</select></label>{field('التاريخ والوقت بتوقيت القاهرة', 'start', 'datetime-local')}{field('مدة الحصة بالدقائق', 'duration', 'number', { min: 15, max: 180, defaultValue: 30 })}{field('تكرار أسبوعي — عدد الأسابيع', 'weeks', 'number', { min: 1, max: 12, defaultValue: 1 })}<div className="flex items-end"><button disabled={busy} className="system-button">إضافة للجدول</button></div></form><p className="text-xs text-slate-500 mt-5">مواد الطلاب: {students.map(s => `${s.name}: ${JSON.parse(s.subjects).join('، ')}`).join(' • ') || 'لم يسجل طلاب بعد'}</p></section>}
      {tab === 'settings' && <section className="max-w-md bg-white rounded-2xl border p-6"><h2 className="text-xl font-bold mb-5">تغيير كلمة المرور</h2><form onSubmit={e => void form(e, 'changePassword')} className="space-y-5">{field('كلمة المرور الحالية', 'oldPassword', 'password', { autoComplete: 'current-password' })}{field('كلمة المرور الجديدة — 12 حرفًا على الأقل', 'password', 'password', { minLength: 12, maxLength: 256, autoComplete: 'new-password' })}<button disabled={busy} className="system-button">حفظ كلمة المرور</button></form><p className="text-xs text-slate-500 mt-4">يتم تسجيل الخروج من باقي الأجهزة بعد تغيير كلمة المرور.</p></section>}
      {tab === 'accounts' && teamAccess && <StaffPanel user={user} staff={staff} busy={busy} initialType={accountType} act={act} />}
      {tab === 'students' && allowed(user, 'students_manage') && <StudentsPanel students={allStudents} busy={busy} act={act} />}
      {tab === 'accounts' && user.role === 'admin' && <section className="bg-white rounded-2xl border p-6 mt-6"><h2 className="text-xl font-bold mb-5">ربط ولي الأمر بالطالب</h2><form onSubmit={e => void form(e, 'linkParent')} className="grid sm:grid-cols-3 gap-5">{selectUser('الطالب', 'student_id', students)}{selectUser('ولي الأمر', 'parent_id', users.filter(u => u.role === 'parent'))}<button disabled={busy} className="system-button self-end">ربط الحسابين</button></form></section>}
    </div>
  </main>
}
function Empty() { return <div className="border border-dashed rounded-2xl text-center p-12 text-slate-500">لا توجد حصص بعد. ستظهر هنا بمجرد تعيينها من الإدارة.</div> }
