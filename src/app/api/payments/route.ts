import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/system/auth'
import { db, rateLimit } from '@/lib/system/db'
import { visitorMarket } from '@/lib/market/server'
import { paymobConfig } from '@/lib/payments/paymob'
import { PaymentError, startPayment } from '@/lib/payments/service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store'}
export async function GET(request: NextRequest) {
  const config=paymobConfig(); const user=await currentUser()
  if (!user) return NextResponse.json({available:!!config,mode:config?.mode || null,authenticated:false,orders:[]},{headers})
  const id=request.nextUrl.searchParams.get('order')
  const fields='p.id,p.student_id,p.plan_name,p.amount,p.currency,p.status,p.mode,p.created,p.paid_at,u.name AS student_name'
  const sql=`SELECT ${fields} FROM payment_orders p JOIN users u ON u.id=p.student_id WHERE `
  const orders = id
    ? await db().prepare(sql+(user.role==='admin'?'p.id=?':'p.id=? AND p.student_id=?')+' ORDER BY p.created DESC').all(...(user.role==='admin'?[id]:[id,user.id]))
    : user.role==='admin' ? await db().prepare(sql+'1=1 ORDER BY p.created DESC LIMIT 200').all() : user.role==='student' ? await db().prepare(sql+'p.student_id=? ORDER BY p.created DESC LIMIT 100').all(user.id) : []
  return NextResponse.json({available:!!config,mode:config?.mode || null,authenticated:true,role:user.role,orders},{headers})
}
export async function POST(request: NextRequest) {
  try {
    if(request.headers.get('origin') !== request.nextUrl.origin) throw new PaymentError('طلب غير مسموح',403)
    const user=await currentUser(); if(!user) throw new PaymentError('سجل الدخول بحساب الطالب أولًا',401)
    if(user.role !== 'student') throw new PaymentError('الدفع من حساب الطالب فقط',403)
    const market=await visitorMarket(); if(!market) throw new PaymentError('تعذر التحقق من بلد اتصالك. أعد المحاولة.',503)
    if(market.region !== 'INTL') throw new PaymentError('هذه البوابة مخصصة للباقات الدولية',403)
    const config=paymobConfig(); if(!config) throw new PaymentError('الدفع الإلكتروني الدولي قيد التفعيل. حاول لاحقًا.',503)
    if(!await rateLimit('payment:'+user.id)) throw new PaymentError('محاولات كثيرة. انتظر قليلًا.',429)
    const raw=await request.text(); if(raw.length>8192) throw new PaymentError('طلب غير صحيح',413)
    let body; try {body=JSON.parse(raw)} catch {throw new PaymentError('طلب غير صحيح')}
    if(!body || typeof body !== 'object' || Array.isArray(body)) throw new PaymentError('طلب غير صحيح')
    return NextResponse.json(await startPayment(user,market,body,config),{headers})
  } catch(error) {return NextResponse.json({error:error instanceof PaymentError ? error.message : 'تعذر تجهيز الدفع. راجع سجل المدفوعات قبل المحاولة مجددًا.'},{status:error instanceof PaymentError ? error.status : 500,headers})}
}
