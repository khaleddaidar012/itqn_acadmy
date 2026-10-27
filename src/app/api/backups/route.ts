import { NextRequest, NextResponse } from 'next/server'
import { authorize, serviceError, ServiceError } from '@/lib/system/service-http'
import { db, rateLimit } from '@/lib/system/db'
import { createBackup, verifyBackup } from '@/lib/system/backup-core'
import { backupStorage, runDailyBackup } from '@/lib/system/backups'
import { runRetention } from '@/lib/system/retention'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  try {
    const user = await authorize('backups_manage')
    await runRetention(db(), await backupStorage())
    if (request.nextUrl.searchParams.get('download')) {
      const row = await db().prepare("SELECT * FROM backup_runs WHERE id=? AND status='completed'").get(request.nextUrl.searchParams.get('download')!)
      if (!row) throw new ServiceError('النسخة غير موجودة', 404)
      const data = await (await backupStorage()).get(String(row.storage_key))
      if (!data) throw new ServiceError('ملف النسخة غير متاح', 404)
      const payload = verifyBackup(data)
      const expiry = Math.min(Date.parse(payload.created) + 30 * 86400000, payload.expires ? Date.parse(payload.expires) : Infinity)
      if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new ServiceError('انتهت صلاحية النسخة. أنشئ نسخة جديدة.', 410)
      if (!await db().prepare("SELECT id FROM backup_runs WHERE id=? AND status='completed'").get(String(row.id))) throw new ServiceError('أُلغيت النسخة بسبب حذف بيانات', 410)
      return new Response(data, { headers: { ...headers, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${row.storage_key}"` } })
    }
    let warning = ''
    try { await runDailyBackup() } catch { warning = 'تعذر أخذ النسخة اليومية. تحقق من إعدادات التخزين.' }
    const setting = await db().prepare("SELECT value FROM system_settings WHERE key='backups_enabled'").get()
    const latest = await db().prepare("SELECT id,created,completed,bytes,sha256 FROM backup_runs WHERE status='completed' ORDER BY completed DESC LIMIT 1").get()
    const lastRun = await db().prepare('SELECT status,created,error FROM backup_runs ORDER BY created DESC LIMIT 1').get()
    const receipt = await db().prepare('SELECT saved,backup_id FROM backup_receipts WHERE user_id=? AND device=?').get(user.id, (request.nextUrl.searchParams.get('device') || '').slice(0, 80))
    if (await db().prepare('SELECT storage_key FROM backup_erasure_queue LIMIT 1').get()) warning = 'يوجد حذف لنسخ خادم ينتظر إعادة المحاولة. راجع أذونات ومساحة التخزين.'
    return NextResponse.json({ enabled: setting?.value === '1', latest: latest || null, lastRun: lastRun || null, receipt: receipt || null, warning }, { headers })
  } catch (error) { return serviceError(error) }
}
export async function POST(request: NextRequest) {
  try {
    const user = await authorize('backups_manage', request)
    await runRetention(db(), await backupStorage())
    const body = await request.json()
    if (body.action === 'toggle') {
      if (typeof body.enabled !== 'boolean') throw new ServiceError('قيمة غير صحيحة')
      await db().prepare("UPDATE system_settings SET value=? WHERE key='backups_enabled'").run(body.enabled ? '1' : '0')
    } else if (body.action === 'create') {
      if (!await rateLimit(`backup:${user.id}`)) throw new ServiceError('انتظر قليلًا قبل إنشاء نسخة أخرى', 429)
      await createBackup(db(), await backupStorage())
    } else if (body.action === 'receipt') {
      const row = await db().prepare("SELECT id FROM backup_runs WHERE id=? AND status='completed' AND sha256=?").get(String(body.id), String(body.sha256))
      if (!row || !/^[a-zA-Z0-9-]{16,80}$/.test(body.device)) throw new ServiceError('بيانات النسخة غير صحيحة')
      await db().prepare('INSERT INTO backup_receipts(user_id,device,backup_id,saved) VALUES(?,?,?,?) ON CONFLICT(user_id,device) DO UPDATE SET backup_id=excluded.backup_id,saved=excluded.saved').run(user.id, body.device, String(body.id), new Date().toISOString())
    } else throw new ServiceError('إجراء غير صحيح')
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) { return serviceError(error) }
}
