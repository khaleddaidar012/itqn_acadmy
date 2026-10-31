import assert from 'node:assert/strict'
import {participantZoomUrl,lessonAvailable} from '../src/lib/system/lesson-workflow.ts'
import {accounting} from '../src/lib/system/accounting.ts'
import {whatsappNumber,nationalWhatsapp} from '../src/lib/system/phone.ts'
assert.equal(participantZoomUrl('https://us06web.zoom.us/j/12345678901?pwd=demo'),'https://us06web.zoom.us/j/12345678901?pwd=demo')
for(const url of ['https://evil.test/j/12345678901','https://zoom.us.evil.test/j/12345678901','javascript:alert(1)','https://zoom.us/s/12345678901?zak=secret','https://user:pass@zoom.us/j/12345678901','https://zoom.us:8000/j/12345678901','https://zoom.us/profile','https://zoom.us/j/12345678901/../../signin'])assert.throws(()=>participantZoomUrl(url))
const start='2026-10-31T10:00:00.000Z',at=Date.parse(start),base={status:'scheduled',start}
assert.equal(lessonAvailable(base,at-300001),false)
assert.equal(lessonAvailable(base,at-300000),true)
assert.equal(lessonAvailable(base,at+7200000),true,'Passing scheduled end does not close a manual lesson')
assert.equal(lessonAvailable({...base,completed_at:start},at),false)
assert.equal(lessonAvailable({...base,status:'cancelled'},at),false)
const lesson={...base,workflow_version:1,duration:30,rate:120,joined:new Date(at+60000).toISOString(),left_at:null}
assert.equal(accounting(lesson,at+1800000).earned,0)
assert.equal(accounting(lesson,at+1800000).minutes,0)
assert.equal(accounting({...lesson,completed_at:new Date(at+3600000).toISOString()},at+3600000).earned,58)
assert.equal(accounting({...lesson,completed_at:new Date(at+660000).toISOString()},at+3600000).earned,20)
assert.equal(accounting({...lesson,workflow_version:0},at+1800000).earned,58,'Historical earnings preserved')
assert.equal(whatsappNumber('٠٠٢٠ ١٠١٢٣٤٥٦٧٨'),'+201012345678')
assert.equal(whatsappNumber('+20 (101) 234-5678'),'+201012345678')
assert.equal(nationalWhatsapp('01012345678','EG'),'+201012345678')
assert.equal(nationalWhatsapp('٠١٠١٢٣٤٥٦٧٨','EG'),'+201012345678')
assert.equal(nationalWhatsapp('0512345678','SA'),'+966512345678')
assert.equal(nationalWhatsapp('020 7946 0018','GB'),'+442079460018')
assert.equal(nationalWhatsapp('02 36618 300','IT'),'+390236618300','Italian leading zero must remain')
assert.equal(nationalWhatsapp('+201012345678','EG'),'+201012345678','Pasted international number is not prefixed twice')
assert.throws(()=>nationalWhatsapp('01012345678','ZZ'))
assert.throws(()=>nationalWhatsapp('+201012345678','SA'))
assert.throws(()=>nationalWhatsapp('01','EG'))
for(const value of ['',null,'01012345678','+000012345678','+201234','+201234567890123456'])assert.throws(()=>whatsappNumber(value))
console.log('PASS: manual lesson timing/link validation, completion-only accounting with duration cap and legacy preservation, international WhatsApp normalization')
