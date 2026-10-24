import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { currentUser } from '@/lib/system/auth'
import { db } from '@/lib/system/db'
import { allowed } from '@/lib/system/permissions'
import { ServiceError, serviceError } from '@/lib/system/service-http'
import { cairoToIso } from '@/lib/system/calendar'
import { subscriptionPlans, subscriptionRows } from '@/lib/system/subscriptions'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const methods = ['vodafone_cash', 'instapay', 'bank_transfer', 'paypal', 'cash']
function text(value: unknown, max = 200) { if (typeof value !== 'string' || value.length > max) throw new ServiceError('بيانات غير صحيحة'); return value.trim() }
function money(value: unknown) {
  if (typeof value !== 'string' || !/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new ServiceError('أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين')
  return Math.round(Number(value) * 100)
}
export async function GET() {
  try {
    const user = await currentUser(); if (!user) throw new ServiceError('سجل الدخول أولًا', 401)
    const manage = allowed(user, 'subscriptions_manage')
    if (!manage && !['student', 'parent'].includes(user.role)) throw new ServiceError('ليس لديك صلاحية', 403)
    const rows = await subscriptionRows(manage ? '1=1' : user.role === 'student' ? 's.student_id=?' : 'u.parent_id=?', manage ? [] : [user.id])
    const students = manage ? await db().prepare("SELECT id,name FROM users WHERE role='student' AND disabled=0 ORDER BY name").all() : []
    const receipts = await db().prepare(`SELECT r.* FROM subscription_receipts r JOIN student_subscriptions s ON s.id=r.subscription_id JOIN users u ON u.id=s.student_id WHERE ${manage ? '1=1' : user.role === 'student' ? 's.student_id=?' : 'u.parent_id=?'} ORDER BY r.created DESC`).all(...(manage ? [] : [user.id]))
    return NextResponse.json({ manage, subscriptions: rows, receipts, students, plans: manage ? subscriptionPlans : [], now: new Date().toISOString() }, { headers })
  } catch (error) { return serviceError(error) }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new ServiceError('مصدر الطلب غير مسموح', 403)
    const user = await currentUser(); if (!user) throw new ServiceError('سجل الدخول أولًا', 401)
    if (!allowed(user, 'subscriptions_manage')) throw new ServiceError('ليس لديك صلاحية إدارة الاشتراكات', 403)
    const raw = await request.text(); if (raw.length > 8192) throw new ServiceError('طلب كبير جدًا', 413)
    let body; try { body = JSON.parse(raw) } catch { throw new ServiceError('طلب غير صحيح') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError('طلب غير صحيح')
    const requestKey = text(body.request_key, 36)
    if (!/^[a-f0-9-]{36}$/i.test(requestKey)) throw new ServiceError('مرجع الطلب غير صحيح')
    if (body.action === 'create') {
      const existing = await db().prepare('SELECT id FROM student_subscriptions WHERE request_key=?').get(requestKey)
      if (existing) return NextResponse.json({ id: existing.id }, { headers })
      const studentId = Number(body.student_id)
      if (!Number.isSafeInteger(studentId) || !await db().prepare("SELECT id FROM users WHERE id=? AND role='student' AND disabled=0").get(studentId)) throw new ServiceError('اختر طالبًا متاحًا')
      const plan = subscriptionPlans.find(p => p.id === body.plan_id); if (!plan) throw new ServiceError('اختر باقة فردية صحيحة')
      const subject = text(body.subject, 40); if (!plan.subjects.includes(subject)) throw new ServiceError('اختر مادة متوافقة مع الباقة')
      let starts: string, ends: string
      try { starts = cairoToIso(text(body.starts, 10) + 'T00:00'); ends = cairoToIso(text(body.ends, 10) + 'T00:00') } catch { throw new ServiceError('اختر تاريخ بداية ونهاية صحيحين') }
      if (ends <= starts) throw new ServiceError('نهاية الاشتراك يجب أن تكون بعد البداية')
      const id = randomUUID()
      await db().prepare('INSERT INTO student_subscriptions(id,request_key,student_id,plan_id,plan_name,subject,duration,total_sessions,amount,currency,starts,ends,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,requestKey,studentId,plan.id,plan.programName+' — '+plan.nameAr,subject,plan.durationMinutes || null,plan.sessionsPerMonth*(plan.billingMonths || 1),Math.round(plan.price*(plan.billingMonths || 1)*100),plan.currency,starts,ends,user.id,new Date().toISOString())
      return NextResponse.json({ id }, { headers })
    }
    if (body.action === 'receipt') {
      const existing = await db().prepare('SELECT id FROM subscription_receipts WHERE request_key=?').get(requestKey)
      if (existing) return NextResponse.json({ id: existing.id }, { headers })
      const subscriptionId = text(body.subscription_id, 36)
      if (!await db().prepare('SELECT id FROM student_subscriptions WHERE id=?').get(subscriptionId)) throw new ServiceError('الاشتراك غير موجود')
      const amount = money(body.amount); if (amount <= 0) throw new ServiceError('المبلغ يجب أن يكون أكبر من صفر')
      const method = text(body.method, 30), reference = text(body.reference)
      if (!methods.includes(method) || !reference) throw new ServiceError('اختر وسيلة السداد وأدخل مرجع التحويل أو الإيصال')
      const id = randomUUID()
      await db().prepare('INSERT INTO subscription_receipts(id,request_key,subscription_id,amount,method,reference,created_by,created) VALUES(?,?,?,?,?,?,?,?)').run(id,requestKey,subscriptionId,amount,method,reference,user.id,new Date().toISOString())
      return NextResponse.json({ id }, { headers })
    }
    throw new ServiceError('عملية غير معروفة')
  } catch (error) {
    if (error instanceof Error && error.message.includes('subscription_overlap')) return serviceError(new ServiceError('يوجد اشتراك لنفس الطالب والمادة خلال هذه الفترة. اختر فترة تجديد لاحقة.', 409))
    if (error instanceof Error && error.message.includes('subscription_overpayment')) return serviceError(new ServiceError('المبلغ يتجاوز المتبقي على الاشتراك', 409))
    return serviceError(error)
  }
}
