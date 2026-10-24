import { createHash } from 'node:crypto'
import { db } from '@/lib/system/db'
import { presenceIntervals, presenceMinutes, type AttendanceEvent } from './attendance'
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const time=(value:unknown)=>typeof value==='string' ? Date.parse(value) : NaN
export async function receiveMeetingEvent(body: Record<string, any>) {
  if(!body || typeof body!=='object') return
  const kinds:Record<string,string>={'meeting.started':'start','meeting.ended':'end','meeting.participant_joined':'join','meeting.participant_left':'leave'}
  const kind=Object.hasOwn(kinds,body.event)?kinds[body.event]:undefined; if(!kind) return
  const object=body.payload?.object
  if(!object || !/^\d+$/.test(String(object.id)) || typeof object.uuid!=='string' || !object.uuid || object.uuid.length>256) return {event:body.event,reason:'invalid_meeting'}
  const meeting=await db().prepare("SELECT m.*,l.start,l.duration,l.student_id,s.email AS student_email,z.zoom_user_hash AS student_zoom_hash FROM zoom_meetings m JOIN lessons l ON l.id=m.lesson_id JOIN users s ON s.id=l.student_id LEFT JOIN zoom_student_links z ON z.student_id=l.student_id WHERE m.meeting_id=? AND m.state='ready'").get(String(object.id))
  if(!meeting) return {event:body.event,reason:'unknown_meeting'}
  if(body.payload.account_id!==meeting.account_id || object.host_id!==meeting.host_id) return {event:body.event,reason:'owner_mismatch'}
  const participant=object.participant
  let actor='meeting', participantKey='meeting', joined:number|null=null
  let at=time(kind==='start' ? object.start_time : kind==='end' ? object.end_time : kind==='join' ? participant?.join_time : participant?.leave_time)
  if((kind==='start' || kind==='end') && !Number.isFinite(at) && Number.isFinite(body.event_ts)) at=body.event_ts
  if(kind==='join' || kind==='leave') {
    if(!participant) return {event:body.event,reason:'missing_participant'}
    // Zoom's modern payload can leave legacy `id` blank.
    if(participant.participant_user_id===meeting.host_id || participant.id===meeting.host_id) actor='teacher'
    else if(typeof participant.email==='string' && participant.email.toLowerCase()===String(meeting.student_email).toLowerCase()) actor='student'
    else if(typeof participant.participant_user_id==='string' && participant.participant_user_id && hash(participant.participant_user_id)===meeting.student_zoom_hash || typeof participant.id==='string' && participant.id && hash(participant.id)===meeting.student_zoom_hash) actor='student'
    else actor='unmatched' // Human confirmation is required; names never establish identity.
    const session=participant.user_id || participant.participant_uuid || participant.participant_user_id || participant.id
    if(typeof session!=='string' || !session || session.length>256) return {event:body.event,reason:'missing_session'}
    participantKey=hash(session)
    const join=time(participant.join_time)
    if(Number.isFinite(join) && join<=at) joined=join
  }
  const start=Date.parse(String(meeting.start)), end=start+Number(meeting.duration)*60000
  if(!Number.isFinite(at) || at<start-15*60000 || at>end+12*3600000 || at>Date.now()+300000) return {event:body.event,reason:'invalid_time'}
  if(joined!==null && joined<start-15*60000) joined=null
  const occurrence=hash(object.uuid)
  if(actor==='unmatched') {
    const existing=await db().prepare('SELECT resolved_student_id FROM zoom_pending_participants WHERE lesson_id=? AND occurrence=? AND participant=? AND resolved_student_id IS NOT NULL LIMIT 1').get(Number(meeting.lesson_id),occurrence,participantKey)
    if(existing?.resolved_student_id===meeting.student_id) actor='student'
    else {
      await db().prepare('DELETE FROM zoom_pending_participants WHERE at_ms<?').run(Date.now()-30*86400000)
      const count=await db().prepare('SELECT COUNT(*) AS n FROM zoom_pending_participants WHERE lesson_id=?').get(Number(meeting.lesson_id))
      if(Number(count?.n)>=500)return {event:body.event,reason:'participant_review_limit',lessonId:Number(meeting.lesson_id)}
      const stable=participant.participant_user_id || participant.id
      const stableHash=typeof stable==='string' && stable && stable.length<=256?hash(stable):null
      const name=typeof participant.user_name==='string'?participant.user_name.slice(0,100):'مشارك بدون اسم'
      const pendingKey=hash([meeting.lesson_id,occurrence,'student',participantKey,kind,at].join(':'))
      await db().prepare('INSERT OR IGNORE INTO zoom_pending_participants(event_key,lesson_id,occurrence,participant,zoom_user_hash,display_name,kind,at_ms,joined_ms) VALUES(?,?,?,?,?,?,?,?,?)').run(pendingKey,Number(meeting.lesson_id),occurrence,participantKey,stableHash,name,kind,at,joined)
      return {event:body.event,reason:'unmatched_identity',lessonId:Number(meeting.lesson_id),emailPresent:typeof participant.email==='string'&&!!participant.email,stableIdentityPresent:!!stableHash}
    }
  }
  const key=hash([meeting.lesson_id,occurrence,actor,participantKey,kind,at].join(':'))
  await db().prepare('INSERT OR IGNORE INTO zoom_attendance_events(event_key,lesson_id,actor,participant,occurrence,kind,at_ms,joined_ms) VALUES(?,?,?,?,?,?,?,?)').run(key,Number(meeting.lesson_id),actor,participantKey,occurrence,kind,at,joined)
  await refreshLessonAttendance(Number(meeting.lesson_id))
  return {event:body.event,reason:'recorded',lessonId:Number(meeting.lesson_id)}
}

export async function refreshLessonAttendance(lessonId:number) {
 const lesson=await db().prepare('SELECT start,duration FROM lessons WHERE id=?').get(lessonId)
 if(!lesson)return
 const start=Date.parse(String(lesson.start)),end=start+Number(lesson.duration)*60000
  const events=await db().prepare('SELECT actor,participant,occurrence,kind,at_ms,joined_ms FROM zoom_attendance_events WHERE lesson_id=?').all(lessonId) as unknown as AttendanceEvent[]
  const intervals=presenceIntervals(events,'teacher')
  const first=intervals.length ? Math.min(...intervals.map(i=>i[0])) : null
  const last=intervals.length && intervals.every(i=>i[1]!==null) ? Math.max(...intervals.map(i=>i[1] as number)) : null
  // SQL derives the first arrival monotonically; delivery order cannot move it later.
  // Detailed pay calculations read the event log, not this compatibility summary.
  await db().batch([
    {sql:'UPDATE lessons SET joined=CASE WHEN ? IS NULL THEN joined WHEN joined IS NULL OR joined>? THEN ? ELSE joined END,left_at=? WHERE id=?',values:[first===null?null:new Date(first).toISOString(),first===null?null:new Date(first).toISOString(),first===null?null:new Date(first).toISOString(),last===null?null:new Date(last).toISOString(),lessonId]},
    {sql:"UPDATE lessons SET status='attended' WHERE id=? AND status='scheduled' AND ? > 0",values:[lessonId,presenceMinutes(presenceIntervals(events,'student'),start,end,Date.now())]},
  ])
}
