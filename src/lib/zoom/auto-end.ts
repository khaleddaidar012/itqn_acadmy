import { randomUUID } from 'node:crypto'
import { callZoom, ZoomTransportError, type ZoomDatabase } from './transport.ts'
import type { ZoomConfig } from './client'
export async function queueMeetingEnd(database:ZoomDatabase,lessonId:number,start:string,duration:number) {
  await database.prepare('INSERT OR IGNORE INTO zoom_end_jobs(lesson_id,due_ms) VALUES(?,?)').run(lessonId,Date.parse(start)+duration*60000)
}
export async function closeDueMeetings(database:ZoomDatabase,config:ZoomConfig,now=Date.now(),fetcher:typeof fetch=fetch) {
  // Only adopt recent/future meetings, never resurrect historical meetings as jobs.
  await database.prepare(`INSERT OR IGNORE INTO zoom_end_jobs(lesson_id,due_ms)
    SELECT l.id,CAST(ROUND((julianday(l.start)-2440587.5)*86400000) AS INTEGER)+l.duration*60000
    FROM lessons l JOIN zoom_meetings m ON m.lesson_id=l.id WHERE m.state='ready'
    AND julianday(l.start)+l.duration/1440.0>=julianday(?)-5.0/1440.0`).run(new Date(now).toISOString())
  const jobs=await database.prepare(`SELECT j.lesson_id,m.teacher_id,m.host_id,m.meeting_id FROM zoom_end_jobs j
    JOIN zoom_meetings m ON m.lesson_id=j.lesson_id WHERE m.state='ready' AND j.due_ms<=? AND j.next_attempt<=?
    AND (j.state IN ('pending','retry') OR j.state='working' AND j.lease_until<?) ORDER BY j.due_ms LIMIT 5`).all(now,now,now)
  const result={ended:0,skipped:0,retry:0,blocked:0}
  for(const job of jobs) {
    const owner=randomUUID(),id=Number(job.lesson_id)
    const claim=await database.prepare(`UPDATE zoom_end_jobs SET state='working',owner=?,lease_until=?,attempts=attempts+1
      WHERE lesson_id=? AND due_ms<=? AND next_attempt<=? AND (state IN ('pending','retry') OR state='working' AND lease_until<?) RETURNING attempts,due_ms`).get(owner,now+120000,id,now,now,now)
    if(!claim) continue
    const finish=async(state:'ended'|'skipped'|'blocked',reason:string|null=null)=>{
      await database.prepare('UPDATE zoom_end_jobs SET state=?,completed=?,last_error=?,lease_until=0,owner=NULL WHERE lesson_id=? AND owner=?').run(state,new Date(now).toISOString(),reason,id,owner)
      result[state]++
    }
    try {
      if(now-Number(claim.due_ms)>12*3600000){await finish('blocked','job_too_old');continue}
      const {response,connection}=await callZoom(Number(job.teacher_id),config,'/meetings/'+String(job.meeting_id),{},database,fetcher)
      if(response.status===404){await finish('skipped','meeting_missing');continue}
      if(!response.ok)throw new ZoomTransportError('zoom_http_'+response.status,response.status)
      const meeting=await response.json()
      if(connection.zoom_user_id!==job.host_id || meeting.host_id!==job.host_id || String(meeting.id)!==job.meeting_id || meeting.agenda!=='ITQAN lesson '+id){await finish('blocked','meeting_owner_mismatch');continue}
      if(meeting.status==='waiting'){await finish('skipped','meeting_not_running');continue}
      if(meeting.status!=='started')throw new ZoomTransportError('unknown_meeting_status')
      const ended=await callZoom(Number(job.teacher_id),config,'/meetings/'+String(job.meeting_id)+'/status',{method:'PUT',body:JSON.stringify({action:'end'})},database,fetcher)
      if(!ended.response.ok)throw new ZoomTransportError('zoom_http_'+ended.response.status,ended.response.status)
      await finish('ended')
    } catch(error) {
      // Only bounded HTTP/status codes, never tokens, URLs, or provider bodies.
      const code=error instanceof ZoomTransportError ? 'zoom_http_'+error.status : 'transport_failure'
      if(Number(claim.attempts)>=10){await finish('blocked',code);continue}
      const retryAt=now+Math.min(15,2**(Number(claim.attempts)-1))*60000
      await database.prepare("UPDATE zoom_end_jobs SET state='retry',next_attempt=?,last_error=?,lease_until=0,owner=NULL WHERE lesson_id=? AND owner=?").run(retryAt,code,id,owner)
      result.retry++
    }
  }
  return result
}
