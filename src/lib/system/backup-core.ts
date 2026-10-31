import { createHash, randomUUID } from 'node:crypto'
export const BACKUP_TABLES = ['users', 'lessons', 'progress', 'teacher_excuses', 'payment_orders', 'payment_events', 'system_settings', 'report_shares', 'student_subscriptions', 'subscription_receipts', 'zoom_attendance_events', 'zoom_student_links', 'account_closures', 'retained_teacher_totals'] as const
type Row = Record<string, string | number | null>
export type BackupDatabase = {
  prepare(sql: string): { get(...values: (string | number | null)[]): Promise<Row | undefined>; run(...values: (string | number | null)[]): Promise<unknown>; all(...values: (string | number | null)[]): Promise<Row[]> };
  snapshot(tables: readonly string[]): Promise<Record<string, Row[]>>;
}
export type BackupStorage = { put(key: string, data: string, revision?: string): Promise<unknown>; get(key: string): Promise<string | null>; delete?(key: string): Promise<unknown> }
export function backupDay(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const part = (key: string) => parts.find(p => p.type === key)!.value
  return { day: `${part('year')}-${part('month')}-${part('day')}`, due: Number(part('hour')) >= 6 }
}
export async function createBackup(database: BackupDatabase, storage: BackupStorage, daily = false, now = new Date()) {
  const calendar = backupDay(now)
  const setting = await database.prepare("SELECT value FROM system_settings WHERE key='backups_enabled'").get()
  if (daily && (!calendar.due || setting?.value !== '1')) return null
  if (daily) {
    // A crashed worker must not permanently prevent this day's backup.
    await database.prepare("DELETE FROM backup_runs WHERE day=? AND (status='failed' OR (status='running' AND created<?))").run(calendar.day, new Date(now.getTime() - 20 * 60000).toISOString())
  }
  const id = randomUUID()
  const key = `itqan-${calendar.day}-${id}.json`
  const revision = String((await database.prepare("SELECT value FROM system_settings WHERE key='privacy_revision'").get())?.value || '0')
  const claim = await database.prepare("INSERT OR IGNORE INTO backup_runs(id,day,status,created,storage_key) VALUES(?,?,'running',?,?) RETURNING id").get(id, daily ? calendar.day : null, now.toISOString(), key)
  if (!claim) return null
  try {
    const tables = await database.snapshot(BACKUP_TABLES)
    tables.lessons = tables.lessons.map(({meeting_link: _link, ...lesson}) => lesson)
    // Restore never brings back old public report links.
    tables.report_shares = tables.report_shares.map(r => ({ ...r, revoked: 1 }))
    const expires = Math.min(now.getTime() + 30 * 86400000, ...tables.account_closures.filter(c => !c.purged_at).map(c => Date.parse(String(c.purge_at))))
    if (!Number.isFinite(expires) || expires <= now.getTime()) throw new Error('Retention cleanup is required before exporting')
    const payload = JSON.stringify({ version: 1, created: now.toISOString(), expires: new Date(expires).toISOString(), tables })
    const sha256 = createHash('sha256').update(payload).digest('hex')
    const data = JSON.stringify({ format: 'itqan-backup', sha256, payload })
    await storage.put(key, data, revision)
    const bytes = Buffer.byteLength(data)
    const completed = await database.prepare("UPDATE backup_runs SET status='completed',completed=?,sha256=?,bytes=?,error=NULL WHERE id=? AND COALESCE((SELECT value FROM system_settings WHERE key='privacy_revision'),'0')=? RETURNING id").get(new Date().toISOString(), sha256, bytes, id, revision)
    if (!completed) { await storage.delete?.(key); throw new Error('Backup invalidated by privacy cleanup') }
    return { id, key, sha256, bytes }
  } catch (error) {
    await database.prepare("UPDATE backup_runs SET status='failed',error=? WHERE id=?").run('تعذر تجهيز النسخة. تحقق من مساحة التخزين وإعداداتها.', id)
    throw error
  }
}
export function verifyBackup(data: string) {
  const envelope = JSON.parse(data)
  if (envelope.format !== 'itqan-backup' || typeof envelope.payload !== 'string' || createHash('sha256').update(envelope.payload).digest('hex') !== envelope.sha256) throw new Error('Backup checksum failed')
  const payload = JSON.parse(envelope.payload)
  // Existing exports predate subscriptions. Missing new tables represent no subscriptions.
  if (payload.version === 1 && payload.tables) {
    for (const table of ['student_subscriptions', 'subscription_receipts', 'zoom_attendance_events', 'zoom_student_links', 'account_closures', 'retained_teacher_totals']) {
      if (!(table in payload.tables)) payload.tables[table] = []
    }
  }
  if (payload.version !== 1 || !payload.tables || BACKUP_TABLES.some(table => !Array.isArray(payload.tables[table])) || Object.keys(payload.tables).some(table => !BACKUP_TABLES.includes(table as typeof BACKUP_TABLES[number]))) throw new Error('Unsupported backup')
  return payload as { version: 1; created: string; expires?: string; tables: Record<string, Row[]> }
}
