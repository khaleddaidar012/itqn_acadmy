import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { schema } from './schema'
import { staffRules } from './staff-rules'
import { excuseSchema } from './excuse-schema'
import { paymentSchema } from '@/lib/payments/schema'
import { servicesSchema } from './services-schema'
import { subscriptionsSchema } from './subscriptions-schema'
import { zoomSchema } from '@/lib/zoom/schema'
import { zoomMeetingsSchema } from '@/lib/zoom/meetings-schema'
import { zoomEndSchema } from '@/lib/zoom/end-schema'
import { zoomStudentSchema } from '@/lib/zoom/student-schema'
import { backupStorageSchema } from './backup-storage-schema'
export type User = { id: number; name: string; email: string; role: 'admin' | 'teacher' | 'student' | 'parent'; manage: number; can_teach?: number; rate: number; currency: string; subjects: string; parent_id: number | null; pages: number; permissions?: string | null; disabled?: number; payment_confirmed?: number; enrollment_status?: 'pending' | 'active' }
type Value = string | number | null
type Row = Record<string, Value>
export type Query = { sql: string; values: Value[] }
type Result = { lastInsertRowid: number | bigint }
type LocalDatabase = import('node:sqlite').DatabaseSync
type D1Statement = { bind(...values: Value[]): D1Statement; first(): Promise<Row | null>; all(): Promise<{ results: Row[] }>; run(): Promise<{ meta: { last_row_id: number } }> }
type D1Database = { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> }
let local: Promise<LocalDatabase> | undefined
async function connection(): Promise<LocalDatabase | D1Database> {
  if (process.env.ITQAN_USE_D1 === '1') {
    const { env } = await getCloudflareContext({ async: true })
    const binding = (env as unknown as { DB?: D1Database }).DB
    if (!binding) throw new Error('D1 binding DB is not configured')
    return binding
  }
  if (!local) local = (async () => {
    const sqliteModule = 'node:sqlite'
    const { DatabaseSync } = await import(/* webpackIgnore: true */ sqliteModule) as typeof import('node:sqlite')
    const { mkdirSync } = await import('node:fs'); const { join } = await import('node:path')
    const directory = process.env.ITQAN_DATA_DIR || join(process.cwd(), '.data')
    mkdirSync(directory, { recursive: true })
    const database = new DatabaseSync(join(directory, 'itqan.sqlite'), { timeout: 5000 })
    database.exec('PRAGMA journal_mode=WAL; ' + schema)
    const columns = new Set(database.prepare('PRAGMA table_info(users)').all().map(c => c.name))
    if (!columns.has('permissions')) database.exec('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL')
    if (!columns.has('disabled')) database.exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0')
    if (!columns.has('enrollment_status')) database.exec("ALTER TABLE users ADD COLUMN enrollment_status TEXT NOT NULL DEFAULT 'active' CHECK(enrollment_status IN ('pending','active'))")
    if (!columns.has('can_teach')) {
      database.exec("ALTER TABLE users ADD COLUMN can_teach INTEGER NOT NULL DEFAULT 1 CHECK(can_teach IN (0,1)); UPDATE users SET can_teach=0 WHERE role='teacher' AND manage=1 AND rate=0 AND id NOT IN (SELECT teacher_id FROM lessons)")
    }
    database.exec(staffRules + excuseSchema + paymentSchema + servicesSchema + subscriptionsSchema + zoomSchema + zoomMeetingsSchema + zoomEndSchema + zoomStudentSchema + backupStorageSchema)
    return database
  })()
  return local
}
const isD1 = (database: LocalDatabase | D1Database): database is D1Database => 'batch' in database
export function db() {
  return {
    async snapshot(tables: readonly string[]): Promise<Record<string, Row[]>> {
      if (tables.some(t => !/^[a-z_]+$/.test(t))) throw new Error('Invalid table')
      const database = await connection()
      if (isD1(database)) {
        const results = await database.batch(tables.map(t => database.prepare(`SELECT * FROM ${t}`))) as { results: Row[] }[]
        return Object.fromEntries(tables.map((t, i) => [t, results[i].results]))
      }
      database.exec('BEGIN')
      try { const result = Object.fromEntries(tables.map(t => [t, database.prepare(`SELECT * FROM ${t}`).all() as Row[]])); database.exec('COMMIT'); return result }
      catch (error) { database.exec('ROLLBACK'); throw error }
    },
    prepare(sql: string) {
      return {
        async get(...values: Value[]): Promise<Row | undefined> {
          const database = await connection()
          if (isD1(database)) return await database.prepare(sql).bind(...values).first() || undefined
          return database.prepare(sql).get(...values) as Row | undefined
        },
        async all(...values: Value[]): Promise<Row[]> {
          const database = await connection()
          if (isD1(database)) return (await database.prepare(sql).bind(...values).all()).results
          return database.prepare(sql).all(...values) as Row[]
        },
        async run(...values: Value[]): Promise<Result> {
          const database = await connection()
          if (isD1(database)) return { lastInsertRowid: (await database.prepare(sql).bind(...values).run()).meta.last_row_id }
          return database.prepare(sql).run(...values)
        },
      }
    },
    async batch(queries: Query[]) {
      const database = await connection()
      if (isD1(database)) return database.batch(queries.map(q => database.prepare(q.sql).bind(...q.values)))
      database.exec('BEGIN IMMEDIATE')
      try {
        const results = queries.map(q => database.prepare(q.sql).run(...q.values))
        database.exec('COMMIT'); return results
      } catch (error) { database.exec('ROLLBACK'); throw error }
    },
  }
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export async function bootstrapAdmin() {
  const email = process.env.ITQAN_ADMIN_EMAIL?.trim().toLowerCase(); const password = process.env.ITQAN_ADMIN_PASSWORD
  if (!email || !password || password.length < 12) return
  if (await db().prepare("SELECT id FROM users WHERE role='admin'").get()) return
  await db().prepare("INSERT INTO users(name,email,password,role,manage) SELECT ?,?,?,'admin',1 WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin')").run(process.env.ITQAN_ADMIN_NAME || 'مدير الأكاديمية', email, hashPassword(password))
}
export const safeUser = async (id: number) => await db().prepare('SELECT id,name,email,role,manage,can_teach,rate,currency,subjects,parent_id,pages,permissions,disabled,enrollment_status FROM users WHERE id=?').get(id) as User | undefined
export async function rateLimit(key: string) {
  const now = Date.now()
  await db().prepare('DELETE FROM attempts WHERE expires < ?').run(now)
  const row = await db().prepare('INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(key, now + 15 * 60 * 1000)
  return Number(row?.count) <= 20
}
