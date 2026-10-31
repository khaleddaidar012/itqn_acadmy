import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db, rateLimit } from '@/lib/system/db'
import { allowed } from '@/lib/system/permissions'
import { ServiceError, serviceError } from '@/lib/system/service-http'
import { ensureMeeting, hostMeetingUrl, safeZoomUrl, reconcileMeeting } from '@/lib/zoom/meetings'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request:NextRequest) {
  try {
    if (request.headers.get('origin')!==request.nextUrl.origin) throw new ServiceError('مصدر الطلب غير مسموح',403)
    const user=await currentUser(); if(!user) throw new ServiceError('سجّل الدخول أولًا',401)
    const body=await request.json(); const id=Number(body.id)
    if(!Number.isSafeInteger(id) || id<1 || !['prepare','launch','reconcile'].includes(body.action)) throw new ServiceError('طلب غير صحيح')
    const lesson=await db().prepare('SELECT l.*,s.parent_id FROM lessons l JOIN users s ON s.id=l.student_id JOIN users t ON t.id=l.teacher_id WHERE l.id=? AND s.disabled=0 AND t.disabled=0').get(id)
    if(!lesson) throw new ServiceError('الحصة غير متاحة',404)
    if(lesson.workflow_version===1) throw new ServiceError('استخدم زر جهّز الحصة والصق رابط الاجتماع')
    if(body.action==='reconcile') {
      if(!allowed(user,'schedule_manage')) throw new ServiceError('مراجعة الاجتماع لمسؤول الجداول فقط',403)
      if(!await rateLimit('zoom-meeting:'+user.id)) throw new ServiceError('محاولات كثيرة',429)
      await reconcileMeeting({id,teacher_id:Number(lesson.teacher_id),start:String(lesson.start),duration:Number(lesson.duration)},String(body.meetingId||''))
      return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})
    }
    const teacher=user.role==='teacher' && user.can_teach===1 && lesson.teacher_id===user.id
    const student=user.role==='student' && lesson.student_id===user.id || user.role==='parent' && lesson.parent_id===user.id
    const prepare=body.action==='prepare' && (teacher || allowed(user,'schedule_manage'))
    if(!prepare && !(body.action==='launch' && (teacher || student))) throw new ServiceError('هذه الحصة ليست لك',403)
    const start=Date.parse(String(lesson.start)), end=start+Number(lesson.duration)*60000
    if(!['scheduled','attended','absent','late_cancelled'].includes(String(lesson.status)) || Date.now()>=end) throw new ServiceError('انتهت الحصة أو ألغيت')
    if(!prepare && Date.now()<start-300000) throw new ServiceError('الدخول متاح قبل الحصة بخمس دقائق')
    if(!await rateLimit('zoom-meeting:'+user.id)) throw new ServiceError('محاولات كثيرة. انتظر قليلًا.',429)
    const meeting=teacher || prepare ? await ensureMeeting({id,teacher_id:Number(lesson.teacher_id),subject:String(lesson.subject),start:String(lesson.start),duration:Number(lesson.duration)}) : await db().prepare("SELECT * FROM zoom_meetings WHERE lesson_id=? AND state='ready'").get(id)
    if(!meeting) throw new ServiceError('المعلم لم يجهز اجتماع الحصة بعد.',409)
    const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
    if(prepare) return NextResponse.json({ok:true},{headers})
    const url=teacher ? await hostMeetingUrl(user.id,String(meeting.meeting_id),String(meeting.host_id)) : safeZoomUrl(meeting.join_url)
    return NextResponse.json({url},{headers})
  } catch(error) {
    if(error instanceof ServiceError) return serviceError(error)
    return NextResponse.json({error:'تعذر الاتصال بـZoom. حاول لاحقًا.'},{status:502})
  }
}
