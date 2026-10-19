// Restores a portable export into a NEW SQLite database. Never overwrites a database.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyBackup, BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
export function restoreBackup(source, destination) {
  const payload = verifyBackup(readFileSync(source, 'utf8'))
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
    database.exec('COMMIT; PRAGMA foreign_keys=ON')
    if (database.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite integrity check failed')
    return { target, created: payload.created, accounts: payload.tables.users.length }
  } catch (error) { try { database.exec('ROLLBACK') } catch {} database.close(); unlinkSync(target); throw error }
  finally { try { database.close() } catch {} }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) { console.error('Usage: node scripts/restore-backup.mjs backup.json NEW-database.sqlite'); process.exitCode = 1 }
  else { try { console.log(restoreBackup(process.argv[2], process.argv[3])) } catch (error) { console.error(error.message); process.exitCode = 1 } }
}
