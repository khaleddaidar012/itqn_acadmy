import assert from 'node:assert/strict'
import {layoutDay,calendarWindow} from '../src/lib/system/week-layout.ts'
import {cairoToIso} from '../src/lib/system/calendar.ts'
const lesson=(id,time,duration=30)=>({id,start:cairoToIso('2026-10-31T'+time),duration})
const day='2026-10-31'
let items=layoutDay([lesson(1,'09:00'),lesson(2,'09:15'),lesson(3,'09:30')],day)
assert.deepEqual(items.map(i=>[i.lane,i.lanes]),[[0,2],[1,2],[0,2]])
items=layoutDay([lesson(1,'09:00'),lesson(2,'09:30')],day)
assert.ok(items.every(i=>i.lanes===1),'Adjacent classes reuse full column width')
items=layoutDay([lesson(1,'09:00',5),lesson(2,'09:05',5)],day)
assert.equal(items[0].lanes,2,'Short cards have enough space without covering the next lesson')
const crossing=lesson(4,'23:45',30)
assert.equal(layoutDay([crossing],day)[0].end,1440)
assert.equal(layoutDay([crossing],'2026-11-01')[0].begin,0)
assert.equal(layoutDay([crossing],'2026-11-02').length,0)
assert.equal(layoutDay([lesson(1,'23:55',5)],day)[0].visualBegin,1412,'Late cards remain inside visible day')
assert.deepEqual(calendarWindow([]),{begin:480,end:1200})
assert.deepEqual(calendarWindow(layoutDay([lesson(1,'23:55',5)],day)),{begin:1080,end:1440})
assert.equal(layoutDay([{id:5,start:'2026-10-29T20:45:00.000Z',duration:30}],'2026-10-29').length,1,'Repeated Cairo DST clock hour stays visible')
console.log('PASS: concurrent/adjacent/short lesson lanes, Cairo timing, cross-midnight continuation, late-night visibility, window bounds and repeated DST hour')
