import type { BackupDatabase, BackupStorage } from './backup-core'
type Query = { sql: string; values: (string | number | null)[] }
type Database = Pick<BackupDatabase, 'prepare'> & { batch(queries: Query[]): Promise<unknown> }

// Chunk payloads so an export does not need to fit into a single D1 row/value.
export function d1BackupStorage(database: Database): BackupStorage {
  return {
    async put(key, data, revision) {
      if (!data || Buffer.byteLength(data, 'utf8') > 32 * 1024 * 1024) throw new Error('Backup exceeds the supported export size')
      const chunks: string[] = []
      for (let offset = 0; offset < data.length;) {
        let end = Math.min(offset + 32768, data.length)
        // Never split a Unicode surrogate pair between bound SQL values.
        if (end < data.length && /[\uD800-\uDBFF]/.test(data[end - 1])) end--
        chunks.push(data.slice(offset, end)); offset = end
      }
      await database.batch([
        { sql: "INSERT INTO backup_objects(storage_key,chunks,created) SELECT ?,?,? WHERE ? IS NULL OR COALESCE((SELECT value FROM system_settings WHERE key='privacy_revision'),'0')=?", values: [key,chunks.length,new Date().toISOString(),revision??null,revision??null] },
        ...chunks.map((content, position) => ({ sql: 'INSERT INTO backup_object_chunks(storage_key,position,content) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM backup_objects WHERE storage_key=?)', values: [key,position,content,key] })),
      ])
    },
    async get(key) {
      const object = await database.prepare('SELECT chunks FROM backup_objects WHERE storage_key=?').get(key)
      if (!object) return null
      const rows = await database.prepare('SELECT position,content FROM backup_object_chunks WHERE storage_key=? ORDER BY position').all(key)
      if (rows.length !== object.chunks || rows.some((row, i) => row.position !== i)) throw new Error('Incomplete backup data')
      return rows.map(row => String(row.content)).join('')
    },
    async delete(key) {
      await database.batch([{ sql: 'DELETE FROM backup_object_chunks WHERE storage_key=?', values: [key] },{ sql: 'DELETE FROM backup_objects WHERE storage_key=?', values: [key] }])
    },
  }
}
