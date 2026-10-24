import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { verifyBackup } from '../src/lib/system/backup-core.ts'
import { restoreBackup } from '../scripts/restore-backup.mjs'

const directory = mkdtempSync(join(tmpdir(), 'itqan-subscriptions-'))
const origin = 'http://localhost:3109', password = 'subscriptions-test-password-123'
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3109'], {
  env: { ...process.env, ITQAN_USE_D1: '0', ITQAN_DATA_DIR: directory, ITQAN_ADMIN_EMAIL: 'admin@subscriptions.test', ITQAN_ADMIN_PASSWORD: password, ITQAN_ADMIN_NAME: 'مدير الاختبار' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''; server.stdout.on('data', value => { logs += value }); server.stderr.on('data', value => { logs += value })
async function request(route, cookie = '', body, expected = 200) {
  const response = await fetch(origin + route, { method: body ? 'POST' : 'GET', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  assert.equal(response.status, expected, `${route}: ${await response.clone().text()}`)
  return response
}
async function login(email) { return (await request('/api/system', '', { action: 'login', email, password })).headers.get('set-cookie').split(';')[0] }
try {
  let ready = false
  for (let i = 0; i < 120; i++) { if (logs.includes('Ready in')) { ready = true; break } if (server.exitCode !== null) throw Error(logs); await new Promise(r => setTimeout(r, 500)) }
  assert.ok(ready, logs)
  await request('/api/subscriptions', '', undefined, 401)
  const admin = await login('admin@subscriptions.test')
  for (const [name, email] of [['طالب أول', 'one@subscriptions.test'], ['طالب ثان', 'two@subscriptions.test']]) await request('/api/system', admin, { action: 'createStudent', name, email, password, subjects: ['حفظ القرآن'] })
  const initial = await (await request('/api/subscriptions', admin)).json()
  const student = initial.students.find(s => s.name === 'طالب أول').id
  const plan = initial.plans.find(p => p.id === 'eg-memo-30-4'); assert.ok(plan)
  const create = { action: 'create', request_key: randomUUID(), student_id: student, plan_id: plan.id, subject: 'حفظ القرآن', starts: '2026-10-01', ends: '2026-11-01', price: 1 }
  const first = await (await request('/api/subscriptions', admin, create)).json()
  assert.equal((await (await request('/api/subscriptions', admin, create)).json()).id, first.id)
  await request('/api/subscriptions', admin, { ...create, request_key: randomUUID() }, 409)
  await request('/api/subscriptions', admin, { ...create, request_key: randomUUID(), starts: '2026-11-01', ends: '2026-10-01' }, 400)
  const receipt = { action: 'receipt', subscription_id: first.id, request_key: randomUUID(), amount: '100', method: 'instapay', reference: 'test-transfer' }
  const saved = await (await request('/api/subscriptions', admin, receipt)).json()
  assert.equal((await (await request('/api/subscriptions', admin, receipt)).json()).id, saved.id)
  await request('/api/subscriptions', admin, { ...receipt, request_key: randomUUID(), amount: '100.001' }, 400)
  const price = Math.round(plan.price * 100)
  // The trigger rejects simultaneous receipts whose combined value exceeds the balance.
  const concurrent = await Promise.all([1, 2].map(() => fetch(origin + '/api/subscriptions', { method: 'POST', headers: { Origin: origin, Cookie: admin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...receipt, request_key: randomUUID(), amount: ((price - 10000) / 100).toFixed(2) }) })))
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409])
  const local = new DatabaseSync(join(directory, 'itqan.sqlite'))
  const teacher = local.prepare("INSERT INTO users(name,email,password,role) VALUES('Teacher','teacher@test.invalid','unused','teacher') RETURNING id").get().id
  for (const [i, status] of ['attended','late_cancelled','absent','cancelled','postponed','scheduled'].entries()) local.prepare("INSERT INTO lessons(teacher_id,student_id,subject,start,duration,status,rate,currency) VALUES(?,?,'حفظ القرآن',?,30,?,0,'EGP')").run(teacher, student, `2026-10-${String(i+10).padStart(2,'0')}T10:00:00.000Z`, status)
  let state = await (await request('/api/subscriptions', admin)).json()
  assert.equal(state.subscriptions[0].amount, price); assert.equal(state.subscriptions[0].paid, price)
  assert.equal(state.subscriptions[0].used, 2); assert.equal(state.subscriptions[0].absent, 1); assert.equal(state.subscriptions[0].scheduled, 1)
  local.prepare("UPDATE lessons SET status='cancelled' WHERE status='attended'").run()
  state = await (await request('/api/subscriptions', admin)).json(); assert.equal(state.subscriptions[0].used, 1)
  const one = await login('one@subscriptions.test'), two = await login('two@subscriptions.test')
  assert.equal((await (await request('/api/subscriptions', one)).json()).subscriptions.length, 1)
  assert.equal((await (await request('/api/subscriptions', two)).json()).subscriptions.length, 0)
  await request('/api/subscriptions', one, { ...create, request_key: randomUUID() }, 403)
  await request('/api/system', admin, { action: 'createUser', role: 'parent', name: 'ولي الأمر', email: 'parent@subscriptions.test', password, currency: 'EGP' })
  let system = await (await request('/api/system', admin)).json()
  const parentId = system.users.find(u => u.email === 'parent@subscriptions.test').id
  await request('/api/system', admin, { action: 'linkParent', student_id: student, parent_id: parentId })
  const parent = await login('parent@subscriptions.test')
  assert.equal((await (await request('/api/subscriptions', parent)).json()).subscriptions.length, 1)
  await request('/api/subscriptions', parent, { ...create, request_key: randomUUID() }, 403)
  await request('/api/system', admin, { action: 'createUser', role: 'teacher', name: 'موظف', email: 'staff@subscriptions.test', password, rate: 0, currency: 'EGP', subjects: ['حفظ القرآن'], permissions: ['schedule_manage'] })
  const staff = await login('staff@subscriptions.test')
  await request('/api/subscriptions', staff, undefined, 403)
  system = await (await request('/api/system', admin)).json()
  const staffId = system.staff.find(u => u.email === 'staff@subscriptions.test').id
  await request('/api/system', admin, { action: 'updateTeacher', id: staffId, permissions: ['subscriptions_manage'] })
  assert.equal((await (await request('/api/subscriptions', staff)).json()).manage, true)
  await request('/api/subscriptions', admin, { ...create, request_key: randomUUID(), plan_id: 'intl-half-3' }, 400)
  await request('/api/subscriptions', admin, { ...create, request_key: randomUUID(), plan_id: 'intl-half-promo-3mo', starts: '2026-11-01', ends: '2027-02-01' })
  state = await (await request('/api/subscriptions', admin)).json()
  assert.equal(state.subscriptions[0].total_sessions, 24); assert.equal(state.subscriptions[0].amount, 8400)
  await request('/api/backups', admin, { action: 'create' })
  const backup = await (await request('/api/backups?device=subscription-tests', admin)).json()
  const exported = await (await request('/api/backups?download=' + backup.latest.id, admin)).text()
  assert.equal(verifyBackup(exported).tables.student_subscriptions.length, 2)
  const file = join(directory, 'backup.json'); writeFileSync(file, exported)
  restoreBackup(file, join(directory, 'restored.sqlite'))
  const restored = new DatabaseSync(join(directory, 'restored.sqlite'))
  assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM subscription_receipts').get().n, 2); restored.close()
  // Exports made before subscriptions remain restorable.
  const envelope = JSON.parse(exported), payload = JSON.parse(envelope.payload)
  delete payload.tables.student_subscriptions; delete payload.tables.subscription_receipts
  envelope.payload = JSON.stringify(payload); envelope.sha256 = createHash('sha256').update(envelope.payload).digest('hex')
  assert.equal(verifyBackup(JSON.stringify(envelope)).tables.student_subscriptions.length, 0)
  local.close()
  console.log('PASS: pricing, renewals, idempotency, concurrency, balances, authorization, backups and restore')
} catch (error) { console.error(logs.slice(-4000)); throw error }
finally { server.kill(); await new Promise(resolve => server.once('exit', resolve)); rmSync(directory, { recursive: true, force: true }) }
