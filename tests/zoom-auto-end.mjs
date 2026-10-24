import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { closeDueMeetings, queueMeetingEnd } from '../src/lib/zoom/auto-end.ts'
import { encryptTokens, decryptTokens } from '../src/lib/zoom/security.ts'
const now=Date.now(),key=randomBytes(32).toString('base64')
const config={clientId:'client',clientSecret:'private',redirectUri:'https://academy.test/api/zoom/callback',encryptionKey:key,webhookSecret:'secret'}
function fixture(offset=-60000) {
 const sql=new DatabaseSync(':memory:')
 sql.exec('CREATE TABLE users(id INTEGER PRIMARY KEY);CREATE TABLE lessons(id INTEGER PRIMARY KEY,start TEXT,duration INTEGER);INSERT INTO users VALUES(1);')
 for(const file of ['0008_zoom_oauth.sql','0010_zoom_meetings.sql','0011_zoom_end_jobs.sql'])sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'))
 const start=new Date(now+offset-300000).toISOString()
 sql.prepare('INSERT INTO lessons VALUES(1,?,5)').run(start)
 sql.prepare("INSERT INTO zoom_meetings VALUES(1,1,'host','account','9000000001','https://zoom.us/j/9000000001','ready',?)").run(new Date(now).toISOString())
 sql.prepare('INSERT INTO zoom_connections VALUES(1,?,?,?,?,?,?)').run('host','account','teacher@example.test',encryptTokens({access_token:'access',refresh_token:'refresh'},key,1),now+3600000,new Date(now).toISOString())
 const database={prepare(query){return{get:async(...v)=>sql.prepare(query).get(...v),run:async(...v)=>sql.prepare(query).run(...v),all:async(...v)=>sql.prepare(query).all(...v)}}}
 return{sql,database,start}
}
function provider({host='host',status='started',getStatus=200,putStatus=204,fail=false}={}) {
 const calls=[]
 const fetcher=async(url,init)=>{
  calls.push({url,method:init.method||'GET'});assert.equal(init.redirect,'manual')
  if(fail)throw Error('private provider response must never be persisted')
  if(url==='https://zoom.us/oauth/token')return Response.json({access_token:'new-access',refresh_token:'new-refresh',expires_in:3600})
  if(init.method==='PUT'){assert.deepEqual(JSON.parse(init.body),{action:'end'});return new Response(null,{status:putStatus})}
  return Response.json({id:9000000001,host_id:host,agenda:'ITQAN lesson 1',status},{status:getStatus})
 }
 return{calls,fetcher}
}
{
 const f=fixture(60000),p=provider();await queueMeetingEnd(f.database,1,f.start,5)
 assert.deepEqual(await closeDueMeetings(f.database,config,now,p.fetcher),{ended:0,skipped:0,retry:0,blocked:0});assert.equal(p.calls.length,0);f.sql.close()
}
{
 const f=fixture(),p=provider();await queueMeetingEnd(f.database,1,f.start,5)
 const results=await Promise.all([closeDueMeetings(f.database,config,now,p.fetcher),closeDueMeetings(f.database,config,now,p.fetcher)])
 assert.equal(results.reduce((s,r)=>s+r.ended,0),1);assert.equal(p.calls.filter(c=>c.method==='PUT').length,1)
 await closeDueMeetings(f.database,config,now+1000,p.fetcher);assert.equal(p.calls.filter(c=>c.method==='PUT').length,1);f.sql.close()
}
for(const [options,expected] of [[{host:'foreign'},'blocked'],[{status:'waiting'},'skipped'],[{getStatus:404},'skipped']]){
 const f=fixture(),p=provider(options);const result=await closeDueMeetings(f.database,config,now,p.fetcher)
 assert.equal(result[expected],1);assert.ok(!p.calls.some(c=>c.method==='PUT'));f.sql.close()
}
{
 const f=fixture(),p=provider({putStatus:403});assert.equal((await closeDueMeetings(f.database,config,now,p.fetcher)).retry,1)
 const row=f.sql.prepare('SELECT * FROM zoom_end_jobs').get();assert.equal(row.last_error,'zoom_http_403');assert.equal(row.next_attempt,now+60000)
 const success=provider();await closeDueMeetings(f.database,config,now+1000,success.fetcher);assert.equal(success.calls.length,0)
 assert.equal((await closeDueMeetings(f.database,config,now+60001,success.fetcher)).ended,1);f.sql.close()
}
{
 const f=fixture(),p=provider();f.sql.prepare('UPDATE zoom_connections SET expires=0').run()
 assert.equal((await closeDueMeetings(f.database,config,now,p.fetcher)).ended,1)
 const connection=f.sql.prepare('SELECT encrypted_tokens FROM zoom_connections').get()
 assert.equal(decryptTokens(connection.encrypted_tokens,key,1).refresh_token,'new-refresh');f.sql.close()
}
{
 const f=fixture(),p=provider({fail:true});assert.equal((await closeDueMeetings(f.database,config,now,p.fetcher)).retry,1)
 assert.ok(!JSON.stringify(f.sql.prepare('SELECT * FROM zoom_end_jobs').get()).includes('private'));f.sql.close()
}
console.log('PASS: scheduled close, concurrent claims, idempotency, owner validation, inactive/missing meetings, retries, encrypted refresh and safe diagnostics')
