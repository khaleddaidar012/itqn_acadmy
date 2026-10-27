import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
const directory=mkdtempSync(join(tmpdir(),'itqan-retention-http-')),worker=process.argv.includes('--worker'),origin='http://localhost:3146',password='retention-fixture-password-123'
const env={...process.env,ITQAN_USE_D1:worker?'1':'0',ITQAN_DATA_DIR:directory,ITQAN_ADMIN_EMAIL:'admin@retention.test',ITQAN_ADMIN_PASSWORD:password,PAYMOB_USD_ENABLED:'0',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',XDG_CONFIG_HOME:join(directory,'config'),WRANGLER_REGISTRY_PATH:join(directory,'registry'),WRANGLER_LOG_PATH:join(directory,'logs')}
if(worker){const m=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','itqan-academy','--local','--persist-to',directory],{env:{...env,CI:'true'},input:'y\n',encoding:'utf8',timeout:60000});assert.equal(m.status,0,m.stdout+m.stderr)}
const args=worker?['node_modules/wrangler/bin/wrangler.js','dev','--port','3146','--persist-to',directory,'--test-scheduled','--var','ITQAN_ADMIN_EMAIL:admin@retention.test','--var',`ITQAN_ADMIN_PASSWORD:${password}`]:['node_modules/next/dist/bin/next','dev','-p','3146']
const server=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',b=>logs=(logs+b).slice(-5000));server.stderr.on('data',b=>logs=(logs+b).slice(-5000))
async function request(path,cookie='',body,status=200,requestOrigin=origin){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,status,await r.clone().text());return r}
try{
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(origin+'/ar/login')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert.ok(ready,logs)
 const adminResponse=await request('/api/system','',{action:'login',email:env.ITQAN_ADMIN_EMAIL,password}),admin=adminResponse.headers.get('set-cookie').split(';')[0]
 const registration=await request('/api/system','',{action:'register',name:'Closure fixture',email:'student@retention.test',password,subjects:['حفظ القرآن']}),student=registration.headers.get('set-cookie').split(';')[0],id=(await registration.json()).user.id
 const otherResponse=await request('/api/system','',{action:'register',name:'Other fixture',email:'other@retention.test',password,subjects:['حفظ القرآن']}),other=otherResponse.headers.get('set-cookie').split(';')[0]
 const body={student_id:id,confirm:true}
 await request('/api/privacy','',undefined,401)
 await request('/api/privacy',student,undefined,403)
 await request('/api/privacy?ledger=1',student,undefined,403)
 await request('/api/privacy',other,body,403)
 await request('/api/privacy',student,body,403,'https://foreign.example')
 await request('/api/privacy',student,{...body,confirm:false},400)
 assert.equal((await (await request('/api/privacy',admin)).json()).closures.length,0)
 // Self closure revokes the existing login immediately, including a pending account.
 await request('/api/privacy',student,body)
 await request('/api/system',student,undefined,401)
 await request('/api/system','',{action:'login',email:'student@retention.test',password},401)
 const closure=(await (await request('/api/privacy',admin)).json()).closures[0]
 assert.equal(closure.student_id,id);assert.equal(new Date(closure.purge_at).getUTCFullYear(),new Date(closure.closed_at).getUTCFullYear()+1)
 await request('/api/privacy',admin,body,409)
 const again=(await (await request('/api/privacy',admin)).json()).closures[0];assert.equal(again.closed_at,closure.closed_at)
 const ledger=await(await request('/api/privacy?ledger=1',admin)).json();assert.equal(ledger.format,'itqan-privacy-ledger');assert.equal(ledger.closures.length,1);assert.ok(!JSON.stringify(ledger).includes('student@retention.test'))
 assert.ok((await request('/api/system',other)).ok)
 const state=await(await request('/api/system',other)).json();await request('/api/privacy',admin,{student_id:state.user.id,confirm:true});await request('/api/system',other,undefined,401)
 await request('/api/backups',admin,{action:'create'})
 const old=(await(await request('/api/backups',admin)).json()).latest
 const dbFile=worker?readdirSync(directory,{recursive:true}).find(f=>String(f).endsWith('.sqlite')&&!String(f).endsWith('metadata.sqlite')):'itqan.sqlite'
 assert.ok(dbFile);const local=new DatabaseSync(join(directory,String(dbFile)))
 // This is the disposable test database only: production APIs cannot backdate closure.
 local.prepare("UPDATE account_closures SET closed_at='2020-01-01T00:00:00.000Z',purge_at='2021-01-01T00:00:00.000Z' WHERE student_id=?").run(id)
 await request('/api/backups',admin)
 assert.equal(local.prepare('SELECT password FROM users WHERE id=?').get(id).password,'')
 assert.ok(local.prepare('SELECT purged_at FROM account_closures WHERE student_id=?').get(id).purged_at)
 await request('/api/backups?download='+old.id,admin,undefined,404)
 assert.equal(local.prepare('PRAGMA foreign_key_check').all().length,0);local.close()
 for(const path of ['/ar/privacy','/en/privacy','/ar/terms','/en/terms'])assert.ok((await(await request(path)).text()).includes('academyiqtan3@gmail.com'))
 if(worker)assert.equal((await fetch(origin+'/cdn-cgi/handler/scheduled')).status,200)
 console.log('PASS '+(worker?'Worker + D1':'Next + SQLite')+': public bilingual policies, auth/ownership/Origin/confirmation boundaries, self/admin closure, immediate revocation, immutable closure date, private ledger, actual overdue erasure and stale backup download rejection')
}catch(e){console.error(logs);throw e}finally{
 if(process.platform==='win32'&&server.exitCode===null)spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',timeout:10000})
 server.kill();server.stdout.destroy();server.stderr.destroy();server.unref();assert.ok(directory.startsWith(join(tmpdir(),'itqan-retention-http-')));rmSync(directory,{recursive:true,force:true})
}
