import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db, rateLimit, type User } from '@/lib/system/db'
import { allowed } from '@/lib/system/permissions'
import { ServiceError, serviceError } from '@/lib/system/service-http'
import { refreshLessonAttendance } from '@/lib/zoom/events'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
async function access(user:User|undefined,id:number) {
  if(!user)throw new ServiceError('سجّل الدخول أولًا',401)
  if(!Number.isSafeInteger(id)||id<1)throw new ServiceError('الحصة غير صحيحة')
  const lesson=await db().prepare('SELECT id,teacher_id,student_id FROM lessons WHERE id=?').get(id)
  if(!lesson)throw new ServiceError('الحصة غير موجودة',404)
  if(!allowed(user,'attendance_manage') && !(user.role==='teacher'&&user.can_teach===1&&lesson.teacher_id===user.id))throw new ServiceError('مراجعة المشاركين لمعلم الحصة أو مسؤول الحضور فقط',403)
  return lesson
}
export async function GET(request:NextRequest) {
  try {
    const user=await currentUser(),id=Number(request.nextUrl.searchParams.get('lesson'))
    await access(user,id)
    const participants=await db().prepare(`SELECT occurrence,participant,MAX(display_name) AS name,MIN(at_ms) AS first_seen,
      MAX(CASE WHEN zoom_user_hash IS NOT NULL THEN 1 ELSE 0 END) AS has_account
      FROM zoom_pending_participants WHERE lesson_id=? AND resolved_student_id IS NULL GROUP BY occurrence,participant ORDER BY first_seen LIMIT 30`).all(id)
    return NextResponse.json({participants,canRemember:allowed(user!,'students_manage')},{headers})
  }catch(error){return serviceError(error)}
}
export async function POST(request:NextRequest) {
  try {
    if(request.headers.get('origin')!==request.nextUrl.origin)throw new ServiceError('مصدر الطلب غير مسموح',403)
    const user=await currentUser(),raw=await request.text()
    if(raw.length>1024)throw new ServiceError('طلب كبير جدًا',413)
    let body;try{body=JSON.parse(raw)}catch{throw new ServiceError('طلب غير صحيح')}
    const id=Number(body?.id),lesson=await access(user,id)
    if(!/^[a-f0-9]{64}$/.test(body.participant)||!/^[a-f0-9]{64}$/.test(body.occurrence))throw new ServiceError('مشارك غير صحيح')
    if(body.remember===true&&!allowed(user!,'students_manage'))throw new ServiceError('حفظ ربط الحساب الدائم لإدارة الطلاب فقط',403)
    if(!await rateLimit('zoom-participant:'+user!.id))throw new ServiceError('محاولات كثيرة',429)
    const rows=await db().prepare('SELECT * FROM zoom_pending_participants WHERE lesson_id=? AND occurrence=? AND participant=? ORDER BY at_ms LIMIT 500').all(id,body.occurrence,body.participant)
    if(!rows.length)throw new ServiceError('لا يوجد إشعار دخول محفوظ لهذا المشارك',404)
    const queries=[]
    if(body.remember===true) {
      const stable=[...new Set(rows.map(r=>r.zoom_user_hash).filter(Boolean))]
      if(stable.length!==1)throw new ServiceError('هذا المشارك دخل كضيف أو هويته غير ثابتة. يمكن تأكيد هذه الحصة فقط.',409)
      const existing=await db().prepare('SELECT student_id FROM zoom_student_links WHERE zoom_user_hash=?').get(String(stable[0]))
      if(existing&&existing.student_id!==lesson.student_id)throw new ServiceError('حساب Zoom مربوط بالفعل بطالب آخر',409)
      queries.push({sql:'INSERT INTO zoom_student_links(student_id,zoom_user_hash,verified_by,verified_at,lesson_id) VALUES(?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET zoom_user_hash=excluded.zoom_user_hash,verified_by=excluded.verified_by,verified_at=excluded.verified_at,lesson_id=excluded.lesson_id',values:[Number(lesson.student_id),String(stable[0]),user!.id,new Date().toISOString(),id]})
    }
    for(const row of rows)queries.push({sql:"INSERT OR IGNORE INTO zoom_attendance_events(event_key,lesson_id,actor,participant,occurrence,kind,at_ms,joined_ms) VALUES(?,?,'student',?,?,?,?,?)",values:[String(row.event_key),id,String(row.participant),String(row.occurrence),String(row.kind),Number(row.at_ms),row.joined_ms===null?null:Number(row.joined_ms)]})
    queries.push({sql:'UPDATE zoom_pending_participants SET resolved_student_id=? WHERE lesson_id=? AND occurrence=? AND participant=?',values:[Number(lesson.student_id),id,body.occurrence,body.participant]})
    await db().batch(queries)
    await refreshLessonAttendance(id)
    return NextResponse.json({ok:true,remembered:body.remember===true},{headers})
  }catch(error){
    if(error instanceof Error&&error.message.includes('zoom_student_links.zoom_user_hash'))return NextResponse.json({error:'حساب Zoom مربوط بالفعل بطالب آخر'},{status:409,headers})
    return serviceError(error)
  }
}
