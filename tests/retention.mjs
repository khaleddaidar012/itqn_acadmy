import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeStudent, privacyLedger, retentionDeadline, runRetention } from '../src/lib/system/retention.ts'
import { createBackup, verifyBackup, BACKUP_TABLES } from '../src/lib/system/backup-core.ts'
import { d1BackupStorage } from '../src/lib/system/d1-backup-storage.ts'
import { restoreBackup } from '../scripts/restore-backup.mjs'
assert.equal(retentionDeadline('2024-02-29T09:30:00.000Z'),'2025-02-28T09:30:00.000Z')
assert.equal(retentionDeadline('2023-03-01T09:30:00.000Z'),'2024-03-01T09:30:00.000Z')
assert.throws(()=>retentionDeadline('bad'))
const temp=mkdtempSync(join(tmpdir(),'itqan-retention-')),sql=new DatabaseSync(':memory:')
for(const f of readdirSync('migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort())sql.exec(readFileSync(join('migrations',f),'utf8'))
const db={
 prepare(query){const s=sql.prepare(query);return {get:async(...v)=>s.get(...v),all:async(...v)=>s.all(...v),run:async(...v)=>s.run(...v)}},
 async snapshot(tables){return Object.fromEntries(tables.map(t=>[t,sql.prepare(`SELECT * FROM ${t}`).all()]))},
 async batch(queries){sql.exec('BEGIN IMMEDIATE');try{for(const q of queries)sql.prepare(q.sql).run(...q.values);sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}},
}
try {
 const now=new Date(),at=now.toISOString(),past=new Date(now.getTime()-7*86400000).toISOString(),future=new Date(now.getTime()+86400000).toISOString()
 sql.exec("INSERT INTO users(id,name,email,password,role) VALUES(1,'Admin','admin@example.test','hash','admin'),(2,'Tutor','tutor@example.test','hash','teacher'),(3,'Erased pupil','erased@example.test','private-password-hash','student'),(4,'Other pupil','other@example.test','hash','student');INSERT INTO sessions VALUES('private-session',3,9999999999999),('other-session',4,9999999999999)")
 const lesson=sql.prepare("INSERT INTO lessons(id,teacher_id,student_id,subject,start,duration,rate,currency,joined,left_at,note) VALUES(?,2,?,'حفظ القرآن',?,60,120,'EGP',?,?,?)")
 const start=Date.parse(past)
 lesson.run(101,3,past,past,new Date(start+3600000).toISOString(),'private-lesson-note')
 lesson.run(102,4,new Date(start+7200000).toISOString(),null,null,'other lesson')
 lesson.run(103,3,future,null,null,'private-future')
 sql.prepare("INSERT INTO progress(student_id,teacher_id,lesson_id,pages,note,created) VALUES(3,2,101,22,'private-progress',?)").run(at)
 sql.prepare("INSERT INTO teacher_excuses(lesson_id,teacher_id,comment,created) VALUES(101,2,'private-excuse',?)").run(at)
 sql.prepare("INSERT INTO report_shares(id,token_hash,student_id,created_by,created,expires,snapshot) VALUES('report','hash',3,1,?,?,'private-report')").run(at,future)
 sql.prepare("INSERT INTO zoom_meetings(lesson_id,teacher_id,host_id,account_id,meeting_id,join_url,state,created) VALUES(101,2,'host','acct','991','https://zoom.test/private','ready',?)").run(at)
 const ev=sql.prepare("INSERT INTO zoom_attendance_events(event_key,lesson_id,actor,participant,occurrence,kind,at_ms) VALUES(?,101,'teacher','private-participant','occurrence',?,?)")
 ev.run('joined','join',start+15*60000);ev.run('left','leave',start+35*60000)
 sql.prepare("INSERT INTO zoom_student_links VALUES(3,'private-hash',1,?,101)").run(at)
 sql.prepare("INSERT INTO zoom_pending_participants(event_key,lesson_id,occurrence,participant,display_name,kind,at_ms) VALUES('pending',101,'occurrence','private-participant','private-display','join',?)").run(start)
 sql.prepare("INSERT INTO zoom_end_jobs(lesson_id,due_ms) VALUES(101,?)").run(start+3600000)
 sql.prepare("INSERT INTO payment_orders(id,student_id,request_key,plan_id,plan_name,amount,currency,country,mode,integration_ids,created,updated) VALUES('pay',3,'request','plan','private-plan',100,'USD','EG','test','[]',?,?)").run(at,at)
 sql.prepare("INSERT INTO payment_events VALUES('event','pay','txn','paid',?)").run(at)
 sql.prepare("INSERT INTO student_subscriptions(id,request_key,student_id,plan_id,plan_name,subject,total_sessions,amount,currency,starts,ends,created_by,created) VALUES('sub','subrequest',3,'plan','private-plan','حفظ القرآن',4,100,'EGP',?,?,1,?)").run(past,future,at)
 sql.prepare("INSERT INTO subscription_receipts VALUES('receipt','receiptrequest','sub',100,'cash','private-ref',1,?)").run(at)
 sql.exec("INSERT INTO attempts VALUES('auth:erased@example.test',1,9999999999999)")
 const storage=d1BackupStorage(db),backup=await createBackup(db,storage),data=await storage.get(backup.key),file=join(temp,'backup.json')
 writeFileSync(file,data)
 await assert.rejects(()=>restoreBackup(file,join(temp,'without-ledger.sqlite')),/ledger/)
 await closeStudent(db,3,now)
 const ledger=await privacyLedger(db)
 assert.equal(sql.prepare('SELECT disabled FROM users WHERE id=3').get().disabled,1)
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=3').get().n,0)
 assert.equal(sql.prepare('SELECT revoked FROM report_shares').get().revoked,1)
 assert.equal(sql.prepare('SELECT status FROM lessons WHERE id=103').get().status,'cancelled')
 await assert.rejects(()=>closeStudent(db,3),/not_available/)
 await assert.rejects(()=>closeStudent(db,2),/not_available/)
 await assert.rejects(()=>restoreBackup(file,join(temp,'wrong-ledger.sqlite'),{...ledger,instance:'other-academy'}),/ledger/)
 await assert.rejects(()=>restoreBackup(file,join(temp,'stale-ledger.sqlite'),{...ledger,generated:new Date(now.getTime()-25*3600000).toISOString()}),/ledger/)
 const restored=join(temp,'closed-restored.sqlite');await restoreBackup(file,restored,ledger)
 const check=new DatabaseSync(restored);assert.equal(check.prepare('SELECT disabled FROM users WHERE id=3').get().disabled,1);assert.equal(check.prepare('SELECT COUNT(*) n FROM account_closures').get().n,1);check.close()
 const closed=new Date(now);closed.setUTCFullYear(closed.getUTCFullYear()-1);closed.setUTCSeconds(closed.getUTCSeconds()-10)
 const deadline=retentionDeadline(closed.toISOString())
 sql.prepare('UPDATE account_closures SET closed_at=?,purge_at=? WHERE student_id=3').run(closed.toISOString(),deadline)
 await runRetention(db,storage,new Date(Date.parse(deadline)-1))
 assert.equal(sql.prepare('SELECT name FROM users WHERE id=3').get().name,'Erased pupil')
 // A storage/database failure must roll back the entire erasure and pay rollup.
 sql.exec("CREATE TRIGGER fail_erasure BEFORE UPDATE OF email ON users WHEN OLD.id=3 BEGIN SELECT RAISE(ABORT,'forced failure'); END")
 await assert.rejects(()=>runRetention(db,storage,now),/forced failure/)
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM retained_teacher_totals').get().n,0)
 assert.equal(await storage.get(backup.key),data)
 sql.exec('DROP TRIGGER fail_erasure;UPDATE account_closures SET lease_until=0')
 const outcomes=await Promise.all([runRetention(db,storage,now),runRetention(db,storage,now)])
 assert.equal(outcomes.reduce((n,r)=>n+r.purged,0),1)
 assert.equal(await storage.get(backup.key),null)
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM backup_runs').get().n,0)
 const pay=sql.prepare('SELECT * FROM retained_teacher_totals ORDER BY month').all()
 for(const row of pay)assert.match(row.month,/^\d{4}-\d{2}$/)
 assert.equal(pay.reduce((n,r)=>n+r.minutes,0),20);assert.equal(pay.reduce((n,r)=>n+r.earned,0),40)
 assert.equal(sql.prepare('SELECT note FROM lessons WHERE id=102').get().note,'other lesson')
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM sessions WHERE token='other-session'").get().n,1)
 assert.equal(sql.prepare('PRAGMA foreign_key_check').all().length,0)
 assert.equal((await runRetention(db,storage,now)).purged,0)
 const original=JSON.stringify(await db.snapshot([...BACKUP_TABLES,'zoom_pending_participants','zoom_meetings','sessions','attempts','backup_objects','backup_object_chunks']))
 for(const secret of ['Erased pupil','erased@example.test','private-password-hash','private-session','private-lesson-note','private-progress','private-excuse','private-report','private-participant','private-display','private-plan','private-ref'])assert.ok(!original.includes(secret),secret+' survived')
 const current=await createBackup(db,storage);assert.ok(!String(await storage.get(current.key)).includes('erased@example.test'))
 // A backup in flight cannot publish its pre-erasure snapshot after the epoch changes.
 let attemptedKey
 await assert.rejects(()=>createBackup(db,{...storage,put:async(key,body,revision)=>{attemptedKey=key;sql.exec("UPDATE system_settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT) WHERE key='privacy_revision'");await storage.put(key,body,revision)}}),/invalidated/)
 assert.equal(await storage.get(attemptedKey),null)
 // Restoring an older export applies CURRENT erasures before returning a database.
 const erasedLedger=await privacyLedger(db),target=join(temp,'purged-restored.sqlite')
 await restoreBackup(file,target,erasedLedger)
 const erased=new DatabaseSync(target);assert.equal(erased.prepare('SELECT password FROM users WHERE id=3').get().password,'');assert.equal(erased.prepare('SELECT COUNT(*) n FROM lessons WHERE student_id=3').get().n,0);assert.equal(erased.prepare('SELECT SUM(earned) n FROM retained_teacher_totals').get().n,40);erased.close()
 // Expired exports fail even with a current correct ledger.
 const envelope=JSON.parse(data),payload=JSON.parse(envelope.payload);payload.created=new Date(now.getTime()-31*86400000).toISOString();envelope.payload=JSON.stringify(payload)
 const {createHash}=await import('node:crypto');envelope.sha256=createHash('sha256').update(envelope.payload).digest('hex');const expired=join(temp,'expired.json');writeFileSync(expired,JSON.stringify(envelope))
 await assert.rejects(()=>restoreBackup(expired,join(temp,'expired.sqlite'),erasedLedger),/expired/)
 await runRetention(db,storage,new Date(now.getTime()+31*86400000));assert.equal(sql.prepare('SELECT COUNT(*) n FROM backup_objects').get().n,0)
 console.log('PASS: calendar-year/leap-day boundary, atomic close/session revocation, ownership-neutral core validation, rollback, concurrent/idempotent purge, Zoom-derived teacher pay preservation, cross-student isolation, complete PII and backup removal, backup epoch race, fresh/matching ledger restoration and expired export rejection')
} finally {sql.close();rmSync(temp,{recursive:true,force:true})}
