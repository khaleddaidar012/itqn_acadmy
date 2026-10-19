import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHmac, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'
const require=createRequire(import.meta.url)
function compile(path,mocks={}) {
  const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}};new Function('require','module','exports',code)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),module,module.exports);return module.exports
}
const config={mode:'test',secretKey:'sk_test_testonly',publicKey:'pk_test_testonly',hmacSecret:'test-only-hmac-secret',integrationIds:[123],appUrl:'https://academy.example'}
const provider=compile('src/lib/payments/paymob.ts')
const env={PAYMOB_MODE:'test',PAYMOB_SECRET_KEY:config.secretKey,PAYMOB_PUBLIC_KEY:config.publicKey,PAYMOB_HMAC_SECRET:config.hmacSecret,PAYMOB_USD_INTEGRATION_IDS:'123',PAYMOB_USD_ENABLED:'1',ITQAN_APP_URL:config.appUrl}
assert.ok(provider.paymobConfig(env));assert.equal(provider.paymobConfig({...env,PAYMOB_USD_ENABLED:'0'}),null)
assert.equal(provider.paymobConfig({...env,PAYMOB_MODE:'live'}),null);assert.equal(provider.paymobConfig({...env,ITQAN_APP_URL:'http://localhost:3001'}),null)
const pricing=compile('src/data/pricing.ts')
const database=new DatabaseSync(':memory:');database.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,role TEXT,enrollment_status TEXT);INSERT INTO users VALUES(1,\'Student\',\'student\',\'pending\'),(2,\'Other\',\'student\',\'pending\');'+compile('src/lib/payments/schema.ts').paymentSchema)
const db={prepare(sql){return {get:async(...args)=>database.prepare(sql).get(...args),all:async(...args)=>database.prepare(sql).all(...args),run:async(...args)=>database.prepare(sql).run(...args)}},async batch(queries){database.exec('BEGIN IMMEDIATE');try{for(const q of queries)database.prepare(q.sql).run(...q.values);database.exec('COMMIT')}catch(e){database.exec('ROLLBACK');throw e}}}
const service=compile('src/lib/payments/service.ts',{'@/lib/system/db':{db:()=>db},'@/data/pricing':pricing,'./paymob':provider,'./countries':compile('src/lib/payments/countries.ts')})
let user={id:1,name:'Test Student',email:'student@test.example',role:'student'};let market={region:'INTL',country:'US'};let activeConfig=config
const api=compile('src/app/api/payments/route.ts',{'@/lib/system/auth':{currentUser:async()=>user},'@/lib/system/db':{db:()=>db,rateLimit:async()=>true},'@/lib/market/server':{visitorMarket:async()=>market},'@/lib/payments/paymob':{paymobConfig:()=>activeConfig},'@/lib/payments/service':service})
const webhook=compile('src/app/api/payments/paymob/webhook/route.ts',{'@/lib/payments/paymob':{...provider,paymobConfig:()=>activeConfig},'@/lib/payments/service':service})
const {NextRequest}=require('next/server')
const body={plan_id:'intl-half-2',phone:'+15551234567',city:'Test City',address:'Test Street',billing_country:'USA',request_key:randomUUID(),locale:'en',amount:1,currency:'EGP'}
const post=(value=body,origin='https://academy.example')=>api.POST(new NextRequest('https://academy.example/api/payments',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)}))
let fetchCalls=0;let sent;const realFetch=globalThis.fetch
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://accept.paymob.com/v1/intention/');assert.equal(options.headers.Authorization,'Token '+config.secretKey);sent=JSON.parse(options.body);fetchCalls++;return Response.json({id:'pi_test_'+fetchCalls,intention_order_id:9000+fetchCalls,client_secret:'csk_test_only'})}
const state=id=>database.prepare('SELECT * FROM payment_orders WHERE id=?').get(id)
function transaction(order,changes={}) {return {amount_cents:order.amount,created_at:'2026-10-17T00:00:00.000000',currency:'USD',error_occured:false,has_parent_transaction:false,id:100000+Number(order.provider_order_id),integration_id:123,is_3d_secure:true,is_auth:false,is_capture:false,is_refunded:false,is_standalone_payment:true,is_voided:false,order:{id:Number(order.provider_order_id)},owner:77,pending:false,source_data:{pan:'2346',sub_type:'MasterCard',type:'card'},success:true,...changes}}
function signature(obj){const values=[obj.amount_cents,obj.created_at,obj.currency,obj.error_occured,obj.has_parent_transaction,obj.id,obj.integration_id,obj.is_3d_secure,obj.is_auth,obj.is_capture,obj.is_refunded,obj.is_standalone_payment,obj.is_voided,obj.order.id,obj.owner,obj.pending,obj.source_data.pan,obj.source_data.sub_type,obj.source_data.type,obj.success];return createHmac('sha512',config.hmacSecret).update(values.map(String).join('')).digest('hex')}
const notify=(obj,hmac=signature(obj))=>webhook.POST(new NextRequest('https://academy.example/api/payments/paymob/webhook?hmac='+hmac,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'TRANSACTION',obj})}))
try {
  const student=user;user=undefined;assert.equal((await post()).status,401);user=student
  assert.equal((await post(body,'https://attacker.example')).status,403)
  user={...student,role:'teacher'};assert.equal((await post()).status,403);user=student
  market={region:'EG',country:'EG'};assert.equal((await post()).status,403);market={region:'INTL',country:'US'}
  activeConfig=null;assert.equal((await post()).status,503);activeConfig=config
  assert.equal((await post({...body,plan_id:'eg-memo-30-4'})).status,400)
  const response=await post();assert.equal(response.status,200);const payment=await response.json();const order=state(payment.order_id)
  assert.equal(sent.amount,6400);assert.equal(sent.currency,'USD');assert.equal(sent.special_reference,order.id);assert.match(sent.notification_url,/\/api\/payments\/paymob\/webhook$/)
  assert.equal(payment.checkout_url.includes(config.secretKey),false);assert.equal(new URL(payment.checkout_url).origin,'https://accept.paymob.com')
  assert.equal((await post()).status,409);assert.equal(fetchCalls,1)
  const promo=await(await post({...body,plan_id:'intl-half-promo-3mo',request_key:randomUUID()})).json();assert.equal(sent.amount,8400)
  user={...student,id:2};const other=await(await api.GET(new NextRequest('https://academy.example/api/payments?order='+order.id))).json();assert.equal(other.orders.length,0);user=student
  const obj=transaction(order);assert.equal((await notify(obj,'0'.repeat(128))).status,401);assert.equal(state(order.id).status,'pending')
  assert.equal((await notify({...obj,amount_cents:1})).status,409)
  assert.equal((await notify({...obj,currency:'EGP'})).status,409)
  assert.equal((await notify({...obj,integration_id:456})).status,409)
  const pending={...obj,pending:true,success:false};assert.equal((await notify(pending)).status,200);assert.equal(state(order.id).status,'pending')
  assert.equal((await notify(obj)).status,200);assert.equal(state(order.id).status,'paid');assert.ok(state(order.id).paid_at)
  const count=database.prepare('SELECT COUNT(*) AS n FROM payment_events').get().n
  await Promise.all([notify(obj),notify(obj)]);assert.equal(database.prepare('SELECT COUNT(*) AS n FROM payment_events').get().n,count)
  assert.equal(database.prepare('SELECT enrollment_status FROM users WHERE id=1').get().enrollment_status,'pending')
  await notify({...obj,id:obj.id+1,success:false,error_occured:true});assert.equal(state(order.id).status,'paid')
  await notify({...obj,is_refunded:true});assert.equal(state(order.id).status,'review');await notify(obj);assert.equal(state(order.id).status,'review')
  const auth=transaction(state(promo.order_id),{is_auth:true,is_standalone_payment:false});await notify(auth);assert.equal(state(promo.order_id).status,'pending')
  database.exec("CREATE TRIGGER fail_payment_update BEFORE UPDATE ON payment_orders BEGIN SELECT RAISE(ABORT,'test rollback'); END;")
  const eventCount=database.prepare('SELECT COUNT(*) AS n FROM payment_events').get().n
  assert.equal((await notify(transaction(state(promo.order_id)))).status,500)
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM payment_events').get().n,eventCount);database.exec('DROP TRIGGER fail_payment_update')
  await notify(transaction(state(promo.order_id)));assert.equal(state(promo.order_id).status,'paid')
  const double=transaction(state(promo.order_id));await notify({...double,id:double.id+100});assert.equal(state(promo.order_id).status,'review')
  console.log('PASS: USD configuration guards, student ownership, country and CSRF, server pricing, $84 quarterly total, hosted checkout, duplicate order protection, HMAC, amount/currency/integration checks, webhook replay/concurrency, authorization-only payments, atomic rollback, refund/double-payment review, no automatic enrollment activation')
} finally {globalThis.fetch=realFetch;database.close()}
