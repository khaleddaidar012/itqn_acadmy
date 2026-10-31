import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { accounting } from '../src/lib/system/accounting.ts'

const dir = mkdtempSync(join(tmpdir(), 'itqan-test-'))
const origin = 'http://localhost:3107'
const password = 'test-only-password-12345'
const toolEnv = { ...process.env, PAYMOB_USD_ENABLED: '0', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', XDG_CONFIG_HOME: join(dir, 'config'), WRANGLER_REGISTRY_PATH: join(dir, 'registry'), WRANGLER_LOG_PATH: join(dir, 'logs') }
const worker = process.argv.includes('--worker')
const d1 = worker || process.argv.includes('--d1')
if (d1) {
  const migration = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'itqan-academy', '--local', '--persist-to', dir], { env: { ...toolEnv, CI: 'true' }, input: 'y\n', timeout: 60000, encoding: 'utf8' })
  if (migration.status !== 0) { rmSync(dir, { recursive: true, force: true }); throw new Error(migration.stdout + migration.stderr) }
}
const serverArgs = worker
  ? ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', '3107', '--persist-to', dir, '--var', 'ITQAN_ADMIN_EMAIL:admin@test.example', '--var', `ITQAN_ADMIN_PASSWORD:${password}`]
  : ['node_modules/next/dist/bin/next', 'dev', '-p', '3107']
const server = spawn(process.execPath, serverArgs, {
  env: { ...toolEnv, ITQAN_USE_D1: d1 ? '1' : '0', ITQAN_D1_PERSIST_PATH: join(dir, 'v3'), ITQAN_DATA_DIR: dir, ITQAN_ADMIN_EMAIL: 'admin@test.example', ITQAN_ADMIN_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'],
})
const exited = new Promise(resolve => server.once('exit', resolve))
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
    if (server.exitCode !== null) throw new Error(output)
    try { await fetch(origin); break } catch { if (i === 89) throw new Error(output); await pause(1000) }
  }
  await request(null, '', 401)
  const admin = await request({ action: 'login', email: 'admin@test.example', password })
  const student = await request({ action: 'register', whatsapp: '+201012345678', name: 'طالب اختبار', email: 'student@test.example', password, subjects: ['حفظ القرآن'], role: 'admin' })
  assert.equal(student.data.user.enrollment_status, 'pending');
  assert.equal((await request(null, student.cookie)).data.lessons.length, 0);
  assert.equal(student.data.user.role, 'student', 'Public registration cannot choose an elevated role')
  await request({ action: 'createUser', name: 'معلم', email: 'teacher@test.example', password, role: 'teacher', rate: 120, currency: 'EGP', manage: false }, student.cookie, 403)
  await request({ action: 'createUser', name: 'معلم', email: 'teacher@test.example', password, role: 'teacher', rate: 120, currency: 'EGP', manage: false }, admin.cookie)
  await request({ action: 'createUser', name: 'ولي أمر', email: 'parent@test.example', password, role: 'parent', rate: 0, currency: 'EGP' }, admin.cookie)
  await request({ action: 'createUser', name: 'معلم آخر', email: 'teacher2@test.example', password, role: 'teacher', rate: 50, currency: 'USD' }, admin.cookie)
  const teacher = await request({ action: 'login', email: 'teacher@test.example', password })
  const parent = await request({ action: 'login', email: 'parent@test.example', password })
  const teacher2 = await request({ action: 'login', email: 'teacher2@test.example', password })
  const another = await request({ action: 'register', whatsapp: '+201012345678', name: 'طالب آخر', email: 'other@test.example', password, subjects: ['حفظ القرآن'] })
  await request({ action: 'linkParent', student_id: student.data.user.id, parent_id: parent.data.user.id }, admin.cookie)
  const start = new Date(Date.now() + 48 * 3600000).toISOString()
  const schedule = { action: 'schedule', teacher_id: teacher.data.user.id, student_id: student.data.user.id, subject: 'حفظ القرآن', start, duration: 60 }
  await request(schedule, teacher.cookie, 403)
  await request(schedule, admin.cookie, 400)
  await request({ action: 'approveStudent', id: student.data.user.id }, student.cookie, 403)
  await request({ action: 'approveStudent', id: student.data.user.id }, admin.cookie)
  await request({ action: 'approveStudent', id: another.data.user.id }, admin.cookie)
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
  // Teaching eligibility and teacher excuses require explicit authorized decisions.
  await request({ action:'createUser', name:'إداري فقط', email:'adminstaff@test.example', password, role:'teacher', accountType:'manager', rate:0, currency:'EGP', permissions:['schedule_manage'] }, admin.cookie)
  const administrator = await request({action:'login',email:'adminstaff@test.example',password})
  assert.equal(administrator.data.user.can_teach, 0)
  await request({...schedule,teacher_id:administrator.data.user.id,start:new Date(Date.now()+20*86400000).toISOString()},admin.cookie,400)
  const excuseStart = new Date(Date.now()+21*86400000).toISOString()
  await request({...schedule,start:excuseStart,duration:5},admin.cookie)
  const excuseLesson = (await request(null,admin.cookie)).data.lessons.find(l=>l.start===excuseStart)
  await request({action:'requestExcuse',id:excuseLesson.id,comment:'ظرف طارئ'},teacher2.cookie,403)
  await request({action:'requestExcuse',id:excuseLesson.id,comment:''},teacher.cookie,400)
  await request({action:'requestExcuse',id:excuseLesson.id,comment:'ظرف طارئ'},teacher.cookie)
  let excuse = (await request(null,admin.cookie)).data.excuses.find(e=>e.lesson_id===excuseLesson.id)
  assert.equal((await request(null,student.cookie)).data.excuses.length,0)
  await request({action:'reviewExcuse',id:excuse.id,status:'accepted'},teacher.cookie,403)
  await request({action:'reviewExcuse',id:excuse.id,status:'rejected'},administrator.cookie)
  assert.equal((await request(null,admin.cookie)).data.lessons.find(l=>l.id===excuseLesson.id).status,'scheduled')
  await request({action:'requestExcuse',id:excuseLesson.id,comment:'طلب جديد'},teacher.cookie)
  excuse = (await request(null,admin.cookie)).data.excuses.find(e=>e.lesson_id===excuseLesson.id&&e.status==='pending')
  await request({action:'reviewExcuse',id:excuse.id,status:'accepted'},administrator.cookie)
  await request({action:'reviewExcuse',id:excuse.id,status:'rejected'},admin.cookie,400)
  assert.equal((await request(null,admin.cookie)).data.lessons.find(l=>l.id===excuseLesson.id).status,'postponed')
  await request({...schedule,teacher_id:teacher2.data.user.id,student_id:another.data.user.id,start:excuseStart,duration:5},admin.cookie)
  await request({action:'assignExcuse',id:excuse.id,teacher_id:teacher2.data.user.id},admin.cookie,400)
  assert.equal((await request(null,admin.cookie)).data.excuses.find(e=>e.id===excuse.id).status,'accepted')
  await request({action:'assignExcuse',id:excuse.id,teacher_id:teacher2.data.user.id,start:new Date(Date.parse(excuseStart)+3600000).toISOString()},administrator.cookie)
  assert.equal((await request(null,admin.cookie)).data.excuses.find(e=>e.id===excuse.id).status,'assigned')
  await request({action:'assignExcuse',id:excuse.id,teacher_id:teacher2.data.user.id},admin.cookie,400)
  const liveId = (await request(null, admin.cookie)).data.lessons.find(l => l.status === 'scheduled' && l.start === start).id
  const sqliteFile = d1 ? readdirSync(dir, { recursive: true }).find(f => String(f).endsWith('.sqlite') && !String(f).endsWith('metadata.sqlite')) : 'itqan.sqlite'
  assert.ok(sqliteFile, 'Test database exists')
  const database = new DatabaseSync(join(dir, String(sqliteFile)))
  // New manual flow: server-side ownership/time/link gates, no OAuth requirement,
  // atomic completion+homework and no unearned compensation in reports.
  const manualStart = new Date(Date.now()+16*86400000).toISOString()
  await request({...schedule,teacher_id:teacher2.data.user.id,student_id:another.data.user.id,start:manualStart,duration:30},admin.cookie)
  const manualId=(await request(null,admin.cookie)).data.lessons.find(l=>l.start===manualStart).id
  const manual = async (body,cookie,expected=200,from=origin) => {
    const r=await fetch(origin+'/api/lessons',{method:'POST',headers:{Cookie:cookie,Origin:from,'Content-Type':'application/json'},body:JSON.stringify({id:manualId,...body})})
    const result=await r.json();assert.equal(r.status,expected,JSON.stringify(result));return result
  }
  await manual({action:'prepare'},teacher2.cookie,400)
  await manual({action:'prepare'},teacher.cookie,403)
  await manual({action:'prepare'},another.cookie,403)
  await manual({action:'prepare'},teacher2.cookie,403,'https://foreign.test')
  database.prepare('UPDATE lessons SET start=? WHERE id=?').run(new Date(Date.now()+60000).toISOString(),manualId)
  await manual({action:'launch'},another.cookie,409)
  await manual({action:'saveLink',url:'https://zoom.us/j/12345678901'},teacher2.cookie,400)
  assert.equal((await manual({action:'prepare'},teacher2.cookie)).url,'https://zoom.us/start/videomeeting')
  await manual({action:'saveLink',url:'https://evil.test/j/12345678901'},teacher2.cookie,400)
  await manual({action:'saveLink',url:'https://zoom.us/s/12345678901?zak=private'},teacher2.cookie,400)
  const joinUrl='https://zoom.us/j/12345678901?pwd=fixture'
  await manual({action:'saveLink',url:joinUrl},teacher2.cookie)
  assert.equal((await manual({action:'launch'},another.cookie)).url,joinUrl)
  await manual({action:'launch'},student.cookie,403)
  let publicLesson=(await request(null,another.cookie)).data.lessons.find(l=>l.id===manualId)
  assert.equal(publicLesson.meeting_ready,true);assert.equal(publicLesson.meeting_link,undefined)
  assert.notEqual(publicLesson.status,'attended','Clicking a link is not Zoom attendance')
  const completion={action:'completeLesson',id:manualId,status:'attended',pages:80,note:'Documented progress',homework:'Student homework'}
  await request(completion,teacher2.cookie,400)
  database.prepare('UPDATE lessons SET start=?,joined=? WHERE id=?').run(new Date(Date.now()-40*60000).toISOString(),new Date(Date.now()-40*60000).toISOString(),manualId)
  assert.equal((await request(null,teacher2.cookie)).data.lessons.find(l=>l.id===manualId).earned,0)
  await request({...completion,homework:''},teacher2.cookie,400)
  await request({...completion,note:''},teacher2.cookie,400)
  await request(completion,another.cookie,403)
  await request(completion,teacher.cookie,403)
  // Crossing the scheduled end neither blocks rejoining nor credits pay.
  await manual({action:'launch'},another.cookie)
  const completions=await Promise.all([1,2].map(async()=>{
    const r=await fetch(origin+'/api/system',{method:'POST',headers:{Cookie:teacher2.cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(completion)});return r.status
  }))
  assert.ok(completions.includes(200));assert.ok(completions.every(s=>s===200||s===400))
  assert.equal(database.prepare('SELECT COUNT(*) n FROM progress WHERE lesson_id=?').get(manualId).n,1)
  const credited=(await request(null,teacher2.cookie)).data.lessons.find(l=>l.id===manualId)
  assert.equal(credited.minutes,30);assert.equal(credited.earned,25)
  publicLesson=(await request(null,another.cookie)).data.lessons.find(l=>l.id===manualId)
  assert.equal(publicLesson.homework,'Student homework');assert.equal(publicLesson.completion_note,'Documented progress')
  await manual({action:'launch'},another.cookie,400)
  await request(completion,teacher2.cookie,400)
  assert.equal((await request(null,teacher2.cookie)).data.users.find(u=>u.id===another.data.user.id).whatsapp,undefined)
  assert.equal((await request(null,admin.cookie)).data.users.find(u=>u.id===another.data.user.id).whatsapp,'+201012345678')
  // Read-only payment visibility and live/test indicators on real database adapters.
  const paymentApi = async (cookie, suffix='') => { const response=await fetch(origin+'/api/payments'+suffix,{headers:{Cookie:cookie}}); assert.equal(response.status,200); return response.json() }
  assert.equal((await paymentApi('')).authenticated,false)
  database.prepare("INSERT INTO payment_orders(id,student_id,request_key,plan_id,plan_name,amount,currency,country,mode,integration_ids,status,created,updated) VALUES(?,?,?,?,?,6400,'USD','US',?,'[123]','paid',?,?)").run('test-payment',student.data.user.id,'test-request','intl-half-2','Test package','test',start,start)
  assert.equal((await paymentApi(student.cookie)).orders.length,1)
  assert.equal((await paymentApi(another.cookie,'?order=test-payment')).orders.length,0)
  assert.equal((await paymentApi(teacher2.cookie)).orders.length,0)
  assert.equal((await request(null,admin.cookie)).data.users.find(u=>u.id===student.data.user.id).payment_confirmed,0)
  database.prepare("INSERT INTO payment_orders(id,student_id,request_key,plan_id,plan_name,amount,currency,country,mode,integration_ids,status,created,updated) VALUES(?,?,?,?,?,6400,'USD','US',?,'[123]','paid',?,?)").run('live-payment',student.data.user.id,'live-request','intl-half-2','Live fixture','live',start,start)
  assert.equal((await request(null,admin.cookie)).data.users.find(u=>u.id===student.data.user.id).payment_confirmed,1)
  assert.equal((await paymentApi(admin.cookie)).orders.length,2)
  database.prepare('UPDATE lessons SET workflow_version=0,start=? WHERE id=?').run(new Date(Date.now() - 10 * 60000).toISOString(), liveId)
  await request({ action: 'join', id: liveId }, teacher.cookie)
  await request({ action: 'attendance', id: liveId, status: 'attended' }, teacher.cookie)
  await request({ action: 'progress', id: liveId, pages: 60, note: 'مراجعة الصفحات المتقنة' }, teacher.cookie)
  assert.equal((await request(null, parent.cookie)).data.users[0].pages, 60)
  await request({ action: 'updateTeacher', id: teacher.data.user.id, rate: 200, currency: 'USD', manage: true }, admin.cookie)
  assert.equal((await request(null, admin.cookie)).data.lessons.find(l => l.id === liveId).rate, 120)
  await request({ ...schedule, teacher_id: teacher2.data.user.id, student_id: another.data.user.id, start: new Date(Date.now() + 9 * 86400000).toISOString() }, admin.cookie)
  assert.equal((await request(null, teacher.cookie)).data.lessons.find(l => l.teacher_id === teacher2.data.user.id).rate, undefined, 'Scheduling managers cannot see other teachers pay')
  const concurrentStart = new Date(Date.now() + 12 * 86400000).toISOString()
  const concurrent = { ...schedule, teacher_id: teacher2.data.user.id, student_id: another.data.user.id, start: concurrentStart }
  const concurrentResults = await Promise.all([1, 2].map(async () => (await fetch(origin + '/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: admin.cookie }, body: JSON.stringify(concurrent) })).status))
  assert.deepEqual(concurrentResults.sort(), [200, 400], 'Concurrent overlapping inserts are serialized by the database constraint')
  const concurrentLesson = (await request(null, admin.cookie)).data.lessons.find(l => l.start === concurrentStart)
  const replacementStart = new Date(Date.now() + 13 * 86400000).toISOString()
  await request({ action: 'postpone', id: concurrentLesson.id, start: replacementStart }, admin.cookie)
  const postponed = (await request(null, admin.cookie)).data.lessons.find(l => l.id === concurrentLesson.id)
  assert.equal(postponed.status, 'postponed'); assert.ok(postponed.replaced_by)
  // Independent capabilities: delegation cannot grant itself permissions or leak pay/hours.
  await request({ action: 'createUser', name: 'مسؤول محدود', email: 'limited@test.example', password, role: 'teacher', rate: 0, currency: 'EGP', permissions: ['staff_create'] }, admin.cookie)
  const limited = await request({ action: 'login', email: 'limited@test.example', password })
  await request({ action: 'createUser', name: 'معلم جديد', email: 'newteacher@test.example', password, role: 'teacher', rate: 0, currency: 'EGP' }, limited.cookie)
  await request({ action: 'createUser', name: 'غير مسموح', email: 'escalated@test.example', password, role: 'teacher', rate: 0, currency: 'EGP', manage: true }, limited.cookie, 403)
  await request(schedule, limited.cookie, 403)
  const newcomer = await request({ action: 'login', email: 'newteacher@test.example', password })
  await request({ action: 'updateTeacher', id: newcomer.data.user.id, name: 'تعديل مرفوض' }, limited.cookie, 403)
  await request({ action: 'updateTeacher', id: limited.data.user.id, permissions: ['staff_edit'] }, admin.cookie)
  await request({ action: 'updateTeacher', id: newcomer.data.user.id, name: 'المعلم المعدل', email: 'newteacher@test.example' }, limited.cookie)
  await request({ action: 'updateTeacher', id: newcomer.data.user.id, rate: 50 }, limited.cookie, 403)
  await request({ action: 'updateTeacher', id: newcomer.data.user.id, permissions: ['pay_view'] }, limited.cookie, 403)
  await request({ action: 'updateTeacher', id: limited.data.user.id, permissions: ['hours_view'] }, admin.cookie)
  const hoursOnly = (await request(null, limited.cookie)).data
  assert.equal(hoursOnly.staff.find(t => t.id === teacher2.data.user.id).rate, undefined)
  assert.ok(hoursOnly.reports.length > 0); assert.equal(hoursOnly.reports[0].earned, undefined)
  await request({ action: 'updateTeacher', id: limited.data.user.id, permissions: ['pay_view'] }, admin.cookie)
  const payOnly = (await request(null, limited.cookie)).data
  assert.equal(payOnly.staff.find(t => t.id === teacher2.data.user.id).rate, 50)
  assert.equal(payOnly.reports.length, 0)
  await request({ action: 'updateTeacher', id: limited.data.user.id, permissions: ['students_manage'] }, admin.cookie)
  await request({ action: 'createStudent', name: 'طالب مباشر', email: 'direct@test.example', password, subjects: ['التجويد'] }, limited.cookie)
  const direct = await request({ action: 'login', email: 'direct@test.example', password })
  assert.equal(direct.data.user.enrollment_status, 'active')
  const pending = await request({ action: 'register', whatsapp: '+201012345678', name: 'طالب ينتظر', email: 'pending@test.example', password, subjects: ['حفظ القرآن'] })
  await request({ action: 'approveStudent', id: pending.data.user.id }, limited.cookie)
  assert.equal((await request(null, pending.cookie)).data.user.enrollment_status, 'active')
  await request({ action: 'updateTeacher', id: limited.data.user.id, permissions: ['staff_delete'] }, admin.cookie)
  await request({ ...schedule, teacher_id: newcomer.data.user.id, start: new Date(Date.now() + 20 * 86400000).toISOString() }, admin.cookie)
  await request({ action: 'deleteTeacher', id: teacher.data.user.id }, limited.cookie, 403)
  await request({ action: 'deleteTeacher', id: newcomer.data.user.id }, limited.cookie)
  await request(null, newcomer.cookie, 401)
  await request({ action: 'login', email: 'newteacher@test.example', password }, '', 401)
  const afterDelete = (await request(null, admin.cookie)).data
  assert.equal(afterDelete.staff.some(t => t.id === newcomer.data.user.id), false)
  assert.equal(afterDelete.lessons.find(l => l.teacher_id === newcomer.data.user.id).status, 'cancelled')
  assert.throws(() => database.prepare('INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency) VALUES(?,?,?,?,?,?,?)').run(newcomer.data.user.id, student.data.user.id, 'حفظ القرآن', new Date(Date.now()+40*86400000).toISOString(), 30, 0, 'EGP'), /lesson_accounts_unavailable/)
  const waiting = await request({ action: 'register', whatsapp: '+201012345678', name: 'طالب غير مؤكد', email: 'waiting@test.example', password, subjects: ['حفظ القرآن'] })
  assert.throws(() => database.prepare('INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency) VALUES(?,?,?,?,?,?,?)').run(teacher2.data.user.id, waiting.data.user.id, 'حفظ القرآن', new Date(Date.now()+40*86400000).toISOString(), 30, 0, 'EGP'), /lesson_accounts_unavailable/)
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
  console.log(`PASS (${worker ? 'Workers + D1' : d1 ? 'D1 proxy' : 'SQLite'}): pending student approval and direct enrollment, staff CRUD and independent permissions, hidden prices/hours, roles, privacy, parent linking, schedule conflicts and concurrency, atomic rollback and postponement, attendance, progress, cancellation, pay snapshots, password/session invalidation, logout, and minute accounting`)
} catch (error) { console.error(output); throw error }
finally {
  if (process.platform === 'win32' && server.exitCode === null && server.signalCode === null) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000 })
  server.kill()
  await Promise.race([exited, pause(5000)])
  server.stdout.destroy(); server.stderr.destroy(); server.unref()
  assert.ok(dir.startsWith(join(tmpdir(), 'itqan-test-')), 'Cleanup only the created test directory')
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
}
