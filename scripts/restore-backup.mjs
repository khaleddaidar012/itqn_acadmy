// Restores a portable export into a NEW SQLite database. Never overwrites a database.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyBackup, BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
import { runRetention, retentionDeadline } from '../src/lib/system/retention.ts'
export async function restoreBackup(source, destination, ledger) {
  const payload = verifyBackup(readFileSync(source, 'utf8'))
  if (typeof ledger === 'string') ledger = JSON.parse(readFileSync(ledger, 'utf8'))
  const now = Date.now(), generated = Date.parse(ledger?.generated)
  const instance = payload.tables.system_settings.find(s => s.key === 'academy_instance_id')?.value
  if (!ledger || ledger.format !== 'itqan-privacy-ledger' || !instance || instance !== ledger.instance || !Array.isArray(ledger.closures) || !Number.isFinite(generated) || generated > now + 300000 || now - generated > 86400000) throw new Error('A fresh matching privacy ledger downloaded from the academy is required')
  for (const row of ledger.closures) {
    if (!Number.isSafeInteger(row.student_id) || row.student_id < 1 || row.purge_at !== retentionDeadline(row.closed_at)) throw new Error('Invalid privacy ledger')
  }
  const expiry = Math.min(Date.parse(payload.created) + 30 * 86400000, payload.expires ? Date.parse(payload.expires) : Infinity)
  if (!Number.isFinite(expiry) || expiry <= now) throw new Error('Backup has expired; create a fresh backup')
  const target = resolve(destination)
  if (existsSync(target)) throw new Error('Destination already exists. Choose a NEW database filename.')
  closeSync(openSync(target, 'wx'))
  const database = new DatabaseSync(target)
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const migrations = resolve(root, 'migrations')
    for (const name of readdirSync(migrations).filter(n => /^\d+.*\.sql$/.test(n)).sort()) database.exec(readFileSync(resolve(migrations, name), 'utf8'))
    const triggers = database.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all()
    for (const trigger of triggers) database.exec(`DROP TRIGGER "${trigger.name.replaceAll('"','""')}"`)
    database.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE')
    for (const table of BACKUP_TABLES) {
      database.exec(`DELETE FROM ${table}`)
      const columns = new Set(database.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name))
      for (const original of payload.tables[table]) {
        const row = table === 'report_shares' ? { ...original, revoked: 1 } : original
        const keys = Object.keys(row)
        if (!keys.length || keys.some(k => !columns.has(k))) throw new Error('Unexpected backup columns')
        database.prepare(`INSERT INTO ${table} (${keys.map(k => `"${k}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => row[k]))
      }
    }
    if (database.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup foreign key verification failed')
    for (const trigger of triggers) database.exec(trigger.sql)
    // The CURRENT ledger replaces historical closure state. Never restore stale
    // closures or mark a previously erased student as already safely redacted.
    database.exec('DELETE FROM account_closures')
    for (const row of ledger.closures) {
      database.prepare("INSERT INTO account_closures(student_id,closed_at,purge_at) SELECT id,?,? FROM users WHERE id=? AND role='student'").run(row.closed_at,row.purge_at,row.student_id)
    }
    database.exec('COMMIT; PRAGMA foreign_keys=ON')
    const adapter = {
      prepare(sql) { const s=database.prepare(sql);return {get:async(...v)=>s.get(...v),all:async(...v)=>s.all(...v),run:async(...v)=>s.run(...v)} },
      snapshot: async tables=>Object.fromEntries(tables.map(t=>[t,database.prepare(`SELECT * FROM ${t}`).all()])),
      async batch(queries) {database.exec('BEGIN IMMEDIATE');try{for(const q of queries)database.prepare(q.sql).run(...q.values);database.exec('COMMIT')}catch(e){database.exec('ROLLBACK');throw e}},
    }
    const storage = {put:async()=>{},get:async()=>null,delete:async()=>{}}
    // Process every overdue closure, not just the first scheduled batch.
    while ((await runRetention(adapter,storage)).purged > 0) {}
    if (database.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Restored privacy ledger foreign key verification failed')
    if (database.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite integrity check failed')
    return { target, created: payload.created, accounts: payload.tables.users.length }
  } catch (error) { try { database.exec('ROLLBACK') } catch {} database.close(); unlinkSync(target); throw error }
  finally { try { database.close() } catch {} }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5) { console.error('Usage: node scripts/restore-backup.mjs backup.json NEW-database.sqlite CURRENT-privacy-ledger.json'); process.exitCode = 1 }
  else { try { console.log(await restoreBackup(process.argv[2], process.argv[3], process.argv[4])) } catch (error) { console.error(error.message); process.exitCode = 1 } }
}
