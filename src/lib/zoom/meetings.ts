import { db } from '@/lib/system/db'
import { ServiceError } from '@/lib/system/service-http'
import { callZoom, teacherToken as refreshTeacherToken, ZoomTransportError } from './transport'
import { zoomConfiguration, type ZoomConfig } from './client'
import { queueMeetingEnd } from './auto-end'

export function meetingConfiguration() {
  const { config } = zoomConfiguration()
  if (!config) throw new ServiceError('إعداد Zoom غير مكتمل. راجع الإدارة.',503)
  return config
}
export async function teacherToken(teacherId:number,config:ZoomConfig,force=false) {
 try { return await refreshTeacherToken(teacherId,config,force,db()) } catch(error) { if(error instanceof ZoomTransportError)throw new ServiceError(error.message,error.status);throw error }
}
async function api(teacherId:number,config:ZoomConfig,path:string,init:RequestInit={}) {
 try { return await callZoom(teacherId,config,path,init,db()) } catch(error) { if(error instanceof ZoomTransportError)throw new ServiceError(error.message,error.status);throw error }
}
export function safeZoomUrl(value: unknown) {
  if (typeof value !== 'string') throw new ServiceError('رابط الاجتماع غير مكتمل.',502)
  const url = new URL(value)
  if (url.protocol!=='https:' || url.port || url.username || url.password || !(url.hostname==='zoom.us' || url.hostname.endsWith('.zoom.us'))) throw new ServiceError('رابط اجتماع غير موثوق.',502)
  return url.toString()
}
export async function ensureMeeting(lesson: {id:number;teacher_id:number;subject:string;start:string;duration:number}) {
  const config = meetingConfiguration()
  let stored = await db().prepare('SELECT * FROM zoom_meetings WHERE lesson_id=?').get(lesson.id)
  if (stored?.state==='ready') { await queueMeetingEnd(db(),lesson.id,lesson.start,lesson.duration); return stored }
  if (stored) throw new ServiceError('إنشاء الاجتماع قيد المراجعة. لا تنشئ اجتماعًا ثانيًا؛ تواصل مع الإدارة.',409)
  if((await db().prepare('SELECT joined FROM lessons WHERE id=?').get(lesson.id))?.joined) throw new ServiceError('هذه الحصة بدأت بالتسجيل اليدوي. استكملها بالطريقة نفسها.',409)
  const auth = await teacherToken(lesson.teacher_id,config)
  const claim = await db().prepare("INSERT OR IGNORE INTO zoom_meetings(lesson_id,teacher_id,host_id,account_id,state,created) VALUES(?,?,?,?,'creating',?) RETURNING lesson_id").get(lesson.id,lesson.teacher_id,auth.connection.zoom_user_id,auth.connection.account_id,new Date().toISOString())
  if (!claim) throw new ServiceError('جارٍ تجهيز الاجتماع. أعد المحاولة بعد ثوانٍ.',409)
  // A timeout may mean Zoom created the meeting. Keep the reservation for reconciliation,
  // rather than blindly creating a duplicate and charging against the wrong meeting.
  try {
    const {response,connection} = await api(lesson.teacher_id,config,'/users/me/meetings',{method:'POST',body:JSON.stringify({topic:'ITQAN • '+lesson.subject,type:2,start_time:lesson.start,duration:lesson.duration,timezone:'UTC',agenda:'ITQAN lesson '+lesson.id,settings:{join_before_host:false,waiting_room:true,use_pmi:false,auto_recording:'none'}})})
    if (!response.ok) {
      if (response.status>=400 && response.status<500 && response.status!==408) await db().prepare("DELETE FROM zoom_meetings WHERE lesson_id=? AND state='creating'").run(lesson.id)
      throw new ServiceError(response.status===401 || response.status===403 ? 'أضف صلاحيات الاجتماعات في تطبيق Zoom ثم أعد ربط حساب المعلم.' : 'تعذر إنشاء اجتماع Zoom. راجع صلاحيات التطبيق وحساب المعلم.',502)
    }
    const data = await response.json()
    if (!/^\d+$/.test(String(data.id)) || data.host_id!==connection.zoom_user_id) throw new ServiceError('تعذر التحقق من مالك اجتماع Zoom.',502)
    const joinUrl = safeZoomUrl(data.join_url)
    const saved = await db().prepare("UPDATE zoom_meetings SET meeting_id=?,join_url=?,host_id=?,account_id=?,state='ready' WHERE lesson_id=? AND state='creating' RETURNING *").get(String(data.id),joinUrl,connection.zoom_user_id,connection.account_id,lesson.id)
    if (!saved) throw new ServiceError('تعذر حفظ اجتماع Zoom. راجع الإدارة قبل المحاولة مجددًا.',502)
    stored = saved
    await queueMeetingEnd(db(),lesson.id,lesson.start,lesson.duration)
    return stored
  } catch (error) {
    await db().prepare("UPDATE zoom_meetings SET state='uncertain' WHERE lesson_id=? AND state='creating'").run(lesson.id)
    if (error instanceof ServiceError) throw error
    throw new ServiceError('تعذر تأكيد إنشاء الاجتماع. راجع الإدارة لتجنب تكراره.',502)
  }
}
export async function hostMeetingUrl(teacherId:number, meetingId:string, expectedHost:string) {
  const {response,connection} = await api(teacherId,meetingConfiguration(),'/meetings/'+encodeURIComponent(meetingId))
  if (!response.ok) throw new ServiceError('تعذر فتح اجتماع Zoom. تأكد من صلاحية قراءة الاجتماعات وأعد ربط حسابك.',502)
  const data = await response.json()
  if (connection.zoom_user_id!==expectedHost || data.host_id!==expectedHost || String(data.id)!==meetingId) throw new ServiceError('هذا الاجتماع تابع لربط Zoom سابق. راجع الإدارة.',409)
  // start_url contains a host credential. Return only to the lesson's own teacher.
  return safeZoomUrl(data.start_url)
}
export async function reconcileMeeting(lesson:{id:number;teacher_id:number;start:string;duration:number},meetingId:string) {
  if(!/^\d{9,12}$/.test(meetingId)) throw new ServiceError('رقم اجتماع غير صحيح')
  const reserved=await db().prepare('SELECT * FROM zoom_meetings WHERE lesson_id=?').get(lesson.id)
  if(!reserved || reserved.state==='ready') throw new ServiceError('الحصة لا تحتاج مراجعة اجتماع',409)
  const {response,connection}=await api(lesson.teacher_id,meetingConfiguration(),'/meetings/'+meetingId)
  if(!response.ok) throw new ServiceError('تعذر قراءة الاجتماع من حساب المعلم',502)
  const data=await response.json()
  if(data.host_id!==connection.zoom_user_id || String(data.id)!==meetingId || data.agenda!=='ITQAN lesson '+lesson.id || Date.parse(data.start_time)!==Date.parse(lesson.start) || data.duration!==lesson.duration) throw new ServiceError('الاجتماع لا يطابق الحصة أو حساب معلمها',409)
  await db().prepare("UPDATE zoom_meetings SET meeting_id=?,join_url=?,host_id=?,account_id=?,state='ready' WHERE lesson_id=? AND state<>'ready'").run(meetingId,safeZoomUrl(data.join_url),connection.zoom_user_id,connection.account_id,lesson.id)
  await queueMeetingEnd(db(),lesson.id,lesson.start,lesson.duration)
}
