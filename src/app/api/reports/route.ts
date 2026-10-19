import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { authorize, ServiceError, serviceError } from '@/lib/system/service-http'
import { db, tokenHash, rateLimit } from '@/lib/system/db'
import { makeStudentReport, type ReportLesson, type ReportProgress } from '@/lib/system/student-report'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    await authorize('reports_manage')
    const student = Number(request.nextUrl.searchParams.get('student'))
    const links = await db().prepare('SELECT id,created,expires,revoked FROM report_shares WHERE student_id=? ORDER BY created DESC LIMIT 30').all(student)
    return NextResponse.json({ links }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return serviceError(error) }
}
export async function POST(request: NextRequest) {
  try {
    const user = await authorize('reports_manage', request)
    const body = await request.json()
    if (body.action === 'revoke') {
      await db().prepare('UPDATE report_shares SET revoked=1 WHERE id=?').run(String(body.id))
      return NextResponse.json({ ok: true })
    }
    if (!await rateLimit(`report:${user.id}`)) throw new ServiceError('انتظر قليلًا قبل إنشاء المزيد من التقارير', 429)
    const student = await db().prepare("SELECT id,name FROM users WHERE id=? AND role='student' AND disabled=0 AND enrollment_status='active'").get(Number(body.student))
    if (!student) throw new ServiceError('اختر طالبًا مؤكدًا', 404)
    const rows = await db().snapshot(['lessons', 'progress', 'users'])
    const names = new Map(rows.users.map(u => [u.id, u.name]))
    const lessons = rows.lessons.filter(l => l.student_id === student.id).map(l => ({ id: Number(l.id), start: String(l.start), duration: Number(l.duration), status: String(l.status), subject: String(l.subject), teacher_name: String(names.get(l.teacher_id) || '') })) as ReportLesson[]
    const progress = rows.progress.filter(p => p.student_id === student.id).map(p => ({ id: Number(p.id), pages: Number(p.pages), created: String(p.created), note: String(p.note) })) as ReportProgress[]
    let report
    try { report = makeStudentReport(String(student.name), String(body.month), lessons, progress) } catch { throw new ServiceError('اختر شهرًا صحيحًا لا يتجاوز الشهر الحالي') }
    const token = randomBytes(32).toString('hex'); const id = randomUUID()
    const expires = new Date(Date.now() + 14 * 86400000).toISOString()
    await db().prepare('INSERT INTO report_shares(id,token_hash,student_id,created_by,created,expires,snapshot) VALUES(?,?,?,?,?,?,?)').run(id, tokenHash(token), Number(student.id), user.id, report.generated, expires, JSON.stringify(report))
    return NextResponse.json({ id, url: `/api/reports/shared/${token}`, expires, report }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch (error) { return serviceError(error) }
}
