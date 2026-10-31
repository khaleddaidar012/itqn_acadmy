import {daySegments,localDateTime} from './calendar.ts'
import type {Lesson} from './accounting'
export type CalendarLesson={lesson:Lesson;begin:number;end:number;visualBegin:number;lane:number;lanes:number}
function segment(lesson:Lesson,day:string){
  const from=Date.parse(lesson.start),to=from+lesson.duration*60000
  const a=localDateTime(new Date(from).toISOString()),b=localDateTime(new Date(to).toISOString())
  const offset=(local:string,at:number)=>Date.parse(local+'Z')-Math.floor(at/60000)*60000
  if(offset(a,from)===offset(b,to))return daySegments(lesson.start,lesson.duration,day)
  // Repeated Cairo clock hours must remain visible in the right day, rather than
  // disappearing when the wall-clock end is earlier than the wall-clock start.
  const minutes:number[]=[]
  for(let at=from;at<to;at+=60000){const local=localDateTime(new Date(at).toISOString());if(local.slice(0,10)===day)minutes.push(Number(local.slice(11,13))*60+Number(local.slice(14,16)))}
  return minutes.length?{begin:Math.min(...minutes),end:Math.max(...minutes)+1}:null
}
export function layoutDay(lessons:Lesson[],day:string):CalendarLesson[]{
  const items=lessons.flatMap(lesson=>{const part=segment(lesson,day);return part?[{lesson,...part,visualBegin:Math.min(part.begin,1412),lane:0,lanes:1}]:[]}).sort((a,b)=>a.visualBegin-b.visualBegin||b.end-a.end||a.lesson.id-b.lesson.id)
  let group:CalendarLesson[]=[],ends:number[]=[]
  const finish=()=>{for(const item of group)item.lanes=ends.length;group=[];ends=[]}
  for(const item of items){
    if(group.length&&item.visualBegin>=Math.max(...ends))finish()
    const free=ends.findIndex(end=>end<=item.visualBegin)
    item.lane=free<0?ends.length:free
    ends[item.lane]=Math.min(1440,Math.max(item.end,item.visualBegin+28))
    group.push(item)
  }
  finish();return items
}
export function calendarWindow(items:CalendarLesson[]){
  if(!items.length)return{begin:480,end:1200}
  const first=Math.floor(Math.min(...items.map(i=>i.begin))/60)*60
  const last=Math.ceil(Math.max(...items.map(i=>Math.max(i.end,i.begin+28)))/60)*60
  return{begin:Math.max(0,Math.min(first,1080)),end:Math.min(1440,Math.max(last,first+360))}
}
