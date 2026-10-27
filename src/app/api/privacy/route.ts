import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db } from '@/lib/system/db'
import { allowed } from '@/lib/system/permissions'
import { closeStudent, privacyLedger } from '@/lib/system/retention'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'سجّل الدخول أولًا' }, { status: 401, headers })
  if (request.nextUrl.searchParams.get('ledger') === '1') {
    if (!allowed(user, 'backups_manage')) return NextResponse.json({ error: 'لا تملك صلاحية النسخ الاحتياطي' }, { status: 403, headers })
    return NextResponse.json(await privacyLedger(db()), { headers: { ...headers, 'Content-Disposition': 'attachment; filename="itqan-privacy-ledger.json"' } })
  }
  if (user.role !== 'admin') return NextResponse.json({ error: 'للإدارة فقط' }, { status: 403, headers })
  const closures = await db().prepare('SELECT c.student_id,c.closed_at,c.purge_at,c.purged_at,u.name,u.email FROM account_closures c JOIN users u ON u.id=c.student_id ORDER BY c.closed_at DESC').all()
  return NextResponse.json({ closures }, { headers })
}
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح' }, { status: 403, headers })
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'سجّل الدخول أولًا' }, { status: 401, headers })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400, headers }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400, headers })
  const id = Number(body.student_id)
  if (user.role !== 'admin' && !(user.role === 'student' && user.id === id)) return NextResponse.json({ error: 'لا تملك صلاحية إغلاق هذا الحساب' }, { status: 403, headers })
  if (!Number.isSafeInteger(id) || id < 1 || body.confirm !== true) return NextResponse.json({ error: 'أكد طلب إغلاق الحساب' }, { status: 400, headers })
  try {
    await closeStudent(db(), id)
    return NextResponse.json({ ok: true }, { headers })
  } catch { return NextResponse.json({ error: 'الحساب غير متاح أو مغلق بالفعل' }, { status: 409, headers }) }
}
