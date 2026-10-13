import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { accounting } from '../src/lib/system/accounting.ts'

const dir = mkdtempSync(join(tmpdir(), 'itqan-test-'))
const origin = 'http://localhost:3107'
const password = 'test-only-password-12345'
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3107'], {
  env: { ...process.env, ITQAN_DATA_DIR: dir, ITQAN_ADMIN_EMAIL: 'admin@test.example', ITQAN_ADMIN_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
server.stdout.on('data', b => { output = (output + b).slice(-4000) })
server.stderr.on('data', b => { output = (output + b).slice(-4000) })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function request(body, cookie = '', expected = 200) {
  const response = await fetch(origin + '/api/system', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  assert.equal(response.status, expected, JSON.stringify(data))
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
}
try {
  for (let i = 0; i < 90; i++) {
    try { await fetch(origin); break } catch { if (i === 89) throw new Error(output); await pause(1000) }
  }
  await request(null, '', 401)
  const admin = await request({ action: 'login', email: 'admin@test.example', password })
  const student = await request({ action: 'register', name: 'طالب اختبار', email: 'student@test.example', password, subjects: ['حفظ القرآن'], role: 'admin' })
  assert.equal(student.data.user.role, 'student', 'Public registration cannot choose an elevated role')
  await request({ action: 'createUser', name: 'معلم', email: 'teacher@test.example', password, role: 'teacher', rate: 120, currency: 'EGP', manage: false }, student.cookie, 403)
  await request({ action: 'createUser', name: 'معلم', email: 'teacher@test.example', password, role: 'teacher', rate: 120, currency: 'EGP', manage: false }, admin.cookie)
  await request({ action: 'createUser', name: 'ولي أمر', email: 'parent@test.example', password, role: 'parent', rate: 0, currency: 'EGP' }, admin.cookie)
  await request({ action: 'createUser', name: 'معلم آخر', email: 'teacher2@test.example', password, role: 'teacher', rate: 50, currency: 'USD' }, admin.cookie)
  const teacher = await request({ action: 'login', email: 'teacher@test.example', password })
  const parent = await request({ action: 'login', email: 'parent@test.example', password })
  const teacher2 = await request({ action: 'login', email: 'teacher2@test.example', password })
  const another = await request({ action: 'register', name: 'طالب آخر', email: 'other@test.example', password, subjects: ['حفظ القرآن'] })
  await request({ action: 'linkParent', student_id: student.data.user.id, parent_id: parent.data.user.id }, admin.cookie)
  const start = new Date(Date.now() + 48 * 3600000).toISOString()
  const schedule = { action: 'schedule', teacher_id: teacher.data.user.id, student_id: student.data.user.id, subject: 'حفظ القرآن', start, duration: 60 }
  await request(schedule, teacher.cookie, 403)
  await request(schedule, admin.cookie)
  await request(schedule, admin.cookie, 400)
  const adminData = (await request(null, admin.cookie)).data
  const id = adminData.lessons[0].id
  assert.equal((await request(null, another.cookie)).data.lessons.length, 0)
  assert.equal((await request(null, parent.cookie)).data.lessons.length, 1)
  assert.equal((await request(null, student.cookie)).data.lessons[0].rate, undefined)
  assert.equal((await request(null, teacher.cookie)).data.users.some(u => u.id === student.data.user.id), true)
  await request({ action: 'join', id }, student.cookie, 403)
  await request({ action: 'join', id }, teacher2.cookie, 403)
  await request({ action: 'join', id }, teacher.cookie, 400)
  await request({ action: 'cancel', id }, student.cookie)
  assert.equal((await request(null, admin.cookie)).data.lessons[0].status, 'cancelled')
  await request(schedule, admin.cookie)
  const beforeBulk = (await request(null, admin.cookie)).data.lessons.length
  await request({ ...schedule, starts: [new Date(Date.now() + 7 * 86400000).toISOString(), start] }, admin.cookie, 400)
  assert.equal((await request(null, admin.cookie)).data.lessons.length, beforeBulk, 'Bulk scheduling rolls back on conflict')
  const liveId = (await request(null, admin.cookie)).data.lessons.find(l => l.status === 'scheduled').id
  const database = new DatabaseSync(join(dir, 'itqan.sqlite'))
  database.prepare('UPDATE lessons SET start=? WHERE id=?').run(new Date(Date.now() - 10 * 60000).toISOString(), liveId)
  await request({ action: 'join', id: liveId }, teacher.cookie)
  await request({ action: 'attendance', id: liveId, status: 'attended' }, teacher.cookie)
  await request({ action: 'progress', id: liveId, pages: 60, note: 'مراجعة الصفحات المتقنة' }, teacher.cookie)
  assert.equal((await request(null, parent.cookie)).data.users[0].pages, 60)
  await request({ action: 'updateTeacher', id: teacher.data.user.id, rate: 200, currency: 'USD', manage: true }, admin.cookie)
  assert.equal((await request(null, admin.cookie)).data.lessons.find(l => l.id === liveId).rate, 120)
  await request({ ...schedule, teacher_id: teacher2.data.user.id, student_id: another.data.user.id, start: new Date(Date.now() + 9 * 86400000).toISOString() }, admin.cookie)
  assert.equal((await request(null, teacher.cookie)).data.lessons.find(l => l.teacher_id === teacher2.data.user.id).rate, undefined, 'Scheduling managers cannot see other teachers pay')
  const secondSession = await request({ action: 'login', email: 'teacher@test.example', password })
  await request({ action: 'changePassword', oldPassword: 'wrong', password: 'new-test-password-123' }, teacher.cookie, 400)
  await request({ action: 'changePassword', oldPassword: password, password: 'new-test-password-123' }, teacher.cookie)
  await request(null, secondSession.cookie, 401)
  await request({ action: 'logout' }, teacher.cookie)
  await request(null, teacher.cookie, 401)
  database.close()
  const base = { duration: 60, start: '2026-10-01T10:00:00Z', joined: '2026-10-01T10:10:00Z', left_at: null, rate: 120, status: 'attended' }
  const full = accounting(base, Date.parse('2026-10-01T11:30:00Z'))
  assert.equal(full.minutes, 50); assert.equal(full.earned, 100); assert.equal(full.lateDeduction, 20)
  const half = accounting({ ...base, duration: 30 }, Date.parse('2026-10-01T11:30:00Z'))
  assert.equal(half.minutes, 20); assert.equal(half.earned, 40); assert.equal(half.lateDeduction, 20)
  assert.equal(accounting({ ...base, left_at: '2026-10-01T10:20:00Z' }, Date.parse('2026-10-01T11:30:00Z')).earned, 20)
  console.log('PASS: roles, privacy, parent linking, schedule conflicts and rollback, attendance, progress, cancellation, pay snapshots, password/session invalidation, logout, and minute accounting')
} catch (error) { console.error(output); throw error }
finally {
  server.kill()
  await new Promise(resolve => server.once('exit', resolve))
  rmSync(dir, { recursive: true, force: true })
}
