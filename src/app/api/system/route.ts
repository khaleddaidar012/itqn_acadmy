import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { db, hashPassword, checkPassword, safeUser, tokenHash, rateLimit, type User } from '@/lib/system/db'
import { currentUser } from '@/lib/system/auth'
import { accounting, type Lesson } from '@/lib/system/accounting'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const subjects = ['حفظ القرآن', 'التجويد', 'اللغة العربية']
class RequestError extends Error { constructor(message: string, public status = 400) { super(message) } }
function fail(message: string, status = 400): never { throw new RequestError(message, status) }
function str(value: unknown, max = 1000) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function number(value: unknown, min: number, max: number) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) fail('قيمة رقمية غير صالحة'); return n }
function selected(value: unknown) { if (!Array.isArray(value) || !value.length || value.some(s => !subjects.includes(s))) fail('اختر المواد المطلوبة'); return JSON.stringify([...new Set(value)]) }
function manager(user: User) { return user.role === 'admin' || (user.role === 'teacher' && !!user.manage) }
function lessonById(id: unknown) { const lesson = db().prepare('SELECT * FROM lessons WHERE id=?').get(number(id, 1, 1e9)) as Lesson | undefined; if (!lesson) fail('الحصة غير موجودة', 404); return lesson }
function canSee(user: User, lesson: Lesson) {
  return manager(user) || (user.role === 'teacher' && lesson.teacher_id === user.id) || (user.role === 'student' && lesson.student_id === user.id) || (user.role === 'parent' && safeUser(lesson.student_id)?.parent_id === user.id)
}
function schedule(input: Record<string, unknown>) {
  const teacher = safeUser(number(input.teacher_id, 1, 1e9)); const student = safeUser(number(input.student_id, 1, 1e9))
  if (teacher?.role !== 'teacher' || student?.role !== 'student') fail('اختر معلمًا وطالبًا صحيحين')
  const subject = str(input.subject)
  if (!subjects.includes(subject) || !JSON.parse(student.subjects).includes(subject)) fail('المادة ليست من مواد الطالب')
  const startMs = Date.parse(str(input.start)); const duration = number(input.duration, 15, 180)
  if (!Number.isInteger(duration) || !Number.isFinite(startMs) || startMs < Date.now()) fail('اختر موعدًا مستقبليًا ومدة صحيحة')
  const start = new Date(startMs).toISOString(); const end = new Date(startMs + duration * 60000).toISOString()
  const conflict = db().prepare("SELECT id FROM lessons WHERE status NOT IN ('cancelled','postponed') AND (teacher_id=? OR student_id=?) AND start < ? AND datetime(start, '+' || duration || ' minutes') > datetime(?)").get(teacher.id, student.id, end, start)
  if (conflict) fail('الموعد يتعارض مع حصة للمعلم أو الطالب')
  return Number(db().prepare('INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency) VALUES(?,?,?,?,?,?,?)').run(teacher.id, student.id, subject, start, duration, teacher.rate, teacher.currency).lastInsertRowid)
}
export async function GET() {
  try {
    const user = await currentUser(); if (!user) fail('سجّل الدخول أولًا', 401)
    const users = user.role === 'admin'
      ? db().prepare('SELECT id,name,email,role,manage,subjects,parent_id,pages FROM users ORDER BY id DESC').all()
      : manager(user) ? db().prepare("SELECT id,name,role,manage,subjects,pages FROM users WHERE role IN ('student','teacher')").all()
      : user.role === 'parent' ? db().prepare('SELECT id,name,role,pages,subjects FROM users WHERE parent_id=?').all(user.id)
      : user.role === 'teacher' ? db().prepare('SELECT id,name,role,pages,subjects FROM users WHERE id=? OR id IN (SELECT student_id FROM lessons WHERE teacher_id=?)').all(user.id, user.id)
      : [safeUser(user.id)]
    const all = db().prepare('SELECT l.*,t.name AS teacher_name,s.name AS student_name FROM lessons l JOIN users t ON t.id=l.teacher_id JOIN users s ON s.id=l.student_id ORDER BY l.start DESC').all() as unknown as Lesson[]
    const lessons = all.filter(l => canSee(user, l)).map(l => {
      if (user.role === 'admin' || user.role === 'teacher' && l.teacher_id === user.id) return { ...l, ...accounting(l) }
      if (manager(user)) { const { rate: _rate, currency: _currency, ...visible } = l; return { ...visible, minutes: accounting(l).minutes } }
      const { rate: _rate, currency: _currency, joined: _joined, left_at: _left, ...visible } = l
      return visible
    })
    const progress = db().prepare('SELECT p.*,t.name AS teacher_name FROM progress p JOIN users t ON t.id=p.teacher_id ORDER BY p.created DESC').all().filter(p => manager(user) || (user.role === 'teacher' && p.teacher_id === user.id) || (user.role === 'student' && p.student_id === user.id) || (user.role === 'parent' && safeUser(Number(p.student_id))?.parent_id === user.id))
    const staff = user.role === 'admin' ? db().prepare("SELECT id,name,rate,currency,manage FROM users WHERE role='teacher'").all() : []
    return NextResponse.json({ user, users, staff, lessons, progress, now: new Date().toISOString(), cancelHours: Number(process.env.ITQAN_CANCEL_HOURS) || 12 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error) }
}
function errorResponse(error: unknown) {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('ITQAN system request failed', error instanceof Error ? error.message : 'Unknown error')
  return NextResponse.json({ error: 'تعذر تنفيذ الطلب. حاول مرة أخرى.' }, { status: 500 })
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) fail('مصدر الطلب غير مسموح', 403)
    const body = await request.json() as Record<string, unknown>
    const action = str(body.action)
    if (action === 'login' || action === 'register') {
      const email = str(body.email, 254).toLowerCase(); const password = str(body.password, 256)
      if (!rateLimit(`auth:${email}`)) fail('محاولات كثيرة. انتظر 15 دقيقة.', 429)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('البريد الإلكتروني غير صحيح')
      let id: number
      if (action === 'register') {
        const name = str(body.name, 100); if (!name || password.length < 12) fail('أدخل الاسم وكلمة مرور لا تقل عن 12 حرفًا')
        const courses = selected(body.subjects)
        if (db().prepare('SELECT id FROM users WHERE email=?').get(email)) fail('البريد مسجل بالفعل')
        id = Number(db().prepare("INSERT INTO users(name,email,password,role,subjects) VALUES(?,?,?,'student',?)").run(name, email, hashPassword(password), courses).lastInsertRowid)
      } else {
        const account = db().prepare('SELECT id,password FROM users WHERE email=?').get(email) as { id: number; password: string } | undefined
        if (!account || !checkPassword(password, account.password)) fail('البريد أو كلمة المرور غير صحيحة', 401)
        id = account.id
      }
      const token = randomBytes(32).toString('hex'); const expires = Date.now() + 7 * 86400000
      db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())
      db().prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(tokenHash(token), id, expires)
      const response = NextResponse.json({ user: safeUser(id) })
      response.cookies.set('itqan_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 86400 })
      return response
    }
    const user = await currentUser(); if (!user) fail('سجّل الدخول أولًا', 401)
    if (action === 'logout') {
      const token = request.cookies.get('itqan_session')?.value
      if (token) db().prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token))
      const response = NextResponse.json({ ok: true }); response.cookies.delete('itqan_session'); return response
    }
    if (action === 'createUser') {
      if (user.role !== 'admin') fail('للإدارة فقط', 403)
      const role = str(body.role); if (!['teacher', 'parent'].includes(role)) fail('نوع الحساب غير صحيح')
      const name = str(body.name, 100); const email = str(body.email, 254).toLowerCase(); const password = str(body.password, 256)
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) fail('أكمل البيانات وكلمة مرور من 12 حرفًا على الأقل')
      if (db().prepare('SELECT id FROM users WHERE email=?').get(email)) fail('البريد مسجل بالفعل')
      const rate = role === 'teacher' ? number(body.rate, 0, 100000) : 0
      const currency = str(body.currency); if (!['USD', 'EGP'].includes(currency)) fail('العملة غير صحيحة')
      db().prepare('INSERT INTO users(name,email,password,role,rate,currency,manage) VALUES(?,?,?,?,?,?,?)').run(name, email, hashPassword(password), role, rate, currency, role === 'teacher' && body.manage === true ? 1 : 0)
    } else if (action === 'updateTeacher') {
      if (user.role !== 'admin') fail('للإدارة فقط', 403)
      const teacher = safeUser(number(body.id, 1, 1e9)); if (teacher?.role !== 'teacher') fail('المعلم غير موجود')
      const currency = str(body.currency); if (!['USD', 'EGP'].includes(currency)) fail('العملة غير صحيحة')
      db().prepare('UPDATE users SET rate=?,currency=?,manage=? WHERE id=?').run(number(body.rate, 0, 100000), currency, body.manage === true ? 1 : 0, teacher.id)
    } else if (action === 'linkParent') {
      if (user.role !== 'admin') fail('للإدارة فقط', 403)
      const student = safeUser(number(body.student_id, 1, 1e9)); const parent = safeUser(number(body.parent_id, 1, 1e9))
      if (student?.role !== 'student' || parent?.role !== 'parent') fail('اختر الطالب وولي الأمر')
      db().prepare('UPDATE users SET parent_id=? WHERE id=?').run(parent.id, student.id)
    } else if (action === 'changePassword') {
      const password = str(body.password, 256)
      const old = str(body.oldPassword, 256)
      if (!rateLimit(`password:${user.id}`)) fail('محاولات كثيرة. انتظر 15 دقيقة.', 429)
      const row = db().prepare('SELECT password FROM users WHERE id=?').get(user.id) as { password: string }
      if (!checkPassword(old, row.password)) fail('كلمة المرور الحالية غير صحيحة')
      if (password.length < 12) fail('كلمة المرور الجديدة لا تقل عن 12 حرفًا')
      db().prepare('UPDATE users SET password=? WHERE id=?').run(hashPassword(password), user.id)
      const token = request.cookies.get('itqan_session')?.value || ''
      db().prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(user.id, tokenHash(token))
    } else if (action === 'schedule') {
      if (!manager(user)) fail('ليست لديك صلاحية إدارة الجداول', 403)
      const starts = Array.isArray(body.starts) ? body.starts : [body.start]
      if (!starts.length || starts.length > 12) fail('الحد الأقصى 12 أسبوعًا في المرة الواحدة')
      db().exec('BEGIN IMMEDIATE')
      try { for (const start of starts) schedule({ ...body, start }); db().exec('COMMIT') }
      catch (error) { db().exec('ROLLBACK'); throw error }
    } else if (action === 'join' || action === 'leave') {
      const lesson = lessonById(body.id)
      if (user.role !== 'teacher' || lesson.teacher_id !== user.id) fail('هذه الحصة ليست لك', 403)
      const now = Date.now(); const start = Date.parse(lesson.start); const end = start + lesson.duration * 60000
      if (!['scheduled', 'attended', 'absent', 'late_cancelled'].includes(lesson.status)) fail('الحصة غير متاحة')
      if (now < start - 5 * 60000 || now >= end) fail('الدخول متاح قبل الحصة بخمس دقائق وحتى نهايتها')
      if (action === 'join') {
        if (lesson.left_at) fail('تم إنهاء حضورك لهذه الحصة')
        db().prepare('UPDATE lessons SET joined=COALESCE(joined,?) WHERE id=?').run(new Date(now).toISOString(), lesson.id)
      } else {
        if (!lesson.joined || lesson.left_at) fail('لا يوجد حضور مفتوح')
        db().prepare('UPDATE lessons SET left_at=? WHERE id=?').run(new Date(now).toISOString(), lesson.id)
      }
    } else if (action === 'cancel') {
      const lesson = lessonById(body.id)
      if (!canSee(user, lesson) || user.role === 'teacher' && !manager(user)) fail('غير مسموح', 403)
      if (lesson.status !== 'scheduled' || lesson.joined || Date.parse(lesson.start) <= Date.now()) fail('لا يمكن إلغاء هذه الحصة')
      const hours = Number(process.env.ITQAN_CANCEL_HOURS) || 12
      const status = Date.parse(lesson.start) - Date.now() >= hours * 3600000 ? 'cancelled' : 'late_cancelled'
      db().prepare('UPDATE lessons SET status=? WHERE id=?').run(status, lesson.id)
    } else if (action === 'postpone') {
      if (!manager(user)) fail('ليست لديك صلاحية التأجيل', 403)
      const lesson = lessonById(body.id)
      if (lesson.status !== 'scheduled' || lesson.joined) fail('لا يمكن تأجيل هذه الحصة')
      db().exec('BEGIN IMMEDIATE')
      try {
        db().prepare("UPDATE lessons SET status='postponed' WHERE id=?").run(lesson.id)
        const replacement = schedule({ ...lesson, start: body.start })
        db().prepare('UPDATE lessons SET replaced_by=? WHERE id=?').run(replacement, lesson.id)
        db().exec('COMMIT')
      } catch (error) { db().exec('ROLLBACK'); throw error }
    } else if (action === 'attendance') {
      const lesson = lessonById(body.id)
      if (!manager(user) && !(user.role === 'teacher' && lesson.teacher_id === user.id)) fail('غير مسموح', 403)
      if (!['scheduled', 'attended', 'absent'].includes(lesson.status) || Date.now() < Date.parse(lesson.start)) fail('لا يمكن تعديل حضور هذه الحصة')
      const status = str(body.status); if (!['attended', 'absent'].includes(status)) fail('الحالة غير صحيحة')
      db().prepare('UPDATE lessons SET status=? WHERE id=?').run(status, lesson.id)
    } else if (action === 'progress') {
      const lesson = lessonById(body.id)
      if (user.role !== 'teacher' || lesson.teacher_id !== user.id) fail('توثيق التقدم لمعلم الحصة فقط', 403)
      if (!lesson.joined || !['scheduled', 'attended'].includes(lesson.status) || lesson.subject !== 'حفظ القرآن') fail('التوثيق لحصة حفظ حضرها المعلم')
      const pages = number(body.pages, 0, 604); if (!Number.isInteger(pages)) fail('عدد الصفحات يجب أن يكون صحيحًا')
      const note = str(body.note, 2000); if (!note) fail('اكتب تفاصيل الحفظ والمراجعة')
      db().exec('BEGIN IMMEDIATE')
      try {
        db().prepare('UPDATE users SET pages=? WHERE id=?').run(pages, lesson.student_id)
        db().prepare('INSERT INTO progress(student_id,teacher_id,lesson_id,pages,note,created) VALUES(?,?,?,?,?,?)').run(lesson.student_id, user.id, lesson.id, pages, note, new Date().toISOString())
        db().exec('COMMIT')
      } catch (error) { db().exec('ROLLBACK'); throw error }
    } else fail('عملية غير معروفة')
    return NextResponse.json({ ok: true })
  } catch (error) { return errorResponse(error) }
}
