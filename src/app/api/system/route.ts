import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { db, bootstrapAdmin, hashPassword, checkPassword, safeUser, tokenHash, rateLimit, type User, type Query } from '@/lib/system/db'
import { currentUser } from '@/lib/system/auth'
import { accounting, type Lesson } from '@/lib/system/accounting'
import { allowed, grants, PERMISSIONS, DEFAULT_MANAGER, type Permission } from '@/lib/system/permissions'
import { presenceIntervals, presenceMinutes, type AttendanceEvent } from '@/lib/zoom/attendance'
import { whatsappNumber } from '@/lib/system/phone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const subjects = ['حفظ القرآن', 'التجويد', 'اللغة العربية']
class RequestError extends Error { constructor(message: string, public status = 400) { super(message) } }
function fail(message: string, status = 400): never { throw new RequestError(message, status) }
function str(value: unknown, max = 1000) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function number(value: unknown, min: number, max: number) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) fail('قيمة رقمية غير صالحة'); return n }
function selected(value: unknown) { if (!Array.isArray(value) || !value.length || value.some(s => !subjects.includes(s))) fail('اختر المواد المطلوبة'); return JSON.stringify([...new Set(value)]) }
function manager(user: User) { return allowed(user, 'schedule_manage') || allowed(user, 'attendance_manage') }
function permissionList(value: unknown): Permission[] {
  if (!Array.isArray(value) || value.some(k => !PERMISSIONS.some(p => p.key === k))) fail('الصلاحيات غير صحيحة')
  return [...new Set(value)] as Permission[]
}
async function lessonById(id: unknown) { const lesson = await db().prepare('SELECT * FROM lessons WHERE id=?').get(number(id, 1, 1e9)) as Lesson | undefined; if (!lesson) fail('الحصة غير موجودة', 404); return lesson }
async function canSee(user: User, lesson: Lesson) {
  return manager(user) || (user.role === 'teacher' && lesson.teacher_id === user.id) || (user.role === 'student' && lesson.student_id === user.id) || (user.role === 'parent' && (await safeUser(lesson.student_id))?.parent_id === user.id)
}
async function scheduleQuery(input: Record<string, unknown>): Promise<Query> {
  const teacher = await safeUser(number(input.teacher_id, 1, 1e9)); const student = await safeUser(number(input.student_id, 1, 1e9))
  if (teacher?.role !== 'teacher' || teacher.can_teach !== 1 || teacher.disabled || student?.role !== 'student' || student.disabled) fail('اختر معلمًا وطالبًا صحيحين')
  if (student.enrollment_status !== 'active') fail('يجب تأكيد حساب الطالب قبل تعيين حصصه')
  const subject = str(input.subject)
  if (!subjects.includes(subject) || !JSON.parse(student.subjects).includes(subject)) fail('المادة ليست من مواد الطالب')
  const startMs = Date.parse(str(input.start)); const duration = number(input.duration, 5, 180)
  if (!Number.isInteger(duration) || !Number.isFinite(startMs) || startMs < Date.now()) fail('اختر موعدًا مستقبليًا ومدة صحيحة')
  const start = new Date(startMs).toISOString()
  return { sql: 'INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency,workflow_version) SELECT id,?,?,?,?,rate,currency,1 FROM users WHERE id=?', values: [student.id, subject, start, duration, teacher.id] }
}
export async function GET() {
  try {
    const user = await currentUser(); if (!user) fail('سجّل الدخول أولًا', 401)
    const users = user.role === 'admin' || allowed(user, 'students_manage')
      ? await db().prepare("SELECT id,name,email,whatsapp,role,manage,can_teach,subjects,parent_id,pages,permissions,disabled,enrollment_status,EXISTS(SELECT 1 FROM payment_orders p WHERE p.student_id=users.id AND p.mode='live' AND p.status='paid') AS payment_confirmed FROM users WHERE disabled=0 ORDER BY id DESC").all()
      : manager(user) || allowed(user, 'reports_manage') ? await db().prepare("SELECT id,name,role,manage,can_teach,subjects,pages,enrollment_status FROM users WHERE disabled=0 AND role IN ('student','teacher') AND (role!='student' OR enrollment_status='active')").all()
      : user.role === 'parent' ? await db().prepare("SELECT id,name,role,pages,subjects,enrollment_status FROM users WHERE parent_id=? AND disabled=0 AND enrollment_status='active'").all(user.id)
      : user.role === 'teacher' ? await db().prepare('SELECT id,name,role,can_teach,pages,subjects,enrollment_status FROM users WHERE id=? OR id IN (SELECT student_id FROM lessons WHERE teacher_id=?)').all(user.id, user.id)
      : [await safeUser(user.id)]
    const all = await db().prepare('SELECT l.*,t.name AS teacher_name,s.name AS student_name FROM lessons l JOIN users t ON t.id=l.teacher_id JOIN users s ON s.id=l.student_id ORDER BY l.start DESC').all() as unknown as Lesson[]
    const zoomMeetings = new Set((await db().prepare('SELECT lesson_id FROM zoom_meetings').all()).map(m=>Number(m.lesson_id)))
    const zoomEvents = await db().prepare('SELECT lesson_id,actor,participant,occurrence,kind,at_ms,joined_ms FROM zoom_attendance_events ORDER BY at_ms').all() as unknown as (AttendanceEvent & {lesson_id:number})[]
    const eventsByLesson = new Map<number,AttendanceEvent[]>()
    for(const event of zoomEvents) eventsByLesson.set(event.lesson_id,[...(eventsByLesson.get(event.lesson_id)||[]),event])
    for(const lesson of all) {
      const events=eventsByLesson.get(lesson.id)
      lesson.zoom_meeting=zoomMeetings.has(lesson.id) || !!events
      if(lesson.zoom_meeting && lesson.workflow_version !== 1) {
        lesson.zoom_intervals=presenceIntervals(events||[],'teacher')
        const intervals=lesson.zoom_intervals
        lesson.joined=intervals.length ? new Date(Math.min(...intervals.map(i=>i[0]))).toISOString() : null
        lesson.left_at=intervals.length && intervals.every(i=>i[1]!==null) ? new Date(Math.max(...intervals.map(i=>i[1] as number))).toISOString() : null
        lesson.student_zoom_minutes=presenceMinutes(presenceIntervals(events||[],'student'),Date.parse(lesson.start),Date.parse(lesson.start)+lesson.duration*60000,Date.now())
      }
    }
    // Meeting passwords are returned only by the authorized launch action, never in lists/exports.
    for (const lesson of all) {
      const row = lesson as unknown as Record<string, unknown>
      lesson.meeting_ready = !!row.meeting_link
      delete row.meeting_link
    }
    const studentIds = new Set(users.filter(u => u?.role === 'student').map(u => Number(u?.id)))
    const lessons = all.filter(l => manager(user) || user.role === 'teacher' && l.teacher_id === user.id || user.role === 'student' && l.student_id === user.id || user.role === 'parent' && studentIds.has(l.student_id)).map(l => {
      if (user.role === 'admin' || user.role === 'teacher' && l.teacher_id === user.id) return { ...l, teacher_attended: !!l.joined, ...accounting(l) }
      if (manager(user)) {
        const { rate, currency, joined, left_at, zoom_intervals, ...visible } = l
        return { ...visible, teacher_attended: !!l.joined, ...(allowed(user, 'pay_view') ? { rate, currency } : {}), ...(allowed(user, 'hours_view') ? { minutes: accounting(l).minutes } : {}) }
      }
      const { rate: _rate, currency: _currency, joined: _joined, left_at: _left, zoom_intervals: _intervals, ...visible } = l
      return { ...visible, teacher_attended: !!l.joined }
    })
    const progress = (await db().prepare('SELECT p.*,t.name AS teacher_name FROM progress p JOIN users t ON t.id=p.teacher_id ORDER BY p.created DESC').all()).filter(p => manager(user) || (user.role === 'teacher' && p.teacher_id === user.id) || (user.role === 'student' && p.student_id === user.id) || (user.role === 'parent' && studentIds.has(Number(p.student_id))))
    const canStaff = ['staff_create', 'staff_edit', 'staff_delete', 'pay_view', 'hours_view'].some(p => allowed(user, p as Permission))
    const staff = canStaff ? (await db().prepare("SELECT id,name,email,role,rate,currency,manage,can_teach,permissions,disabled FROM users WHERE role='teacher' AND disabled=0").all()).map(t => {
      const { rate, currency, permissions, email, ...visible } = t
      return { ...visible, ...(allowed(user, 'staff_edit') || allowed(user, 'staff_create') ? { email } : {}), ...(user.role === 'admin' ? { permissions } : {}), ...(allowed(user, 'pay_view') ? { rate, currency } : {}) }
    }) : []
    const archivedPay = user.role === 'teacher' || allowed(user, 'hours_view') ? (await db().prepare('SELECT teacher_id,month,currency,minutes,earned FROM retained_teacher_totals').all()).filter(r=>allowed(user,'hours_view')||r.teacher_id===user.id).map(r=>({teacher_id:r.teacher_id,start:`${r.month}-01T12:00:00.000Z`,joined:false,minutes:r.minutes,...(allowed(user,'pay_view')||r.teacher_id===user.id?{earned:r.earned,currency:r.currency}:{})})) : []
    const reports = allowed(user, 'hours_view') ? [...all.map(l => ({ teacher_id: l.teacher_id, start: l.start, joined: !!l.joined, minutes: accounting(l).minutes, ...(allowed(user, 'pay_view') ? { earned: accounting(l).earned, currency: l.currency } : {}) })), ...archivedPay] : []
    const excuses = user.role === 'teacher' || user.role === 'admin' ? (await db().prepare('SELECT e.*,l.student_id,l.subject,l.start,l.duration,t.name AS teacher_name,s.name AS student_name FROM teacher_excuses e JOIN lessons l ON l.id=e.lesson_id JOIN users t ON t.id=e.teacher_id JOIN users s ON s.id=l.student_id ORDER BY e.created DESC').all()).filter(e => allowed(user, 'schedule_manage') || e.teacher_id === user.id) : []
    const pending = user.role === 'student' && user.enrollment_status !== 'active'
    return NextResponse.json({ user, users, staff, lessons: pending ? [] : lessons, progress: pending ? [] : progress, reports, archivedPay, excuses, zoomEnabled: process.env.ITQAN_MEETING_PROVIDER==='zoom', now: new Date().toISOString(), cancelHours: Number(process.env.ITQAN_CANCEL_HOURS) || 12 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error) }
}
function errorResponse(error: unknown) {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof Error && error.message.includes('lesson_overlap')) return NextResponse.json({ error: 'الموعد يتعارض مع حصة للمعلم أو الطالب' }, { status: 400 })
  if (error instanceof Error && error.message.includes('lesson_accounts_unavailable')) return NextResponse.json({ error: 'المعلم أو الطالب غير متاح لتعيين الحصص' }, { status: 400 })
  console.error('ITQAN system request failed', error instanceof Error ? error.message : 'Unknown error')
  return NextResponse.json({ error: 'تعذر تنفيذ الطلب. حاول مرة أخرى.' }, { status: 500 })
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) fail('مصدر الطلب غير مسموح', 403)
    const body = await request.json() as Record<string, unknown>
    const action = str(body.action)
    if (action === 'login' || action === 'register') {
      await bootstrapAdmin()
      const email = str(body.email, 254).toLowerCase(); const password = str(body.password, 256)
      if (!await rateLimit(`auth:${email}`)) fail('محاولات كثيرة. انتظر 15 دقيقة.', 429)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('البريد الإلكتروني غير صحيح')
      let id: number
      if (action === 'register') {
        const name = str(body.name, 100); if (!name || password.length < 12) fail('أدخل الاسم وكلمة مرور لا تقل عن 12 حرفًا')
        const courses = selected(body.subjects)
        let whatsapp: string
        try { whatsapp=whatsappNumber(body.whatsapp) } catch(error) { fail((error as Error).message) }
        if (await db().prepare('SELECT id FROM users WHERE email=?').get(email)) fail('البريد مسجل بالفعل')
        id = Number((await db().prepare("INSERT INTO users(name,email,password,role,subjects,enrollment_status,whatsapp) VALUES(?,?,?,'student',?,'pending',?)").run(name, email, hashPassword(password), courses,whatsapp)).lastInsertRowid)
      } else {
        const account = await db().prepare('SELECT id,password,disabled FROM users WHERE email=?').get(email) as { id: number; password: string; disabled: number } | undefined
        if (!account || account.disabled || !checkPassword(password, account.password)) fail('البريد أو كلمة المرور غير صحيحة', 401)
        id = account.id
      }
      const token = randomBytes(32).toString('hex'); const expires = Date.now() + 7 * 86400000
      await db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())
      await db().prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(tokenHash(token), id, expires)
      const response = NextResponse.json({ user: await safeUser(id) })
      response.cookies.set('itqan_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 86400 })
      return response
    }
    const user = await currentUser(); if (!user) fail('سجّل الدخول أولًا', 401)
    if (action === 'logout') {
      const token = request.cookies.get('itqan_session')?.value
      if (token) await db().prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token))
      const response = NextResponse.json({ ok: true }); response.cookies.delete('itqan_session'); return response
    }
    if (action === 'createUser') {
      if (!allowed(user, 'staff_create')) fail('لا تملك صلاحية إضافة المعلمين', 403)
      const role = str(body.role); if (!['teacher', 'parent'].includes(role)) fail('نوع الحساب غير صحيح')
      if (role === 'parent' && user.role !== 'admin') fail('إنشاء ولي الأمر للإدارة فقط', 403)
      if (user.role !== 'admin' && (body.manage === true || body.permissions !== undefined)) fail('منح الصلاحيات للأدمن فقط', 403)
      const name = str(body.name, 100); const email = str(body.email, 254).toLowerCase(); const password = str(body.password, 256)
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) fail('أكمل البيانات وكلمة مرور من 12 حرفًا على الأقل')
      if (await db().prepare('SELECT id FROM users WHERE email=?').get(email)) fail('البريد مسجل بالفعل')
      const rate = role === 'teacher' && allowed(user, 'pay_view') ? number(body.rate, 0, 100000) : 0
      if (!allowed(user, 'pay_view') && Number(body.rate || 0) !== 0) fail('تحديد الأجر يحتاج صلاحية رؤية سعر الساعة', 403)
      const currency = str(body.currency); if (!['USD', 'EGP'].includes(currency)) fail('العملة غير صحيحة')
      const permissions = role === 'teacher' && user.role === 'admin' ? body.permissions !== undefined ? permissionList(body.permissions) : body.manage === true ? DEFAULT_MANAGER : [] : []
      await db().prepare('INSERT INTO users(name,email,password,role,rate,currency,manage,permissions,can_teach) VALUES(?,?,?,?,?,?,?,?,?)').run(name, email, hashPassword(password), role, rate, currency, permissions.length ? 1 : 0, JSON.stringify(permissions), body.accountType === 'manager' && user.role === 'admin' ? 0 : 1)
    } else if (action === 'updateTeacher') {
      if (!allowed(user, 'staff_edit')) fail('لا تملك صلاحية تعديل المعلمين', 403)
      const teacher = await safeUser(number(body.id, 1, 1e9)); if (teacher?.role !== 'teacher') fail('المعلم غير موجود')
      if (user.role !== 'admin' && (body.permissions !== undefined || body.manage !== undefined || body.can_teach !== undefined)) fail('منح الصلاحيات للأدمن فقط', 403)
      if (!allowed(user, 'pay_view') && (body.rate !== undefined || body.currency !== undefined)) fail('تعديل الأجر يحتاج صلاحية رؤية سعر الساعة', 403)
      const currency = body.currency !== undefined ? str(body.currency) : teacher.currency; if (!['USD', 'EGP'].includes(currency)) fail('العملة غير صحيحة')
      const name = body.name !== undefined ? str(body.name, 100) : teacher.name
      const email = body.email !== undefined ? str(body.email, 254).toLowerCase() : teacher.email
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('الاسم أو البريد غير صحيح')
      const duplicate = await db().prepare('SELECT id FROM users WHERE email=? AND id<>?').get(email, teacher.id); if (duplicate) fail('البريد مستخدم بالفعل')
      if (body.can_teach !== undefined && !['0','1'].includes(String(body.can_teach))) fail('وظيفة الحساب غير صحيحة')
      const permissions = user.role === 'admin' && body.permissions !== undefined ? permissionList(body.permissions) : user.role === 'admin' && body.manage !== undefined ? body.manage ? DEFAULT_MANAGER : [] : grants(teacher)
      await db().prepare('UPDATE users SET name=?,email=?,rate=?,currency=?,manage=?,permissions=?,can_teach=? WHERE id=?').run(name, email, body.rate !== undefined ? number(body.rate, 0, 100000) : teacher.rate, currency, permissions.length ? 1 : 0, JSON.stringify(permissions), user.role === 'admin' && body.can_teach !== undefined ? String(body.can_teach) === '1' ? 1 : 0 : teacher.can_teach ?? 1, teacher.id)
    } else if (action === 'deleteTeacher') {
      if (!allowed(user, 'staff_delete')) fail('لا تملك صلاحية حذف المعلمين', 403)
      const teacher = await safeUser(number(body.id, 1, 1e9))
      if (teacher?.role !== 'teacher' || teacher.disabled || teacher.id === user.id) fail('لا يمكن حذف هذا الحساب')
      if (user.role !== 'admin' && grants(teacher).length) fail('حذف المسؤولين للأدمن فقط', 403)
      await db().batch([
        { sql: 'UPDATE users SET disabled=1 WHERE id=?', values: [teacher.id] },
        { sql: 'DELETE FROM sessions WHERE user_id=?', values: [teacher.id] },
        { sql: "UPDATE lessons SET status='cancelled' WHERE teacher_id=? AND status='scheduled' AND joined IS NULL AND start>?", values: [teacher.id, new Date().toISOString()] },
      ])
    } else if (action === 'createStudent') {
      if (!allowed(user, 'students_manage')) fail('لا تملك صلاحية إضافة الطلاب', 403)
      const name = str(body.name, 100); const email = str(body.email, 254).toLowerCase(); const password = str(body.password, 256); const courses = selected(body.subjects)
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) fail('أكمل الاسم والبريد وكلمة المرور من 12 حرفًا')
      let whatsapp=''
      if(body.whatsapp) { try { whatsapp=whatsappNumber(body.whatsapp) } catch(error) { fail((error as Error).message) } }
      if (await db().prepare('SELECT id FROM users WHERE email=?').get(email)) fail('البريد مستخدم بالفعل')
      await db().prepare("INSERT INTO users(name,email,password,role,subjects,enrollment_status,whatsapp) VALUES(?,?,?,'student',?,'active',?)").run(name, email, hashPassword(password), courses,whatsapp)
    } else if (action === 'approveStudent') {
      if (!allowed(user, 'students_manage')) fail('لا تملك صلاحية تأكيد الطلاب', 403)
      const student = await safeUser(number(body.id, 1, 1e9)); if (student?.role !== 'student' || student.disabled) fail('الطالب غير موجود')
      await db().prepare("UPDATE users SET enrollment_status='active' WHERE id=?").run(student.id)
    } else if (action === 'linkParent') {
      if (user.role !== 'admin') fail('للإدارة فقط', 403)
      const student = await safeUser(number(body.student_id, 1, 1e9)); const parent = await safeUser(number(body.parent_id, 1, 1e9))
      if (student?.role !== 'student' || student.disabled || parent?.role !== 'parent' || parent.disabled) fail('اختر الطالب وولي الأمر')
      await db().prepare('UPDATE users SET parent_id=? WHERE id=?').run(parent.id, student.id)
    } else if (action === 'changePassword') {
      const password = str(body.password, 256)
      const old = str(body.oldPassword, 256)
      if (!await rateLimit(`password:${user.id}`)) fail('محاولات كثيرة. انتظر 15 دقيقة.', 429)
      const row = await db().prepare('SELECT password FROM users WHERE id=?').get(user.id) as { password: string }
      if (!checkPassword(old, row.password)) fail('كلمة المرور الحالية غير صحيحة')
      if (password.length < 12) fail('كلمة المرور الجديدة لا تقل عن 12 حرفًا')
      await db().prepare('UPDATE users SET password=? WHERE id=?').run(hashPassword(password), user.id)
      const token = request.cookies.get('itqan_session')?.value || ''
      await db().prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(user.id, tokenHash(token))
    } else if (action === 'schedule') {
      if (!allowed(user, 'schedule_manage')) fail('ليست لديك صلاحية إدارة الجداول', 403)
      const starts = Array.isArray(body.starts) ? body.starts : [body.start]
      if (!starts.length || starts.length > 12) fail('الحد الأقصى 12 أسبوعًا في المرة الواحدة')
      const queries = await Promise.all(starts.map(start => scheduleQuery({ ...body, start })))
      await db().batch(queries)
    } else if (action === 'completeLesson') {
      const lesson = await lessonById(body.id)
      if (user.role !== 'teacher' || user.can_teach !== 1 || lesson.teacher_id !== user.id) fail('إنهاء الحصة لمعلمها فقط',403)
      if (lesson.workflow_version !== 1 || !lesson.joined || lesson.completed_at || !['scheduled','attended','absent','late_cancelled'].includes(lesson.status) || Date.now() < Date.parse(lesson.start)) fail('الحصة غير متاحة للإنهاء')
      const note = str(body.note,2000), homework = str(body.homework,2000)
      if (!note || !homework) fail('وثّق تقدم الطالب واكتب الواجب قبل إنهاء الحصة')
      const status = str(body.status)
      if (!['attended','absent'].includes(status)) fail('حدد حضور الطالب')
      const pages = lesson.subject === 'حفظ القرآن' ? number(body.pages,0,604) : (await safeUser(lesson.student_id))!.pages
      if (!Number.isInteger(pages)) fail('عدد الصفحات يجب أن يكون صحيحًا')
      const at = new Date().toISOString()
      await db().batch([
        {sql:'INSERT INTO progress(student_id,teacher_id,lesson_id,pages,note,created) SELECT student_id,teacher_id,id,?,?,? FROM lessons WHERE id=? AND completed_at IS NULL',values:[pages,note+'\n\nالواجب: '+homework,at,lesson.id]},
        ...(lesson.subject === 'حفظ القرآن' ? [{sql:'UPDATE users SET pages=? WHERE id=? AND EXISTS(SELECT 1 FROM lessons WHERE id=? AND completed_at IS NULL)',values:[pages,lesson.student_id,lesson.id]}] : []),
        {sql:'UPDATE lessons SET completed_at=?,left_at=?,completion_note=?,homework=?,status=? WHERE id=? AND completed_at IS NULL',values:[at,at,note,homework,status,lesson.id]},
      ])
    } else if (action === 'join' || action === 'leave') {
      const lesson = await lessonById(body.id)
      if (user.role !== 'teacher' || lesson.teacher_id !== user.id) fail('هذه الحصة ليست لك', 403)
      if (lesson.workflow_version === 1) fail('استخدم تجهيز الحصة وإنهاء الحصة مع التوثيق')
      if(await db().prepare('SELECT lesson_id FROM zoom_meetings WHERE lesson_id=?').get(lesson.id)) fail('حضور هذه الحصة يسجله Zoom تلقائيًا؛ استخدم زر دخول Zoom.')
      const now = Date.now(); const start = Date.parse(lesson.start); const end = start + lesson.duration * 60000
      if (!['scheduled', 'attended', 'absent', 'late_cancelled'].includes(lesson.status)) fail('الحصة غير متاحة')
      if (now < start - 5 * 60000 || now >= end) fail('الدخول متاح قبل الحصة بخمس دقائق وحتى نهايتها')
      if (action === 'join') {
        if (lesson.left_at) fail('تم إنهاء حضورك لهذه الحصة')
        await db().prepare('UPDATE lessons SET joined=COALESCE(joined,?) WHERE id=?').run(new Date(now).toISOString(), lesson.id)
      } else {
        if (!lesson.joined || lesson.left_at) fail('لا يوجد حضور مفتوح')
        await db().prepare('UPDATE lessons SET left_at=? WHERE id=?').run(new Date(now).toISOString(), lesson.id)
      }
    } else if (action === 'cancel') {
      const lesson = await lessonById(body.id)
      if (!await canSee(user, lesson) || user.role === 'teacher' && !allowed(user, 'schedule_manage')) fail('غير مسموح', 403)
      if (lesson.status !== 'scheduled' || lesson.joined || Date.parse(lesson.start) <= Date.now()) fail('لا يمكن إلغاء هذه الحصة')
      const hours = Number(process.env.ITQAN_CANCEL_HOURS) || 12
      const status = Date.parse(lesson.start) - Date.now() >= hours * 3600000 ? 'cancelled' : 'late_cancelled'
      await db().prepare('UPDATE lessons SET status=? WHERE id=?').run(status, lesson.id)
    } else if (action === 'postpone') {
      if (!allowed(user, 'schedule_manage')) fail('ليست لديك صلاحية التأجيل', 403)
      const lesson = await lessonById(body.id)
      if (lesson.status !== 'scheduled' || lesson.joined) fail('لا يمكن تأجيل هذه الحصة')
      const replacement = await scheduleQuery({ ...lesson, start: body.start })
      await db().batch([
        { sql: "UPDATE lessons SET status='postponed' WHERE id=?", values: [lesson.id] },
        replacement,
        { sql: 'UPDATE lessons SET replaced_by=(SELECT id FROM lessons WHERE teacher_id=? AND student_id=? AND start=? ORDER BY id DESC LIMIT 1) WHERE id=?', values: [lesson.teacher_id, lesson.student_id, new Date(str(body.start)).toISOString(), lesson.id] },
      ])
    } else if (action === 'attendance') {
      const lesson = await lessonById(body.id)
      if (!allowed(user, 'attendance_manage') && !(user.role === 'teacher' && lesson.teacher_id === user.id)) fail('غير مسموح', 403)
      if (lesson.completed_at) fail('تم اعتماد حضور الحصة عند إنهائها')
      if (!['scheduled', 'attended', 'absent'].includes(lesson.status) || Date.now() < Date.parse(lesson.start)) fail('لا يمكن تعديل حضور هذه الحصة')
      const status = str(body.status); if (!['attended', 'absent'].includes(status)) fail('الحالة غير صحيحة')
      await db().prepare('UPDATE lessons SET status=? WHERE id=?').run(status, lesson.id)
    } else if (action === 'requestExcuse') {
      const lesson = await lessonById(body.id)
      if (user.role !== 'teacher' || user.can_teach !== 1 || lesson.teacher_id !== user.id) fail('الاعتذار لمعلم الحصة فقط', 403)
      if (lesson.status !== 'scheduled' || lesson.joined || Date.parse(lesson.start) <= Date.now()) fail('الاعتذار متاح قبل بداية الحصة فقط')
      const comment = str(body.comment, 2000); if (!comment) fail('اكتب سبب الاعتذار')
      if (await db().prepare("SELECT id FROM teacher_excuses WHERE lesson_id=? AND status IN ('pending','accepted')").get(lesson.id)) fail('يوجد طلب اعتذار للحصة بالفعل')
      await db().prepare('INSERT INTO teacher_excuses(lesson_id,teacher_id,comment,created) VALUES(?,?,?,?)').run(lesson.id, user.id, comment, new Date().toISOString())
    } else if (action === 'reviewExcuse') {
      if (!allowed(user, 'schedule_manage')) fail('مراجعة الاعتذار لمسؤول الجداول أو الأدمن فقط', 403)
      const id = number(body.id, 1, 1e9); const request = await db().prepare('SELECT * FROM teacher_excuses WHERE id=?').get(id)
      if (!request || request.status !== 'pending') fail('الطلب غير متاح للمراجعة')
      const status = str(body.status); if (!['accepted','rejected'].includes(status)) fail('قرار غير صحيح')
      const queries: Query[] = [{sql:'UPDATE teacher_excuses SET status=?,reviewed_by=?,reviewed_at=? WHERE id=?',values:[status,user.id,new Date().toISOString(),id]}]
      if (status === 'accepted') queries.push({sql:"UPDATE lessons SET status='postponed' WHERE id=?",values:[Number(request.lesson_id)]})
      await db().batch(queries)
    } else if (action === 'assignExcuse') {
      if (!allowed(user, 'schedule_manage')) fail('تعيين البديل لمسؤول الجداول أو الأدمن فقط', 403)
      const id = number(body.id, 1, 1e9); const request = await db().prepare('SELECT * FROM teacher_excuses WHERE id=?').get(id)
      if (!request || request.status !== 'accepted') fail('الحصة ليست بحاجة للتعيين')
      const lesson = await lessonById(request.lesson_id)
      const teacherId = number(body.teacher_id, 1, 1e9); if (teacherId === Number(request.teacher_id)) fail('اختر معلمًا بديلًا')
      const insert = await scheduleQuery({teacher_id:teacherId,student_id:lesson.student_id,subject:lesson.subject,start:body.start || lesson.start,duration:lesson.duration})
      await db().batch([insert,{sql:"UPDATE teacher_excuses SET status='assigned',replacement_id=(SELECT MAX(id) FROM lessons) WHERE id=?",values:[id]},{sql:'UPDATE lessons SET replaced_by=(SELECT replacement_id FROM teacher_excuses WHERE id=?) WHERE id=?',values:[id,lesson.id]}])
    } else if (action === 'progress') {
      const lesson = await lessonById(body.id)
      if (user.role !== 'teacher' || lesson.teacher_id !== user.id) fail('توثيق التقدم لمعلم الحصة فقط', 403)
      if (lesson.workflow_version === 1) fail('احفظ التقدم والواجب من زر إنهاء الحصة')
      if (!lesson.joined || !['scheduled', 'attended'].includes(lesson.status) || lesson.subject !== 'حفظ القرآن') fail('التوثيق لحصة حفظ حضرها المعلم')
      const pages = number(body.pages, 0, 604); if (!Number.isInteger(pages)) fail('عدد الصفحات يجب أن يكون صحيحًا')
      const note = str(body.note, 2000); if (!note) fail('اكتب تفاصيل الحفظ والمراجعة')
      await db().batch([
        { sql: 'UPDATE users SET pages=? WHERE id=?', values: [pages, lesson.student_id] },
        { sql: 'INSERT INTO progress(student_id,teacher_id,lesson_id,pages,note,created) VALUES(?,?,?,?,?,?)', values: [lesson.student_id, user.id, lesson.id, pages, note, new Date().toISOString()] },
      ])
    } else fail('عملية غير معروفة')
    return NextResponse.json({ ok: true })
  } catch (error) { return errorResponse(error) }
}
