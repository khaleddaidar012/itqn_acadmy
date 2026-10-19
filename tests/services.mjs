import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { makeStudentReport, monthOf } from '../src/lib/system/student-report.ts'
import { backupDay, createBackup, verifyBackup, BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
import { restoreBackup } from '../scripts/restore-backup.mjs'

const now = '2026-10-18T12:00:00Z'
const reportLessons = [
  { id: 1, start: '2026-09-20T10:00:00Z', duration: 45, status: 'attended', subject: 'حفظ القرآن', teacher_name: 'محمد عبد الله' },
  { id: 2, start: '2026-10-08T10:00:00Z', duration: 30, status: 'attended', subject: 'حفظ القرآن', teacher_name: 'محمد عبد الله' },
  { id: 3, start: '2026-10-09T10:00:00Z', duration: 30, status: 'late_cancelled', subject: 'التجويد', teacher_name: 'محمد عبد الله' },
  { id: 4, start: '2026-10-19T10:00:00Z', duration: 60, status: 'attended', subject: 'حفظ القرآن', teacher_name: 'محمد عبد الله' },
]
const progress = [{ id: 1, pages: 35, created: '2026-09-30T20:59:00Z', note: 'أتم الطالب حفظ الجزء المقرر.' }, { id: 2, pages: 48, created: '2026-09-30T21:01:00Z', note: 'تحسن ملحوظ في أحكام التلاوة. نوصي بالمراجعة اليومية ومتابعة الحفظ مع ولي الأمر.' }, { id: 3, pages: 100, created: '2026-10-19T12:00:00Z', note: 'Future record excluded' }]
const report = makeStudentReport('أحمد محمد', '2026-10', reportLessons, progress, now)
assert.equal(report.previous.hours, .75); assert.equal(report.current.hours, .5)
assert.equal(report.previous.pages, 35); assert.equal(report.current.pages, 48)
assert.equal(report.lessons.length, 2); assert.equal(report.notes.length, 1)
assert.equal(monthOf('2026-09-30T21:01:00Z'), '2026-10')
assert.equal(makeStudentReport('Student', '2026-10', [], [], now).previous.pages, null)
assert.throws(() => makeStudentReport('Student', '2026-13', [], [], now))
assert.throws(() => makeStudentReport('Student', '2027-01', [], [], now))
assert.equal(backupDay(new Date('2026-10-18T02:59:00Z')).due, false)
assert.equal(backupDay(new Date('2026-10-18T03:00:00Z')).due, true)
assert.equal(backupDay(new Date('2026-12-18T03:59:00Z')).due, false)
assert.equal(backupDay(new Date('2026-12-18T04:00:00Z')).due, true)

const dir = mkdtempSync(join(tmpdir(), 'itqan-services-'))
const worker = process.argv.includes('--worker')
const origin = 'http://localhost:3108'
const password = 'service-test-password-123'
const env = { ...process.env, PAYMOB_USD_ENABLED: '0', ITQAN_USE_D1: worker ? '1' : '0', ITQAN_DATA_DIR: dir, ITQAN_ADMIN_EMAIL: 'admin@services.test', ITQAN_ADMIN_PASSWORD: password, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', XDG_CONFIG_HOME: join(dir, 'config'), WRANGLER_REGISTRY_PATH: join(dir, 'registry'), WRANGLER_LOG_PATH: join(dir, 'logs') }
if (worker) {
  const migrate = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'itqan-academy', '--local', '--persist-to', dir], { env: { ...env, CI: 'true' }, input: 'y\n', encoding: 'utf8', timeout: 60000 })
  if (migrate.status !== 0) throw new Error(migrate.stdout + migrate.stderr)
}
const args = worker ? ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', '3108', '--persist-to', dir, '--test-scheduled', '--var', 'ITQAN_ADMIN_EMAIL:admin@services.test', '--var', `ITQAN_ADMIN_PASSWORD:${password}`] : ['node_modules/next/dist/bin/next', 'dev', '-p', '3108']
const server = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''; server.stdout.on('data', b => { output = (output + b).slice(-7000) }); server.stderr.on('data', b => { output = (output + b).slice(-7000) })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function request(path, cookie = '', body, status = 200, extraHeaders = {}) {
  const r = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}) })
  assert.equal(r.status, status, `${path}: ${await (r.status === status ? Promise.resolve('') : r.clone().text())}`)
  return r
}
try {
  for (let i = 0; i < 100; i++) { if (server.exitCode !== null) throw new Error(output); try { await fetch(origin + '/api/system'); break } catch { await pause(1000) } }
  await request('/api/backups', '', undefined, 401); await request('/api/reports', '', undefined, 401)
  const admin = (await request('/api/system', '', { action: 'login', email: 'admin@services.test', password })).headers.get('set-cookie').split(';')[0]
  await request('/api/system', admin, { action: 'createStudent', name: 'أحمد محمد', email: 'student@services.test', password, subjects: ['حفظ القرآن'] })
  await request('/api/system', admin, { action: 'createUser', role: 'teacher', accountType: 'manager', name: 'مسؤول تقارير', email: 'staff@services.test', password, rate: 0, currency: 'EGP', permissions: [] })
  const studentLogin = await request('/api/system', '', { action: 'login', email: 'student@services.test', password }); const studentCookie = studentLogin.headers.get('set-cookie').split(';')[0]; const studentId = (await studentLogin.json()).user.id
  const staffLogin = await request('/api/system', '', { action: 'login', email: 'staff@services.test', password }); const staffCookie = staffLogin.headers.get('set-cookie').split(';')[0]; const staffId = (await staffLogin.json()).user.id
  await request('/api/backups', studentCookie, undefined, 403); await request('/api/reports', studentCookie, { student: studentId, month: '2026-10' }, 403)
  await request('/api/backups', staffCookie, undefined, 403)
  await request('/api/system', admin, { action: 'updateTeacher', id: staffId, permissions: ['reports_manage'] })
  const staffData = await (await request('/api/system', staffCookie)).json(); assert.ok(staffData.users.some(u => u.id === studentId)); assert.ok(staffData.users.every(u => u.rate === undefined))
  const month = monthOf(new Date().toISOString())
  const shared = await (await request('/api/reports', staffCookie, { student: studentId, month })).json()
  const pdf = await request(shared.url); assert.equal(pdf.headers.get('content-type'), 'application/pdf'); assert.equal(pdf.headers.get('cache-control'), 'private, no-store'); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF')
  await request('/api/reports', staffCookie, { student: studentId, month }, 403, { Origin: 'https://attacker.example' })
  await request('/api/reports', staffCookie, { action: 'revoke', id: shared.id }); await request(shared.url, '', undefined, 404)
  await request('/api/reports/shared/' + '0'.repeat(64), '', undefined, 404)
  const dbFile = worker ? readdirSync(dir, { recursive: true }).find(f => String(f).endsWith('.sqlite') && !String(f).endsWith('metadata.sqlite')) : 'itqan.sqlite'
  const local = new DatabaseSync(join(dir, String(dbFile)))
  const expired = await (await request('/api/reports', admin, { student: studentId, month })).json()
  local.prepare('UPDATE report_shares SET expires=? WHERE id=?').run('2000-01-01T00:00:00Z', expired.id); await request(expired.url, '', undefined, 404)
  // Restore must preserve related lessons/progress, including historical records.
  local.prepare('UPDATE users SET can_teach=1 WHERE id=?').run(staffId)
  const historicalLesson = local.prepare("INSERT INTO lessons(teacher_id,student_id,subject,start,duration,status,rate,currency) VALUES(?,?,'حفظ القرآن','2026-09-20T10:00:00Z',45,'attended',120,'EGP') RETURNING id").get(staffId, studentId)
  local.prepare("INSERT INTO progress(student_id,teacher_id,lesson_id,pages,note,created) VALUES(?,?,?,35,'توثيق سابق','2026-09-30T20:59:00Z')").run(studentId, staffId, historicalLesson.id)
  await request('/api/system', admin, { action: 'updateTeacher', id: staffId, permissions: ['backups_manage'] })
  await request('/api/reports', staffCookie, { student: studentId, month }, 403)
  await request('/api/backups', staffCookie, { action: 'create' })
  let status = await (await request('/api/backups?device=test-device-12345', staffCookie)).json(); assert.ok(status.latest)
  const json = await (await request('/api/backups?download=' + status.latest.id, staffCookie)).text(); const portable = verifyBackup(json)
  assert.equal(portable.tables.users.length, 3); assert.equal(portable.tables.sessions, undefined); assert.equal(portable.tables.attempts, undefined)
  assert.equal(portable.tables.lessons.length, 1); assert.equal(portable.tables.progress[0].pages, 35)
  assert.ok(portable.tables.report_shares.every(r => r.revoked === 1)); assert.throws(() => verifyBackup(json.replace('itqan-backup', 'other-backup')))
  const envelope = JSON.parse(json); envelope.payload += ' '; assert.throws(() => verifyBackup(JSON.stringify(envelope)))
  await request('/api/backups', staffCookie, { action: 'receipt', device: 'test-device-12345', id: status.latest.id, sha256: 'wrong' }, 400)
  await request('/api/backups', staffCookie, { action: 'receipt', device: 'test-device-12345', id: status.latest.id, sha256: status.latest.sha256 })
  status = await (await request('/api/backups?device=test-device-12345', staffCookie)).json(); assert.equal(status.receipt.backup_id, status.latest.id)
  const backupFile = join(dir, 'portable.json'); writeFileSync(backupFile, json)
  const target = join(dir, 'restored.sqlite'); const restored = restoreBackup(backupFile, target); assert.equal(restored.accounts, 3)
  const restoredDb = new DatabaseSync(target); assert.equal(restoredDb.prepare('SELECT count(*) n FROM sessions').get().n, 0); assert.equal(restoredDb.prepare('SELECT count(*) n FROM users').get().n, 3); assert.equal(restoredDb.prepare('SELECT count(*) n FROM lessons').get().n, 1); assert.equal(restoredDb.prepare('SELECT pages FROM progress').get().pages, 35); assert.equal(restoredDb.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); restoredDb.close()
  assert.throws(() => restoreBackup(backupFile, target), /already exists/)
  const adapter = { prepare(sql) { return { get: async (...v) => local.prepare(sql).get(...v), run: async (...v) => local.prepare(sql).run(...v), all: async (...v) => local.prepare(sql).all(...v) } }, snapshot: async tables => Object.fromEntries(tables.map(t => [t, local.prepare(`SELECT * FROM ${t}`).all()])) }
  let writes = 0; const storage = { put: async () => { writes++ }, get: async () => null }
  await request('/api/backups', staffCookie, { action: 'toggle', enabled: false })
  assert.equal(await createBackup(adapter, storage, true, new Date('2026-12-18T04:00:00Z')), null); assert.equal(writes, 0)
  await request('/api/backups', staffCookie, { action: 'toggle', enabled: true })
  assert.equal(await createBackup(adapter, storage, true, new Date('2026-12-18T03:59:00Z')), null)
  const results = await Promise.all([createBackup(adapter, storage, true, new Date('2026-12-18T04:00:00Z')), createBackup(adapter, storage, true, new Date('2026-12-18T04:00:00Z'))]); assert.equal(results.filter(Boolean).length, 1); assert.equal(writes, 1)
  const failedStorage = { put: async () => { throw new Error('disk full') }, get: async () => null }
  await assert.rejects(() => createBackup(adapter, failedStorage, true, new Date('2026-12-19T04:00:00Z')))
  assert.ok(await createBackup(adapter, storage, true, new Date('2026-12-19T04:01:00Z')))
  if (worker) { const scheduled = await fetch(origin + '/cdn-cgi/handler/scheduled'); assert.equal(scheduled.status, 200) }
  local.close()
  // Deterministic example for visual PDF QA; contains synthetic student data only.
  const { buildSync } = await import('esbuild'); const { createRequire } = await import('node:module'); const { mkdirSync } = await import('node:fs')
  const bundled = join(dir, 'report.cjs'); buildSync({ entryPoints: ['src/lib/system/report-pdf.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: bundled }); const { reportPdf } = createRequire(import.meta.url)(bundled)
  mkdirSync('output/pdf', { recursive: true }); writeFileSync('output/pdf/student-report-sample.pdf', reportPdf(report))
  console.log(`PASS services (${worker ? 'Worker + D1 + R2' : 'SQLite'}): Cairo history, 30/45-minute attendance, permission boundaries, CSRF, PDF, share revocation/expiry, backup checksum, complete restore, no sessions, per-device receipts, DST schedule, concurrency, disabled schedule, retry after storage failure`)
} catch (error) { console.error(output); throw error }
finally {
  if (process.platform === 'win32' && server.exitCode === null) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000 })
  server.kill(); server.stdout.destroy(); server.stderr.destroy(); server.unref()
  assert.ok(dir.startsWith(join(tmpdir(), 'itqan-services-')))
  rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 1000 })
}
