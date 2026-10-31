import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db, rateLimit } from '@/lib/system/db'
import { participantZoomUrl, lessonAvailable } from '@/lib/system/lesson-workflow'
import { ServiceError, serviceError } from '@/lib/system/service-http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new ServiceError('مصدر الطلب غير مسموح',403)
    const user = await currentUser(); if (!user) throw new ServiceError('سجّل الدخول أولًا',401)
    const body = await request.json(), id = Number(body.id)
    if (!Number.isSafeInteger(id) || id < 1 || !['prepare','saveLink','launch'].includes(body.action)) throw new ServiceError('طلب غير صحيح')
    const lesson = await db().prepare('SELECT l.*,s.parent_id FROM lessons l JOIN users s ON s.id=l.student_id JOIN users t ON t.id=l.teacher_id WHERE l.id=? AND s.disabled=0 AND t.disabled=0').get(id)
    if (!lesson || lesson.workflow_version !== 1) throw new ServiceError('الحصة غير متاحة',404)
    const teacher = user.role === 'teacher' && user.can_teach === 1 && lesson.teacher_id === user.id
    const student = user.role === 'student' && lesson.student_id === user.id || user.role === 'parent' && lesson.parent_id === user.id
    if (!(body.action === 'launch' ? teacher || student : teacher)) throw new ServiceError('هذه الحصة ليست لك',403)
    if (!lessonAvailable({status:String(lesson.status),start:String(lesson.start),completed_at:lesson.completed_at as string|null})) throw new ServiceError('التجهيز والدخول متاحان قبل الحصة بخمس دقائق وحتى إنهائها')
    if (!await rateLimit('lesson-link:'+user.id)) throw new ServiceError('محاولات كثيرة. انتظر قليلًا.',429)
    const headers = {'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
    if (body.action === 'prepare') {
      await db().prepare('UPDATE lessons SET prepared_at=COALESCE(prepared_at,?) WHERE id=? AND completed_at IS NULL').run(new Date().toISOString(),id)
      return NextResponse.json({url:'https://zoom.us/start/videomeeting'},{headers})
    }
    if (body.action === 'saveLink') {
      if (!lesson.prepared_at) throw new ServiceError('اضغط جهّز الحصة أولًا')
      let link: string
      try { link = participantZoomUrl(body.url) } catch(error) { throw new ServiceError((error as Error).message) }
      await db().prepare('UPDATE lessons SET meeting_link=?,joined=COALESCE(joined,?) WHERE id=? AND completed_at IS NULL').run(link,new Date().toISOString(),id)
      return NextResponse.json({ok:true},{headers})
    }
    if (!lesson.meeting_link) throw new ServiceError('المعلم لم يضف رابط الحصة بعد',409)
    // Clicking a participant link is not evidence of actual Zoom attendance.
    return NextResponse.json({url:participantZoomUrl(lesson.meeting_link)},{headers})
  } catch(error) {
    if (error instanceof ServiceError) return serviceError(error)
    return NextResponse.json({error:'تعذر تجهيز الحصة. حاول مجددًا.'},{status:500})
  }
}
