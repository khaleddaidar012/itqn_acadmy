import { randomUUID } from 'node:crypto'
import type { BackupDatabase, BackupStorage } from './backup-core.ts'
import { accounting, type Lesson } from './accounting.ts'
import { presenceIntervals, type AttendanceEvent } from '../zoom/attendance.ts'

type Query = { sql: string; values: (string | number | null)[] }
export type RetentionDatabase = BackupDatabase & { batch(queries: Query[]): Promise<unknown> }
export function retentionDeadline(closed: string) {
  const date = new Date(closed)
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid closure date')
  const month = date.getUTCMonth(); date.setUTCFullYear(date.getUTCFullYear() + 1)
  if (date.getUTCMonth() !== month) date.setUTCDate(0) // February 29 -> February 28.
  return date.toISOString()
}
export async function closeStudent(database: RetentionDatabase, id: number, now = new Date()) {
  const row = await database.prepare("INSERT OR IGNORE INTO account_closures(student_id,closed_at,purge_at) SELECT id,?,? FROM users WHERE id=? AND role='student' AND disabled=0 RETURNING student_id").get(now.toISOString(), retentionDeadline(now.toISOString()), id)
  if (!row) throw new Error('student_not_available')
}
export async function privacyLedger(database: BackupDatabase, now = new Date()) {
  return { format: 'itqan-privacy-ledger', generated: now.toISOString(), instance: (await database.prepare("SELECT value FROM system_settings WHERE key='academy_instance_id'").get())?.value,
    closures: await database.prepare('SELECT student_id,closed_at,purge_at,purged_at FROM account_closures ORDER BY student_id').all() }
}
export async function runRetention(database: RetentionDatabase, storage: BackupStorage, now = new Date()) {
  const at = now.toISOString(); let purged = 0
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString()
  const expired = 'SELECT storage_key FROM backup_runs WHERE created<=?'
  await database.batch([
    { sql: 'INSERT OR IGNORE INTO backup_erasure_queue(storage_key) SELECT storage_key FROM backup_runs WHERE created<=? AND storage_key IS NOT NULL', values: [cutoff] },
    { sql: `DELETE FROM backup_object_chunks WHERE storage_key IN (${expired})`, values: [cutoff] },
    { sql: `DELETE FROM backup_objects WHERE storage_key IN (${expired})`, values: [cutoff] },
    { sql: 'DELETE FROM backup_receipts WHERE backup_id IN(SELECT id FROM backup_runs WHERE created<=?)', values: [cutoff] },
    { sql: 'DELETE FROM backup_runs WHERE created<=?', values: [cutoff] },
  ])
  const due = await database.prepare('SELECT student_id FROM account_closures WHERE purged_at IS NULL AND purge_at<=? ORDER BY purge_at LIMIT 10').all(at)
  for (const entry of due) {
    const id = Number(entry.student_id), owner = randomUUID()
    if (!await database.prepare('UPDATE account_closures SET purge_owner=?,lease_until=? WHERE student_id=? AND purged_at IS NULL AND purge_at<=? AND lease_until<? RETURNING student_id').get(owner, now.getTime() + 300000, id, at, now.getTime())) continue
    // All reads are a consistent snapshot. The final batch is conditional on this lease,
    // so retries/concurrent cron executions cannot add the same pay totals twice.
    const snapshot = await database.snapshot(['lessons', 'zoom_attendance_events', 'zoom_meetings'])
    const totals = new Map<string, { teacher: number; month: string; currency: string; minutes: number; earned: number; lessons: number }>()
    for (const row of snapshot.lessons.filter(l => l.student_id === id)) {
      const lesson = row as unknown as Lesson
      const events = snapshot.zoom_attendance_events.filter(e => e.lesson_id === lesson.id) as unknown as AttendanceEvent[]
      if (events.length || snapshot.zoom_meetings.some(m => m.lesson_id === lesson.id)) lesson.zoom_intervals = presenceIntervals(events, 'teacher')
      const pay = accounting(lesson, now.getTime())
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).formatToParts(new Date(lesson.start))
      const month = `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`
      const key = `${lesson.teacher_id}:${month}:${lesson.currency}`
      const total = totals.get(key) || { teacher: lesson.teacher_id, month, currency: lesson.currency, minutes: 0, earned: 0, lessons: 0 }
      total.minutes += pay.minutes; total.earned += pay.earned; total.lessons++; totals.set(key, total)
    }
    const guard = 'EXISTS(SELECT 1 FROM account_closures WHERE student_id=? AND purge_owner=? AND purged_at IS NULL AND purge_at<=?)'
    const queries: Query[] = []
    const add = (sql: string, values: Query['values'] = []) => queries.push({ sql, values: [...values, id, owner, at] })
    for (const t of totals.values()) add(`INSERT INTO retained_teacher_totals(teacher_id,month,currency,minutes,earned,lessons) SELECT ?,?,?,?,?,? WHERE ${guard} ON CONFLICT(teacher_id,month,currency) DO UPDATE SET minutes=minutes+excluded.minutes,earned=earned+excluded.earned,lessons=lessons+excluded.lessons`, [t.teacher,t.month,t.currency,t.minutes,t.earned,t.lessons])
    // Invalidate every older export: full snapshots cannot be partially deleted safely.
    add(`INSERT OR IGNORE INTO backup_erasure_queue(storage_key) SELECT storage_key FROM backup_runs WHERE storage_key IS NOT NULL AND ${guard}`)
    add(`DELETE FROM backup_object_chunks WHERE ${guard}`)
    add(`DELETE FROM backup_objects WHERE ${guard}`)
    add(`DELETE FROM backup_receipts WHERE ${guard}`)
    add(`DELETE FROM backup_runs WHERE ${guard}`)
    add(`UPDATE system_settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT) WHERE key='privacy_revision' AND ${guard}`)
    const lessons = 'SELECT id FROM lessons WHERE student_id=?'
    for (const table of ['zoom_pending_participants','zoom_attendance_events','zoom_end_jobs','zoom_meetings','teacher_excuses']) add(`DELETE FROM ${table} WHERE lesson_id IN (${lessons}) AND ${guard}`, [id])
    add(`DELETE FROM zoom_student_links WHERE (student_id=? OR lesson_id IN (${lessons})) AND ${guard}`, [id,id])
    add(`DELETE FROM report_shares WHERE student_id=? AND ${guard}`, [id])
    add(`DELETE FROM progress WHERE (student_id=? OR lesson_id IN (${lessons})) AND ${guard}`, [id,id])
    add(`DELETE FROM payment_events WHERE order_id IN(SELECT id FROM payment_orders WHERE student_id=?) AND ${guard}`, [id])
    add(`DELETE FROM payment_orders WHERE student_id=? AND ${guard}`, [id])
    add(`DELETE FROM subscription_receipts WHERE subscription_id IN(SELECT id FROM student_subscriptions WHERE student_id=?) AND ${guard}`, [id])
    add(`DELETE FROM student_subscriptions WHERE student_id=? AND ${guard}`, [id])
    add(`UPDATE teacher_excuses SET replacement_id=NULL WHERE replacement_id IN (${lessons}) AND ${guard}`, [id])
    add(`UPDATE lessons SET replaced_by=NULL WHERE replaced_by IN (${lessons}) AND ${guard}`, [id])
    add(`DELETE FROM lessons WHERE student_id=? AND ${guard}`, [id])
    for (const table of ['sessions','zoom_oauth_states','zoom_refresh_locks','zoom_connections']) add(`DELETE FROM ${table} WHERE user_id=? AND ${guard}`, [id])
    add(`DELETE FROM attempts WHERE (key IN(SELECT 'auth:'||email FROM users WHERE id=?) OR key=?) AND ${guard}`, [id,`password:${id}`])
    add(`DELETE FROM system_settings WHERE key LIKE 'zoom_webhook_last:%' AND ${guard}`)
    // Keep an unidentifiable disabled ID tombstone to prevent ID reuse and to apply
    // the deletion ledger to old exports. No original name/email/password remains.
    add(`UPDATE users SET name='حساب محذوف',email=?,password='',subjects='[]',parent_id=NULL,pages=0,permissions=NULL,manage=0,rate=0,disabled=1 WHERE id=? AND ${guard}`, [`deleted-${randomUUID()}@invalid.local`,id])
    add(`UPDATE account_closures SET purged_at=?,purge_owner=NULL,lease_until=0 WHERE student_id=? AND ${guard}`, [at,id])
    await database.batch(queries)
    purged++
  }
  let pendingFiles = 0
  const queue = await database.prepare('SELECT storage_key FROM backup_erasure_queue LIMIT 100').all()
  for (const file of queue) {
    try {
      if (!storage.delete) throw new Error('Storage deletion is unavailable')
      await storage.delete(String(file.storage_key))
      await database.prepare('DELETE FROM backup_erasure_queue WHERE storage_key=?').run(String(file.storage_key))
    } catch { pendingFiles++ }
  }
  return { purged, pendingFiles }
}
