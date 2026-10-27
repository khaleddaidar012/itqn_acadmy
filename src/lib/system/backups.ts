import { db } from './db'
import { d1BackupStorage } from './d1-backup-storage'
import { backupDay, createBackup, type BackupStorage } from './backup-core'
import { runRetention } from './retention'
export async function backupStorage(): Promise<BackupStorage> {
  if (process.env.ITQAN_USE_D1 === '1') {
    return d1BackupStorage(db())
  }
  const { mkdir, writeFile, readFile, unlink, readdir } = await import('node:fs/promises'); const { join } = await import('node:path')
  const directory = join(process.env.ITQAN_DATA_DIR || join(process.cwd(), '.data'), 'backups')
  await mkdir(directory, { recursive: true })
  const path = (key: string) => { if (!/^itqan-[\w-]+\.json$/.test(key)) throw new Error('Invalid backup path'); return join(directory, key) }
  // Recover orphan files if a local process died between writing and publishing.
  for (const key of await readdir(directory)) {
    if (/^itqan-[\w-]+\.json$/.test(key) && !await db().prepare('SELECT id FROM backup_runs WHERE storage_key=?').get(key)) await db().prepare('INSERT OR IGNORE INTO backup_erasure_queue(storage_key) VALUES(?)').run(key)
  }
  return { put: async (key, data, revision) => {
    const current = async () => String((await db().prepare("SELECT value FROM system_settings WHERE key='privacy_revision'").get())?.value || '0')
    if (revision !== undefined && await current() !== revision) throw new Error('Privacy revision changed')
    await writeFile(path(key), data, { flag: 'wx' })
    if (revision !== undefined && await current() !== revision) { await unlink(path(key)); throw new Error('Privacy revision changed') }
  }, get: async key => { try { return await readFile(path(key), 'utf8') } catch { return null } },
  delete: async key => { try { await unlink(path(key)) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error } } }
}
export async function runDailyBackup() {
  await runRetention(db(), await backupStorage())
  if (!backupDay(new Date()).due) return null
  if ((await db().prepare("SELECT value FROM system_settings WHERE key='backups_enabled'").get())?.value !== '1') return null
  return createBackup(db(), await backupStorage(), true)
}
