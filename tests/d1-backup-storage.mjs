import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { d1BackupStorage } from '../src/lib/system/d1-backup-storage.ts'
import { backupStorageSchema } from '../src/lib/system/backup-storage-schema.ts'
import { createBackup, verifyBackup, BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
const sqlite = new DatabaseSync(':memory:')
sqlite.exec('PRAGMA foreign_keys=ON;' + backupStorageSchema)
sqlite.exec("CREATE TABLE system_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO system_settings VALUES('backups_enabled','1'); CREATE TABLE backup_runs(id TEXT PRIMARY KEY,day TEXT UNIQUE,status TEXT,created TEXT,completed TEXT,storage_key TEXT,sha256 TEXT,bytes INTEGER,error TEXT)")
const database = {
  prepare(sql) { const statement = sqlite.prepare(sql); return { get: async (...values) => statement.get(...values), all: async (...values) => statement.all(...values), run: async (...values) => statement.run(...values) } },
  async batch(queries) { sqlite.exec('BEGIN'); try { for (const q of queries) sqlite.prepare(q.sql).run(...q.values); sqlite.exec('COMMIT') } catch (error) { sqlite.exec('ROLLBACK'); throw error } },
  async snapshot(tables) { return Object.fromEntries(tables.map(t => [t, []])) },
}
const storage = d1BackupStorage(database)
const text = 'أ'.repeat(32767) + '🌍' + 'اختبار'.repeat(20000)
await storage.put('unicode', text); assert.equal(await storage.get('unicode'), text)
await assert.rejects(() => storage.put('unicode', 'overwrite'))
assert.equal(await storage.get('unicode'), text); assert.equal(await storage.get('missing'), null)
sqlite.prepare('DELETE FROM backup_object_chunks WHERE storage_key=? AND position=1').run('unicode')
await assert.rejects(() => storage.get('unicode'), /Incomplete/)
const backup = await createBackup(database, storage)
assert.equal(Object.keys(verifyBackup(await storage.get(backup.key)).tables).length, BACKUP_TABLES.length)
assert.ok(!BACKUP_TABLES.includes('backup_objects')); assert.ok(!BACKUP_TABLES.includes('backup_object_chunks'))
// A failed chunk must roll back the metadata and every previously written chunk.
sqlite.exec("CREATE TRIGGER fail_chunk BEFORE INSERT ON backup_object_chunks WHEN NEW.storage_key='fail' AND NEW.position=1 BEGIN SELECT RAISE(ABORT,'forced'); END")
await assert.rejects(() => storage.put('fail', 'x'.repeat(70000)))
assert.equal(await storage.get('fail'), null)
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM backup_object_chunks WHERE storage_key='fail'").get().n, 0)
sqlite.close()
console.log('PASS: chunked Unicode storage, retrieval, integrity, rollback and portable backup verification')
