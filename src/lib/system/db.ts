import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'

export type User = { id: number; name: string; email: string; role: 'admin' | 'teacher' | 'student' | 'parent'; manage: number; rate: number; currency: string; subjects: string; parent_id: number | null; pages: number }
let database: DatabaseSync | undefined
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export function db() {
  if (database) return database
  const directory = process.env.ITQAN_DATA_DIR || join(process.cwd(), '.data')
  mkdirSync(directory, { recursive: true })
  database = new DatabaseSync(join(directory, 'itqan.sqlite'), { timeout: 5000 })
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','student','parent')), manage INTEGER NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'EGP', subjects TEXT NOT NULL DEFAULT '[]',
      parent_id INTEGER REFERENCES users(id), pages INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), student_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL, start TEXT NOT NULL, duration INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled',
      joined TEXT, left_at TEXT, rate REAL NOT NULL, currency TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
      replaced_by INTEGER REFERENCES lessons(id));
    CREATE TABLE IF NOT EXISTS progress (id INTEGER PRIMARY KEY, student_id INTEGER REFERENCES users(id), teacher_id INTEGER REFERENCES users(id), lesson_id INTEGER REFERENCES lessons(id), pages INTEGER NOT NULL, note TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS lessons_teacher_start ON lessons(teacher_id,start);
    CREATE INDEX IF NOT EXISTS lessons_student_start ON lessons(student_id,start);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);`)
  const email = process.env.ITQAN_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ITQAN_ADMIN_PASSWORD
  if (email && password && password.length >= 12 && !database.prepare("SELECT id FROM users WHERE role='admin'").get()) {
    database.prepare('INSERT INTO users(name,email,password,role,manage) VALUES(?,?,?,?,1)').run(process.env.ITQAN_ADMIN_NAME || 'مدير الأكاديمية', email, hashPassword(password), 'admin')
  }
  return database
}
export const safeUser = (id: number) => db().prepare('SELECT id,name,email,role,manage,rate,currency,subjects,parent_id,pages FROM users WHERE id=?').get(id) as User | undefined
export function rateLimit(key: string) {
  const now = Date.now()
  db().prepare('DELETE FROM attempts WHERE expires < ?').run(now)
  db().prepare('INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now + 15 * 60 * 1000)
  const row = db().prepare('SELECT count FROM attempts WHERE key=?').get(key) as { count: number }
  return row.count <= 20
}
