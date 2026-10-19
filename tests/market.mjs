import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
let country = 'EG'
function compile(path, mocks) {
 const source = ts.transpileModule(readFileSync(path,'utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText
 const module={exports:{}}; new Function('require','module','exports',source)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),module,module.exports); return module.exports
}
const policy=compile('src/lib/market/policy.ts',{})
const pricing=compile('src/data/pricing.ts',{})
const server=compile('src/lib/market/server.ts',{'server-only':{},'./policy':policy,'@opennextjs/cloudflare':{getCloudflareContext:async()=>({cf:{country}})}})
const route=compile('src/app/api/market/route.ts',{'@/lib/market/server':server,'@/data/pricing':pricing})
const {NextRequest}=require('next/server')
const quote=plan_id=>route.POST(new NextRequest('http://localhost/api/market?country=US',{method:'POST',headers:{'Content-Type':'application/json','cf-ipcountry':'US','x-country':'US',Cookie:'region=INTL'},body:JSON.stringify({plan_id,price:1,currency:'USD',region:'INTL'})}))
const savedEnv=process.env.NODE_ENV, savedCountry=process.env.ITQAN_DEV_COUNTRY
try {
 process.env.NODE_ENV='production';process.env.ITQAN_DEV_COUNTRY='EG'
 for(const code of ['EG','US','GB','SA','AE']) {
  country=code;const response=await route.GET();const data=await response.json()
  assert.equal(data.region,code==='EG'?'EG':'INTL');assert.equal(data.currency,code==='EG'?'EGP':'USD')
  assert.equal(data.locale,['EG','SA','AE'].includes(code)?'ar':'en')
  assert.ok(data.programs.flatMap(p=>p.plans).every(p=>p.currency===data.currency))
  assert.match(response.headers.get('Cache-Control'),/no-store/)
 }
 country='EG';assert.equal((await quote('intl-half-2')).status,400)
 const egypt=await (await quote('eg-arabic-primary-4')).json();assert.equal(egypt.plan.price,500);assert.equal(egypt.plan.currency,'EGP')
 country='US';assert.equal((await quote('eg-arabic-primary-4')).status,400)
 for(const [id,price,original,discount] of [['intl-half-2',64,80,20],['intl-half-3',90,120,25]]) {
  const response=await quote(id);assert.equal(response.status,200);const {plan}=await response.json()
  assert.equal(plan.price,price);assert.equal(plan.originalPrice,original);assert.equal(Math.round((1-price/original)*100),discount)
  assert.equal(plan.siblingsOnly,true);assert.equal(plan.sessionsPerMonth,8);assert.equal(plan.durationMinutes,30)
 }
 for(country of [undefined,'XX','T1','ZZ','']) {assert.equal((await route.GET()).status,503);assert.equal((await quote('intl-half-2')).status,503)}
 country=undefined;process.env.NODE_ENV='development';assert.equal((await (await route.GET()).json()).source,'development')
 console.log('PASS: Egypt/international catalogs, country-based languages, no shared cache, spoofed headers/cookies/prices ignored, unknown country blocks quotes, production ignores development override, sibling discounts')
} finally {
 if(savedEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=savedEnv
 if(savedCountry===undefined)delete process.env.ITQAN_DEV_COUNTRY;else process.env.ITQAN_DEV_COUNTRY=savedCountry
}
