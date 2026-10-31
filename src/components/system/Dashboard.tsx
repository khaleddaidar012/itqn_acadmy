'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/system/db'
import { accounting, type Lesson } from '@/lib/system/accounting'
import { allowed, type Permission } from '@/lib/system/permissions'
import { ACADEMY_CONTACT } from '@/data/pricing'
import StaffPanel from './StaffPanel'
import ProgressArc from './ProgressArc'
import ReportsPanel from './ReportsPanel'
import BackupSettings from './BackupSettings'
import SystemHeader from './SystemHeader'
import PaymentsPanel from './PaymentsPanel'
import { CalendarDays } from 'lucide-react'
import StudentsPanel from './StudentsPanel'
import PrivacySettings from './PrivacySettings'
import SubscriptionsPanel from './SubscriptionsPanel'
import ZoomSettings from './ZoomSettings'
import ZoomLesson from './ZoomLesson'
import ManualLesson from './ManualLesson'
import CompleteLesson from './CompleteLesson'
import ZoomParticipants from './ZoomParticipants'
import TeacherSchedule from './TeacherSchedule'
import WeeklySchedule from './WeeklySchedule'
import LessonAttendance from './LessonAttendance'
import ExcusesPanel, { type Excuse } from './ExcusesPanel'

type DisplayLesson = Lesson & { minutes?: number; lateMinutes?: number; lateDeduction?: number; earned?: number }
type Progress = { id: number; student_id: number; pages: number; note: string; created: string; teacher_name: string }
type Data = { user: User; users: User[]; staff: User[]; lessons: DisplayLesson[]; progress: Progress[]; archivedPay?: {teacher_id:number;start:string;minutes:number;earned?:number;currency?:string}[]; reports: { teacher_id: number; start: string; joined: boolean; minutes: number; earned?: number; currency?: string }[]; cancelHours: number; excuses: Excuse[]; zoomEnabled?: boolean }
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
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const clock = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(clock) }, [])
  const [data, setData] = useState<Data>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  useEffect(() => { if (new URLSearchParams(window.location.search).has('zoom')) setTab('settings') }, [])
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
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 10000); return () => clearInterval(timer) }, [load])
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
  const teachers = users.filter(u => u.role === 'teacher' && u.can_teach === 1 && !u.disabled)
  const reportTeachers = staff.length ? staff : teachers
  if (user.role === 'student' && user.enrollment_status !== 'active') return <main dir="rtl" className="min-h-screen pt-32 px-4 pb-16 bg-[#f6f8f5] text-[#173b32]"><section className="max-w-xl mx-auto bg-white border rounded-3xl p-8 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-3xl mb-5">✓</div><h1 className="text-2xl font-bold">تم تسجيل حسابك</h1><p className="mt-4 text-slate-600 leading-8">الرجاء الانتظار لحين تأكيد حسابك بعد مراجعة الاشتراك. بمجرد التأكيد ستظهر هنا حصصك والمواعيد التي تحددها الإدارة.</p><a href={'/'+locale+'#pricing'} className="system-button inline-block mt-5">اختيار الباقة والدفع</a><div className="mt-6 text-right"><PaymentsPanel locale={locale} /></div><PrivacySettings userId={user.id} admin={false} locale={locale} /><a href={`https://wa.me/${ACADEMY_CONTACT.whatsappRaw}?text=${encodeURIComponent('مرحبًا، سجلت حساب طالب وأرغب في متابعة الاشتراك وتأكيد الحساب.') }`} target="_blank" rel="noopener noreferrer" className="system-button inline-block mt-6">تواصل مع الأكاديمية على واتساب</a><div className="flex justify-center gap-4 mt-6"><button className="text-sm text-emerald-700" onClick={() => void load()}>التحقق من تأكيد الحساب</button><button disabled={busy} className="text-sm text-slate-500" onClick={() => void act({ action: 'logout' })}>تسجيل الخروج</button></div>{error && <p role="alert" className="text-red-700 mt-4">{error}</p>}</section></main>
  const monthLessons = lessons.filter(l => cairoMonth(l.start) === month)
  const ownLessons = monthLessons.filter(l => l.teacher_id === user.id)
  const archivedOwn = (data.archivedPay || []).filter(l=>l.teacher_id===user.id && cairoMonth(l.start)===month)
  const weekStart = new Date(`${cairoDay(new Date().toISOString())}T12:00:00Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 1) % 7) + week * 7)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + i); return d })
  const weekLessons = lessons.filter(l => days.some(d => cairoDay(d.toISOString()) === cairoDay(l.start)))
  const tabs = [{ id: 'overview', label: 'نظرة عامة' }, ...((allowed(user, 'subscriptions_manage') || user.role === 'student' || user.role === 'parent') ? [{ id: 'subscriptions', label: 'الاشتراكات ورصيد الحصص' }] : []), ...(teamAccess ? [{ id: 'accounts', label: 'المعلمون والموظفون' }] : []), ...(allowed(user, 'students_manage') ? [{ id: 'students', label: 'الطلاب وطلبات التسجيل' }] : []), { id: 'week', label: 'الجدول الأسبوعي' }, { id: 'history', label: 'سجل الحصص' }, { id: 'progress', label: 'تقدم الحفظ' }, ...(manage ? [{ id: 'schedule', label: 'تعيين الحصص' }] : []),  ...(manage || user.role === 'teacher' ? [{ id: 'excuses', label: 'الاعتذارات وحصص بحاجة للتعيين' }] : []), ...(user.role === 'admin' || user.role === 'student' ? [{ id: 'payments', label: 'المدفوعات' }] : []), ...(allowed(user, 'reports_manage') ? [{ id: 'studentReports', label: 'تقارير الطلاب' }] : []), { id: 'settings', label: 'الإعدادات' }]
  const field = (label: string, name: string, type = 'text', extra: Record<string, unknown> = {}) => <label className="block text-sm">{label}<input className="system-input" name={name} type={type} required {...extra} /></label>
  const selectUser = (label: string, name: string, list: User[]) => <label className="block text-sm">{label}<select className="system-input" name={name} required defaultValue=""><option value="" disabled>اختر…</option>{list.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
  function lessonCard(l: DisplayLesson) {
    const live = accounting(l, now)
    const elapsed = Math.floor((l.workflow_version===1 ? live.pendingMinutes : live.minutes) * 60)
    const counter = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
    const end = Date.parse(l.start) + l.duration * 60000
    const open = now >= Date.parse(l.start) - 300000 && now < end
    const editable = ['scheduled', 'attended', 'absent'].includes(l.status)
    const current = ['scheduled', 'attended', 'absent', 'late_cancelled'].includes(l.status)
    return <article key={l.id} className="border border-[#dfe8e1] bg-white rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{l.subject} • {l.student_name}</h3><p className="text-sm text-slate-500 mt-1">المعلم: {l.teacher_name}</p></div><span className="text-xs rounded-full bg-[#eef5ef] px-3 py-2 h-fit">{statuses[l.status]}</span></div>
      <p className="text-sm">{date(l.start, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} • {l.duration} دقيقة</p>
      <LessonAttendance lesson={l} now={now} />
      {l.zoom_meeting && (allowed(user,'attendance_manage') || user.role==='teacher'&&l.teacher_id===user.id) && <ZoomParticipants lessonId={l.id} studentName={l.student_name||'طالب الحصة'} onChange={()=>void load()} />}
      {l.workflow_version===1 && current && <ManualLesson lesson={l} teacher={user.role==='teacher' && l.teacher_id===user.id} canJoin={user.role==='teacher' && l.teacher_id===user.id || ['student','parent'].includes(user.role)} now={now} onChange={()=>void load()} />}
      {l.workflow_version!==1 && (data!.zoomEnabled || l.zoom_meeting) && current && <ZoomLesson id={l.id} teacher={user.role==='teacher' && l.teacher_id===user.id} canPrepare={allowed(user,'schedule_manage') || user.role==='teacher' && l.teacher_id===user.id} canReview={allowed(user,'schedule_manage')} canJoin={user.role==='teacher' && l.teacher_id===user.id || ['student','parent'].includes(user.role)} open={open} ended={now>=end} onChange={()=>void load()} />}
      {user.role === 'teacher' && l.teacher_id === user.id && <div className="text-sm bg-slate-50 rounded-xl p-3">{l.joined ? `${l.workflow_version===1 ? 'تأكيد جاهزيتك' : 'دخولك'}: ${date(l.joined, { hour: '2-digit', minute: '2-digit' })} • تأخير ${decimal(live.lateMinutes)} دقيقة • قيمة دقائق التأخير ${money(live.lateDeduction, l.currency)}` : 'لم تسجّل دخول الحصة بعد'}<p className="mt-2 font-bold" role="timer">وقت الحضور المحتسب: <span dir="ltr">{counter}</span> • المستحق المعتمد: {money(live.earned, l.currency)}</p>{l.joined && now < Date.parse(l.start) && <p className="mt-2 text-emerald-700">دخلت قبل الموعد. يبدأ احتساب الأجر عند بداية الحصة.</p>}{l.joined && live.lateMinutes > 0 && <p className="mt-2 text-amber-700">تم خصم قيمة وقت التأخير فقط: {money(live.lateDeduction, l.currency)}</p>}<p className="text-xs text-slate-500 mt-2">المدة ضمن موعد الحصة وبحد أقصى مدتها المجدولة. للحصص الجديدة لا تُعتمد الساعات والمستحقات إلا بعد إنهاء الحصة وتوثيق التقدم والواجب.</p></div>}
      <div className="flex flex-wrap gap-2 text-sm">
        {l.workflow_version!==1 && !l.zoom_meeting && (!data!.zoomEnabled || !!l.joined) && user.role === 'teacher' && l.teacher_id === user.id && current && open && !l.left_at && <button disabled={busy} className="system-button" onClick={() => void act({ action: l.joined ? 'leave' : 'join', id: l.id })}>{l.joined ? 'إنهاء حضور الحصة' : 'تسجيل دخول الحصة'}</button>}
        {user.role === 'teacher' && l.teacher_id === user.id && current && Date.now() >= end && <span className="text-slate-500">انتهت الفترة المحددة للحصة</span>}
        {(allowed(user, 'attendance_manage') || user.role === 'teacher' && l.teacher_id === user.id) && editable && !l.completed_at && Date.now() >= Date.parse(l.start) && <><button disabled={busy} className="system-button" onClick={() => void act({ action: 'attendance', id: l.id, status: 'attended' })}>الطالب حضر</button><button disabled={busy} className="px-3 py-2 rounded-xl border" onClick={() => void act({ action: 'attendance', id: l.id, status: 'absent' })}>الطالب غاب</button></>}
        {(manage || ['student', 'parent'].includes(user.role)) && l.status === 'scheduled' && !l.joined && Date.parse(l.start) > Date.now() && <button disabled={busy} className="px-3 py-2 rounded-xl border border-amber-300 text-amber-800" onClick={() => { const late = Date.parse(l.start) - Date.now() < data!.cancelHours * 3600000; if (window.confirm(late ? 'الإلغاء متأخر وستُحتسب الحصة على الطالب. تأكيد الإلغاء؟' : 'تأكيد إلغاء الحصة في المهلة المسموحة؟')) void act({ action: 'cancel', id: l.id }) }}>إلغاء الحصة</button>}
      </div>
      {manage && l.status === 'scheduled' && !l.joined && <details><summary className="cursor-pointer text-sm text-emerald-700">تأجيل إلى موعد آخر</summary><form method="post" onSubmit={e => void form(e, 'postpone')} className="flex flex-wrap items-end gap-3 mt-3"><input type="hidden" name="id" value={l.id} />{field('الموعد الجديد بتوقيت القاهرة', 'start', 'datetime-local')}<button disabled={busy} className="system-button">حفظ الموعد الجديد</button></form></details>}
      {user.role === 'teacher' && user.can_teach === 1 && l.teacher_id === user.id && l.status === 'scheduled' && !l.joined && Date.parse(l.start) > now && !(data!.excuses || []).some(r => r.lesson_id === l.id && ['pending','accepted'].includes(r.status)) && <details><summary className="cursor-pointer text-amber-800 text-sm">طلب اعتذار عن الحصة</summary><form method="post" onSubmit={e => void form(e, 'requestExcuse')} className="space-y-3 mt-3"><input type="hidden" name="id" value={l.id} /><label className="text-sm block">سبب الاعتذار وتعليق للإدارة<textarea name="comment" required maxLength={2000} className="system-input" /></label><p className="text-xs text-slate-500">الحصة تظل مسؤوليتك حتى تقبل الإدارة الطلب.</p><button disabled={busy} className="system-button">إرسال طلب الاعتذار</button></form></details>}
      {l.workflow_version===1 && user.role==='teacher' && l.teacher_id===user.id && !!l.joined && current && now>=Date.parse(l.start) && <CompleteLesson lesson={l} pages={users.find(u=>u.id===l.student_id)?.pages||0} busy={busy} act={act} />}
      {l.completed_at && <section className="rounded-xl bg-emerald-50 p-4 space-y-2 text-sm"><p className="font-bold">تقدم الطالب</p><p className="whitespace-pre-wrap">{l.completion_note}</p><p className="font-bold">الواجب</p><p className="whitespace-pre-wrap">{l.homework}</p></section>}
      {(data!.excuses || []).some(r => r.lesson_id === l.id && r.status === 'pending') && <p className="text-sm bg-amber-50 text-amber-800 rounded-xl p-3">طلب الاعتذار في انتظار قرار الإدارة.</p>}
      {l.workflow_version!==1 && user.role === 'teacher' && l.teacher_id === user.id && l.joined && l.subject === 'حفظ القرآن' && ['scheduled', 'attended'].includes(l.status) && <details><summary className="cursor-pointer text-sm text-emerald-700">توثيق الحفظ والمراجعة</summary><form method="post" onSubmit={e => void form(e, 'progress')} className="space-y-3 mt-3"><input type="hidden" name="id" value={l.id} />{field('إجمالي الصفحات المتقنة حتى الآن من 604', 'pages', 'number', { min: 0, max: 604 })}<label className="block text-sm">ما تم حفظه ومراجعته<textarea name="note" required maxLength={2000} className="system-input" /></label><button disabled={busy} className="system-button">حفظ التقدم</button></form></details>}
    </article>
  }
  const roleLabel = user.role === 'teacher' && user.can_teach === 0 ? 'مسؤول سيستم' : roles[user.role]
  return <div dir="rtl" className="min-h-screen bg-[#f6f8f5] text-[#173b32]">
    <SystemHeader name={user.name} role={roleLabel} locale={locale} tabs={tabs} active={tab} select={setTab} busy={busy} logout={() => void act({ action: 'logout' })} requests={manage ? (data.excuses || []).filter(r => ['pending','accepted'].includes(r.status)).length : 0} />
    <main className="px-4 sm:px-8 pt-7 sm:pt-9 pb-16"><div className="max-w-7xl mx-auto">
      <section className="flex flex-wrap justify-between items-center gap-4 mb-7"><div><p className="text-xs font-medium text-emerald-700 mb-2">مساحتك / {tabs.find(t => t.id === tab)?.label}</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tab === 'overview' ? 'أهلًا، ' + user.name : tabs.find(t => t.id === tab)?.label}</h1><p className="text-slate-500 text-sm mt-3">{tab === 'overview' ? 'كل حصة لها أثر. تابع جدولك، حضورك، ورحلة الحفظ في مكان واحد.' : 'كل ما تحتاجه لإدارة هذا القسم، في مكان واحد.'}</p></div><p className="flex items-center gap-2 rounded-xl border border-[#e1e8de] bg-white px-4 py-3 text-xs text-slate-500"><CalendarDays size={16} className="text-emerald-700" />{date(new Date(now).toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}<span className="hidden sm:inline text-slate-300">|</span><span className="hidden sm:inline">توقيت القاهرة</span></p></section>
      <div aria-live="polite">{error && <p role="alert" className="p-4 mb-4 rounded-xl bg-red-50 text-red-700">{error}</p>}{notice && <p className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-800">{notice}</p>}</div>
      {tab === 'overview' && <>
        {manage && (data.excuses || []).some(r => ['pending','accepted'].includes(r.status)) && <section className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-6 flex flex-wrap justify-between items-center gap-4"><div><h2 className="font-bold text-amber-900">اعتذارات المعلمين وحصص بحاجة للتعيين</h2><p className="text-sm text-amber-800 mt-2">{(data.excuses || []).filter(r => r.status === 'pending').length} طلب ينتظر القرار • {(data.excuses || []).filter(r => r.status === 'accepted').length} حصة تنتظر معلمًا بديلًا</p></div><button className="system-button" onClick={() => setTab('excuses')}>مراجعة الطلبات وتعيين البديل</button></section>}
        {user.role === 'student' && <section className="bg-white rounded-2xl border border-emerald-100 p-6 mb-6"><p className="text-emerald-800 font-bold mb-5">أخلص النية لله سبحانه وتعالى</p><h2 className="text-xl font-bold">تقدمك في حفظ القرآن</h2><div className="flex flex-wrap items-center gap-6 mt-4"><ProgressArc pages={user.pages} name={user.name} /><button className="system-button" onClick={() => setTab('progress')}>سجل تقدم الحفظ</button></div></section>}
        {(teamAccess || allowed(user, 'students_manage') || manage) && <section className="bg-white rounded-2xl border border-emerald-100 p-6 mb-6"><h2 className="text-xl font-bold">إدارة فريق الأكاديمية</h2><p className="text-sm text-slate-500 mt-2 mb-5">أضف معلمين وموظفين وحدد من يدير الطلاب والجداول.</p><div className="flex flex-wrap gap-3">{allowed(user, 'staff_create') && <button className="system-button" onClick={() => { setAccountType('teacher'); setTab('accounts') }}>+ إضافة معلم</button>}{user.role === 'admin' && <button className="system-button" onClick={() => { setAccountType('manager'); setTab('accounts') }}>+ إضافة مسؤول سيستم</button>}{teamAccess && <button className="border rounded-xl px-4 py-3" onClick={() => setTab('accounts')}>عرض الفريق والصلاحيات</button>}{allowed(user, 'students_manage') && <button className="system-button" onClick={() => setTab('students')}>الطلاب وطلبات التسجيل ({allStudents.filter(s => s.enrollment_status === 'pending').length})</button>}{manage && <button className="border rounded-xl px-4 py-3" onClick={() => setTab('schedule')}>تعيين الحصص والمواعيد</button>}</div></section>}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">{[['حصص هذا الأسبوع', weekLessons.filter(l => !['postponed', 'cancelled'].includes(l.status)).length], ['حضور الطلاب هذا الأسبوع', weekLessons.filter(l => l.status === 'attended').length], ['حصص قادمة', lessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).length]].map(([label, value]) => <div key={String(label)} className="bg-white rounded-2xl border p-6"><p className="text-sm text-slate-500">{label}</p><p className="text-4xl font-bold mt-3">{value}</p></div>)}</div>
        {(user.role === 'teacher' || allowed(user, 'hours_view')) && <section className="bg-white border rounded-2xl p-6 mb-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-xl">{user.role === 'teacher' ? 'ساعاتي ومستحقاتي' : 'أداء المعلمين'}</h2><label className="text-sm">الشهر<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="system-input" /></label></div>
          {user.role === 'teacher' && <div className="grid sm:grid-cols-3 gap-4 mt-5"><p>حضور مسجل<br /><strong className="text-2xl">{decimal([...ownLessons,...archivedOwn].reduce((s, l) => s + (l.minutes || 0), 0) / 60)} ساعة</strong></p><p>ساعات متبقية مجدولة<br /><strong className="text-2xl">{decimal(ownLessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).reduce((s, l) => s + l.duration / 60, 0))}</strong></p><p>مستحق الشهر<br /><strong className="text-2xl">{money([...ownLessons,...archivedOwn].filter(l => l.currency === 'EGP').reduce((s, l) => s + (l.earned || 0), 0), 'EGP')}</strong><br /><strong>{money([...ownLessons,...archivedOwn].filter(l => l.currency === 'USD').reduce((s, l) => s + (l.earned || 0), 0), 'USD')}</strong></p></div>}
          {allowed(user, 'hours_view') && <div className="overflow-x-auto mt-5"><table className="w-full text-sm text-right"><caption className="text-right text-slate-500 mb-3">حضور المعلمين خلال الأسبوع المعروض، ومستحقات الشهر المختار حسب العملة</caption><thead><tr className="border-b"><th className="p-3">المعلم</th><th>حصص دخلها هذا الأسبوع</th><th>ساعات الشهر</th><th>ج.م</th><th>USD</th></tr></thead><tbody>{reportTeachers.map(t => { const monthly = (data.reports || []).filter(l => l.teacher_id === t.id && cairoMonth(l.start) === month); return <tr key={t.id} className="border-b"><td className="p-3">{t.name}</td><td>{(data.reports || []).filter(l => l.teacher_id === t.id && l.joined && days.some(d => cairoDay(d.toISOString()) === cairoDay(l.start))).length}</td><td>{decimal(monthly.reduce((s, l) => s + (l.minutes || 0), 0) / 60)}</td><td>{allowed(user, 'pay_view') ? money(monthly.filter(l => l.currency === 'EGP').reduce((s, l) => s + (l.earned || 0), 0), 'EGP') : '—'}</td><td>{allowed(user, 'pay_view') ? money(monthly.filter(l => l.currency === 'USD').reduce((s, l) => s + (l.earned || 0), 0), 'USD') : '—'}</td></tr> })}</tbody></table>{!reportTeachers.length && <p className="p-4 text-slate-500">لم تُضف حسابات معلمين بعد.</p>}</div>}
          <p className="text-xs text-slate-500 mt-5">المستحق يعتمد على دقائق الحضور ضمن موعد الحصة، ولا تُعتمد الحصص الجديدة إلا بعد الإنهاء والتوثيق وإرسال الواجب. بعد حذف بيانات طالب تُضاف إجماليات المعلم الشهرية المحفوظة إلى الساعات والمستحقات، دون إرجاع تفاصيل الطالب أو الحصص. التسجيل هنا لا يثبت حضور اجتماع خارجي.</p>
        </section>}
        <h2 className="text-xl font-bold mb-4">حصصك القادمة</h2><div className="grid md:grid-cols-2 gap-4">{lessons.filter(l => l.status === 'scheduled' && Date.parse(l.start) > Date.now()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4).map(lessonCard)}</div>{!lessons.length && <Empty />}
      </>}
      {tab === 'subscriptions' && (allowed(user, 'subscriptions_manage') || user.role === 'student' || user.role === 'parent') && <SubscriptionsPanel />}
      {tab === 'week' && <WeeklySchedule lessons={lessons} teachers={teachers} students={students} days={days} week={week} setWeek={setWeek} openHistory={() => setTab('history')} />}
      {tab === 'history' && <><h2 className="text-xl font-bold mb-2">السجل الكامل للحصص</h2><p className="text-sm text-slate-500 mb-5">الإلغاء قبل {data.cancelHours} ساعة مسموح، والإلغاء بعد ذلك يحتسب على الطالب.</p><div className="grid md:grid-cols-2 gap-4">{lessons.map(lessonCard)}</div>{!lessons.length && <Empty />}</>}
      {tab === 'progress' && <><h2 className="text-xl font-bold mb-5">رحلة حفظ القرآن</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{students.map(s => <article key={s.id} className="bg-white p-6 rounded-2xl border"><h3 className="font-bold">{s.name}</h3><div className="mt-5"><ProgressArc pages={s.pages} name={s.name} /></div></article>)}</div><p className="text-sm text-slate-500 mb-4">النسبة توثيق المعلم للصفحات المتقنة، ويظهر أدناه سجل الملاحظات.</p>{progress.map(p => <article key={p.id} className="bg-white p-5 rounded-xl border mb-3"><p className="font-bold">{users.find(u => u.id === p.student_id)?.name || 'الطالب'} • {p.pages} صفحة</p><p className="my-2 whitespace-pre-wrap">{p.note}</p><p className="text-xs text-slate-500">{p.teacher_name} • {date(p.created)}</p></article>)}{!progress.length && <p className="text-slate-500">لا توجد ملاحظات حفظ مسجلة بعد.</p>}</>}
      {tab === 'excuses' && (manage || user.role === 'teacher') && <ExcusesPanel requests={data.excuses || []} teachers={teachers} manage={manage} busy={busy} act={act} />}
      {tab === 'schedule' && manage && <TeacherSchedule teachers={teachers} students={students} lessons={lessons} busy={busy} act={act} />}
      {allowed(user, 'backups_manage') && <BackupSettings userId={user.id} visible={tab === 'settings'} />}
      {tab === 'settings' && (user.role === 'admin' || user.role === 'teacher' && user.can_teach === 1) && <ZoomSettings locale={locale} />}
      {tab === 'settings' && (user.role === 'student' || user.role === 'admin') && <PrivacySettings userId={user.id} admin={user.role === 'admin'} locale={locale} students={allStudents} />}
      {tab === 'settings' && <section className="max-w-md bg-white rounded-2xl border p-6"><h2 className="text-xl font-bold mb-5">تغيير كلمة المرور</h2><form method="post" onSubmit={e => void form(e, 'changePassword')} className="space-y-5">{field('كلمة المرور الحالية', 'oldPassword', 'password', { autoComplete: 'current-password' })}{field('كلمة المرور الجديدة — 12 حرفًا على الأقل', 'password', 'password', { minLength: 12, maxLength: 256, autoComplete: 'new-password' })}<button disabled={busy} className="system-button">حفظ كلمة المرور</button></form><p className="text-xs text-slate-500 mt-4">يتم تسجيل الخروج من باقي الأجهزة بعد تغيير كلمة المرور.</p></section>}
      {tab === 'studentReports' && allowed(user, 'reports_manage') && <ReportsPanel students={students} />}
      {tab === 'payments' && (user.role === 'admin' || user.role === 'student') && <PaymentsPanel locale={locale} admin={user.role === 'admin'} />}
      {tab === 'accounts' && teamAccess && <StaffPanel user={user} staff={staff} reports={data.reports} busy={busy} initialType={accountType} act={act} />}
      {tab === 'students' && allowed(user, 'students_manage') && <StudentsPanel students={allStudents} busy={busy} act={act} />}
      {tab === 'accounts' && user.role === 'admin' && <section className="bg-white rounded-2xl border p-6 mt-6"><h2 className="text-xl font-bold mb-5">ربط ولي الأمر بالطالب</h2><form method="post" onSubmit={e => void form(e, 'linkParent')} className="grid sm:grid-cols-3 gap-5">{selectUser('الطالب', 'student_id', students)}{selectUser('ولي الأمر', 'parent_id', users.filter(u => u.role === 'parent'))}<button disabled={busy} className="system-button self-end">ربط الحسابين</button></form></section>}
    </div>
  </main></div>
}
function Empty() { return <div className="border border-dashed rounded-2xl text-center p-12 text-slate-500">لا توجد حصص بعد. ستظهر هنا بمجرد تعيينها من الإدارة.</div> }
