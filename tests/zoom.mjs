import assert from 'node:assert/strict'
import { randomBytes, createHmac } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { encryptTokens, decryptTokens, validWebhook, stateHash } from '../src/lib/zoom/security.ts'
import { BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
import { presenceIntervals, presenceMinutes } from '../src/lib/zoom/attendance.ts'
import { accounting } from '../src/lib/system/accounting.ts'
import { verifyBackup } from '../src/lib/system/backup-core.ts'
import { restoreBackup } from '../scripts/restore-backup.mjs'

const key = randomBytes(32).toString('base64'), credentials = { access_token: 'private-access', refresh_token: 'private-refresh' }
const presence=[{actor:'teacher',participant:'a',occurrence:'run',kind:'join',at_ms:60000,joined_ms:null},{actor:'teacher',participant:'b',occurrence:'run',kind:'join',at_ms:120000,joined_ms:null},{actor:'teacher',participant:'a',occurrence:'run',kind:'leave',at_ms:180000,joined_ms:null},{actor:'meeting',participant:'meeting',occurrence:'run',kind:'end',at_ms:240000,joined_ms:null}]
assert.equal(presenceMinutes(presenceIntervals(presence.reverse(),'teacher'),0,600000,600000),3)
assert.equal(accounting({start:new Date(0).toISOString(),duration:10,status:'scheduled',rate:60,joined:new Date(60000).toISOString(),left_at:null,zoom_intervals:presenceIntervals(presence,'teacher')},600000).earned,3)
const encrypted = encryptTokens(credentials, key, 10)
assert.deepEqual(decryptTokens(encrypted, key, 10), credentials)
assert.ok(!encrypted.includes(credentials.access_token))
assert.throws(() => decryptTokens(encrypted, key, 11))
assert.throws(() => decryptTokens(encrypted, randomBytes(32).toString('base64'), 10))
assert.throws(() => decryptTokens(encrypted.slice(0, -8), key, 10))
assert.ok(!BACKUP_TABLES.includes('zoom_connections')); assert.ok(!BACKUP_TABLES.includes('zoom_oauth_states'))
const secret = 'local-webhook-test', stamp = String(Math.floor(Date.now() / 1000)), raw = '{"event":"test"}'
const sign = (body, timestamp = stamp) => 'v0=' + createHmac('sha256', secret).update(`v0:${timestamp}:${body}`).digest('hex')
assert.ok(validWebhook(raw, stamp, sign(raw), secret))
assert.ok(!validWebhook(raw + ' ', stamp, sign(raw), secret))
assert.ok(!validWebhook(raw, stamp, sign(raw), 'wrong'))
assert.ok(!validWebhook(raw, stamp, sign(raw), secret, Date.now() + 301000))
assert.ok(!validWebhook(raw, stamp, 'malformed', secret))

const directory = mkdtempSync(join(tmpdir(), 'itqan-zoom-'))
const mock = join(directory, 'zoom-mock.cjs')
// A child-process-only transport replaces Zoom requests. No real account or external request is used.
writeFileSync(mock, `const original=globalThis.fetch;let created=0;const meetings=new Map();
globalThis.fetch=async (input,init={})=>{const url=String(input.url||input);
if(url==='https://zoom.us/oauth/token'){if(init.redirect!=='manual')throw new TypeError('Workers requires manual redirect handling');const body=new URLSearchParams(init.body);if(body.get('grant_type')==='refresh_token')return Response.json({access_token:'access-one',refresh_token:'refresh-one-next',expires_in:3600});if(body.get('code')==='fail')return Response.json({error:'invalid_grant'},{status:400});if(body.get('code')==='redirect')return new Response(null,{status:302,headers:{Location:'https://unexpected.invalid/'}});return Response.json({access_token:'access-'+body.get('code'),refresh_token:'refresh-'+body.get('code'),expires_in:3600})}
if(url==='https://api.zoom.us/v2/users/me/meetings'){if(init.redirect!=='manual')throw Error('Invalid Workers redirect');if(new Headers(init.headers).get('Authorization')!=='Bearer access-one')return Response.json({code:4711},{status:403});const body=JSON.parse(init.body);if(body.topic.endsWith('التجويد'))return Response.json({code:4711},{status:403});const id=9000000000+Number(body.agenda.split(' ').pop());if(meetings.has(id))throw Error('Duplicate creation');created++;const meeting={...body,id,host_id:'zoom-one',join_url:'https://zoom.us/j/'+id+'?pwd=test',start_url:'https://zoom.us/s/'+id+'?zak=host-secret'};meetings.set(id,meeting);if(body.topic.endsWith('اللغة العربية'))throw Error('Simulated lost response after creation');return Response.json(meeting,{status:201})}
if(url.startsWith('https://api.zoom.us/v2/meetings/')){const meeting=meetings.get(Number(url.split('/').pop()));return meeting?Response.json(meeting):Response.json({code:3001},{status:404})}
if(url==='https://api.zoom.us/v2/users/me'){const auth=new Headers(init.headers).get('Authorization');const id=auth.replace('Bearer access-','');return Response.json({id:'zoom-'+id,email:id+'@zoom.test',account_id:'account-'+id})}
if(url==='https://zoom.us/oauth/revoke')return Response.json({status:'success'});
return original(input,init)};`)
const origin = 'http://localhost:3110', password = 'zoom-test-password-123'
const server = spawn(process.execPath, ['--require', mock, 'node_modules/next/dist/bin/next', 'dev', '-p', '3110'], {
  env: { ...process.env, ITQAN_USE_D1: '0', ITQAN_DATA_DIR: directory, ITQAN_ADMIN_EMAIL: 'admin@zoom.test', ITQAN_ADMIN_PASSWORD: password, ZOOM_CLIENT_ID: 'mock-client', ZOOM_CLIENT_SECRET: 'mock-secret', ZOOM_TOKEN_ENCRYPTION_KEY: key, ZOOM_REDIRECT_URI: origin + '/api/zoom/callback', ZOOM_WEBHOOK_SECRET: secret }, stdio: ['ignore','pipe','pipe'],
})
let logs = ''; server.stdout.on('data', value => { logs += value }); server.stderr.on('data', value => { logs += value })
async function request(route, cookie = '', body, expected = 200, extraHeaders = {}) {
  const response = await fetch(origin + route, { redirect: 'manual', method: body ? 'POST' : 'GET', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...extraHeaders }, ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) })
  assert.equal(response.status, expected, route + ': ' + await response.clone().text())
  return response
}
async function login(email) { return (await request('/api/system', '', { action: 'login', email, password })).headers.get('set-cookie').split(';')[0] }
async function begin(cookie) { const result = await (await request('/api/zoom', cookie, { action: 'connect' })).json(); const url = new URL(result.url); assert.equal(url.origin, 'https://zoom.us'); assert.equal(url.searchParams.get('redirect_uri'), origin + '/api/zoom/callback'); return url.searchParams.get('state') }
async function webhook(body, expected = 200, valid = true) { const raw = JSON.stringify(body); return request('/api/zoom/webhook', '', raw, expected, { 'x-zm-request-timestamp': stamp, 'x-zm-signature': valid ? sign(raw) : 'v0=' + '0'.repeat(64) }) }
try {
  let ready = false
  for (let i=0; i<120; i++) { if(logs.includes('Ready in')) { ready=true; break } if(server.exitCode!==null)throw Error(logs); await new Promise(r=>setTimeout(r,500)) }
  assert.ok(ready, logs)
  await request('/api/zoom', '', undefined, 401)
  const admin = await login('admin@zoom.test')
  const adminStatus = await (await request('/api/zoom', admin)).json(); assert.equal(adminStatus.configured,true); assert.equal(adminStatus.canConnect,false)
  await request('/api/zoom', admin, {action:'connect'}, 403)
  for (const email of ['one@zoom.test','two@zoom.test']) await request('/api/system',admin,{action:'createUser',role:'teacher',name:email,email,password,rate:0,currency:'EGP'})
  await request('/api/system',admin,{action:'createStudent',name:'طالب',email:'student@zoom.test',password,subjects:['حفظ القرآن']})
  const student = await login('student@zoom.test'); await request('/api/zoom',student,undefined,403)
  const one = await login('one@zoom.test'), two = await login('two@zoom.test')
  await request('/api/zoom',one,{action:'connect'},403,{Origin:'https://attacker.invalid'})
  const state = await begin(one)
  await request('/api/zoom/callback?state='+state+'&code=one',two,undefined,400)
  let callback = await request('/api/zoom/callback?state='+state+'&code=one',one,undefined,303)
  assert.equal(callback.headers.get('location'),origin+'/ar/dashboard?zoom=connected')
  await request('/api/zoom/callback?state='+state+'&code=one',one,undefined,400)
  const first = await (await request('/api/zoom',one)).json(); assert.equal(first.connection.email,'one@zoom.test'); assert.ok(!JSON.stringify(first).includes('access_token')); assert.ok(!JSON.stringify(first).includes('encrypted_tokens'))
  assert.equal((await (await request('/api/zoom',two)).json()).connection,null)
  const local = new DatabaseSync(join(directory,'itqan.sqlite'))
  const teacherId=local.prepare("SELECT id FROM users WHERE email='one@zoom.test'").get().id
  const studentId=local.prepare("SELECT id FROM users WHERE email='student@zoom.test'").get().id
  const start=new Date(Date.now()-20*60000).toISOString()
  const lessonId=Number(local.prepare("INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency) VALUES(?,?,'حفظ القرآن',?,60,120,'EGP')").run(teacherId,studentId,start).lastInsertRowid)
  await request('/api/zoom/meeting',two,{action:'prepare',id:lessonId},403)
  await request('/api/zoom/meeting',student,{action:'prepare',id:lessonId},403)
  await request('/api/zoom/meeting',student,{action:'launch',id:lessonId},409)
  local.prepare('UPDATE zoom_connections SET expires=0 WHERE user_id=?').run(teacherId)
  const prepared=await Promise.all([one,admin].map(cookie=>fetch(origin+'/api/zoom/meeting',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'prepare',id:lessonId})})))
  assert.ok(prepared.some(r=>r.status===200));assert.ok(prepared.every(r=>[200,409].includes(r.status)))
  const updated=local.prepare('SELECT * FROM zoom_connections WHERE user_id=?').get(teacherId)
  assert.equal(decryptTokens(updated.encrypted_tokens,key,teacherId).refresh_token,'refresh-one-next')
  assert.ok(updated.expires>Date.now());assert.equal(local.prepare('SELECT COUNT(*) AS n FROM zoom_refresh_locks').get().n,0)
  await request('/api/zoom/meeting',one,{action:'prepare',id:lessonId})
  const host=await (await request('/api/zoom/meeting',one,{action:'launch',id:lessonId})).json();assert.ok(host.url.includes('zak=host-secret'))
  const guest=await (await request('/api/zoom/meeting',student,{action:'launch',id:lessonId})).json();assert.ok(guest.url.includes('/j/'));assert.ok(!guest.url.includes('zak='))
  await request('/api/system',one,{action:'join',id:lessonId},400)
  const meeting=local.prepare('SELECT * FROM zoom_meetings WHERE lesson_id=?').get(lessonId)
  const event=(kind,minute,participant={id:'',participant_user_id:'zoom-one',user_id:'device-1'})=>({event:'meeting.'+kind,event_ts:Date.now(),payload:{account_id:'account-one',object:{id:Number(meeting.meeting_id),uuid:'occurrence-one',host_id:'zoom-one',participant:{...participant,...(kind==='participant_joined'?{join_time:new Date(Date.parse(start)+minute*60000).toISOString()}:{leave_time:new Date(Date.parse(start)+minute*60000).toISOString()})}}}})
  const firstJoin=event('participant_joined',2)
  await webhook(event('participant_left',7));await webhook(firstJoin);await webhook(firstJoin)
  await webhook(event('participant_joined',12));await webhook(event('participant_left',17))
  await webhook(event('participant_joined',3,{email:'student@zoom.test',user_id:'student-device'}))
  await webhook(event('participant_left',9,{email:'student@zoom.test',user_id:'student-device'}))
  await webhook(event('participant_joined',1,{user_name:'student@zoom.test',user_id:'anonymous'}))
  const forged=event('participant_joined',1);forged.payload.account_id='other-account';await webhook(forged)
  const dashboard=await (await request('/api/system',one)).json();const attended=dashboard.lessons.find(l=>l.id===lessonId)
  assert.equal(attended.minutes,10);assert.equal(attended.earned,20);assert.equal(attended.student_zoom_minutes,6);assert.equal(attended.status,'attended')
  const studentView=await (await request('/api/system',student)).json();assert.ok(!JSON.stringify(studentView).includes('host-secret'));assert.equal(studentView.lessons[0].zoom_intervals,undefined)
  assert.equal(local.prepare('SELECT COUNT(*) AS n FROM zoom_attendance_events WHERE lesson_id=?').get(lessonId).n,6)
  const addFuture=(subject,days)=>Number(local.prepare("INSERT INTO lessons(teacher_id,student_id,subject,start,duration,rate,currency) VALUES(?,?,?,?,60,120,'EGP')").run(teacherId,studentId,subject,new Date(Date.now()+days*86400000).toISOString()).lastInsertRowid)
  const denied=addFuture('التجويد',1)
  await request('/api/zoom/meeting',one,{action:'prepare',id:denied},502)
  assert.equal(local.prepare('SELECT * FROM zoom_meetings WHERE lesson_id=?').get(denied),undefined)
  await request('/api/zoom/meeting',one,{action:'launch',id:denied},400)
  const uncertain=addFuture('اللغة العربية',2)
  await request('/api/zoom/meeting',one,{action:'prepare',id:uncertain},502)
  await request('/api/zoom/meeting',one,{action:'prepare',id:uncertain},409)
  assert.equal(local.prepare('SELECT state FROM zoom_meetings WHERE lesson_id=?').get(uncertain).state,'uncertain')
  await request('/api/zoom/meeting',one,{action:'reconcile',id:uncertain,meetingId:String(9000000000+uncertain)},403)
  await request('/api/zoom/meeting',admin,{action:'reconcile',id:uncertain,meetingId:String(meeting.meeting_id)},409)
  await request('/api/zoom/meeting',admin,{action:'reconcile',id:uncertain,meetingId:String(9000000000+uncertain)})
  await request('/api/zoom/meeting',one,{action:'prepare',id:uncertain})
  await request('/api/backups',admin,{action:'create'})
  const backup=await (await request('/api/backups?device=zoom-tests',admin)).json()
  const exported=await (await request('/api/backups?download='+backup.latest.id,admin)).text()
  const snapshot=verifyBackup(exported);assert.equal(snapshot.tables.zoom_attendance_events.length,6);assert.equal(snapshot.tables.zoom_meetings,undefined)
  const backupFile=join(directory,'zoom-backup.json');writeFileSync(backupFile,exported)
  const restoredFile=join(directory,'restored-zoom.sqlite');restoreBackup(backupFile,restoredFile)
  const restored=new DatabaseSync(restoredFile);assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM zoom_attendance_events').get().n,6);restored.close()
  await request('/api/zoom/participants?lesson='+lessonId,student,undefined,403)
  await request('/api/zoom/participants?lesson='+lessonId,two,undefined,403)
  const hidden={participant_user_id:'hidden-student-account',id:'',user_id:'hidden-session',user_name:'Mohamed',email:''}
  await webhook(event('participant_joined',18,hidden));await webhook(event('participant_left',19,hidden))
  assert.equal((await (await request('/api/system',one)).json()).lessons.find(l=>l.id===lessonId).student_zoom_minutes,6)
  const pending=await (await request('/api/zoom/participants?lesson='+lessonId,one)).json()
  const candidate=pending.participants.find(p=>p.name==='Mohamed');assert.ok(candidate);assert.equal(candidate.has_account,1);assert.equal(pending.canRemember,false)
  const confirm={id:lessonId,occurrence:candidate.occurrence,participant:candidate.participant}
  await request('/api/zoom/participants',one,{...confirm,remember:true},403)
  await request('/api/zoom/participants',one,{...confirm,remember:false})
  await request('/api/zoom/participants',admin,{...confirm,remember:true})
  await request('/api/zoom/participants',admin,{...confirm,remember:true}) // Repeated confirmation cannot duplicate time.
  assert.equal(local.prepare('SELECT COUNT(*) AS n FROM zoom_student_links').get().n,1)
  await webhook(event('participant_joined',10,{...hidden,user_id:'new-session'}))
  await webhook(event('participant_left',11,{...hidden,user_id:'new-session'}))
  const linked=await (await request('/api/system',one)).json();assert.equal(linked.lessons.find(l=>l.id===lessonId).student_zoom_minutes,8)
  const anonymous=pending.participants.find(p=>!p.has_account);assert.ok(anonymous)
  await request('/api/zoom/participants',admin,{id:lessonId,occurrence:anonymous.occurrence,participant:anonymous.participant,remember:true},409)
  const refreshConsent=await (await request('/api/zoom',one,{action:'reauthorize'})).json()
  const refreshState=new URL(refreshConsent.url).searchParams.get('state')
  const refreshedCallback=await request('/api/zoom/callback?state='+refreshState+'&code=one',one,undefined,303)
  assert.ok(refreshedCallback.headers.get('location').endsWith('zoom=connected'))
  const wrongConsent=await (await request('/api/zoom',one,{action:'reauthorize'})).json()
  const wrongCallback=await request('/api/zoom/callback?state='+new URL(wrongConsent.url).searchParams.get('state')+'&code=other',one,undefined,303)
  assert.ok(wrongCallback.headers.get('location').endsWith('zoom=failed_storage'))
  assert.equal(local.prepare('SELECT zoom_user_id FROM zoom_connections WHERE user_id=?').get(teacherId).zoom_user_id,'zoom-one')
  await request('/api/zoom',one,{action:'connect'},409)
  const stored = local.prepare('SELECT encrypted_tokens,user_id FROM zoom_connections').get(); assert.equal(decryptTokens(stored.encrypted_tokens,key,stored.user_id).access_token,'access-one')
  const expired = await begin(two); local.prepare('UPDATE zoom_oauth_states SET expires=0 WHERE hash=?').run(stateHash(expired)); await request('/api/zoom/callback?state='+expired+'&code=two',two,undefined,400)
  const cancelled = await begin(two); callback = await request('/api/zoom/callback?state='+cancelled+'&error=access_denied',two,undefined,303); assert.ok(callback.headers.get('location').endsWith('zoom=cancelled'))
  const failed = await begin(two); callback = await request('/api/zoom/callback?state='+failed+'&code=fail',two,undefined,303); assert.ok(callback.headers.get('location').endsWith('zoom=failed_token_exchange'))
  const redirected = await begin(two); callback = await request('/api/zoom/callback?state='+redirected+'&code=redirect',two,undefined,303); assert.ok(callback.headers.get('location').endsWith('zoom=failed_token_exchange'))
  assert.equal((await (await request('/api/zoom',two)).json()).connection,null)
  const validation = {event:'endpoint.url_validation',payload:{plainToken:'challenge'}}
  await webhook(validation,401,false)
  const validated = await (await webhook(validation)).json(); assert.equal(validated.encryptedToken,createHmac('sha256',secret).update('challenge').digest('hex'))
  const revoke = {event:'app_deauthorized',payload:{user_id:'zoom-one',account_id:'account-one',client_id:'mock-client',deauthorization_time:'2000-01-01T00:00:00.000Z'}}
  await webhook(revoke); assert.ok((await (await request('/api/zoom',one)).json()).connection)
  await webhook({...revoke,payload:{...revoke.payload,client_id:'wrong'}},400)
  await webhook({...revoke,payload:{...revoke.payload,deauthorization_time:new Date(Date.now()+1000).toISOString()}})
  assert.equal((await (await request('/api/zoom',one)).json()).connection,null)
  const reconnect = await begin(one); await request('/api/zoom/callback?state='+reconnect+'&code=one',one,undefined,303)
  await request('/api/zoom',one,{action:'disconnect'}); assert.equal((await (await request('/api/zoom',one)).json()).connection,null)
  local.close()
  console.log('PASS: OAuth isolation, encrypted refresh, concurrent meeting creation, host/student link separation, signed attendance, duplicates, reordered delivery, reconnect gaps, student matching and deauthorization')
} catch(error) { console.error(logs.slice(-4000)); throw error }
finally { server.kill(); await new Promise(resolve=>server.once('exit',resolve)); rmSync(directory,{recursive:true,force:true}) }
