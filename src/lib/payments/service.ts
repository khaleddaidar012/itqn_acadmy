import { randomUUID, createHash } from 'node:crypto'
import { db, type User } from '@/lib/system/db'
import { INTL_PROGRAMS } from '@/data/pricing'
import { billingCountries } from './countries'
import { createIntention, transactionSignatureInput, type PaymobConfig } from './paymob'

export class PaymentError extends Error { constructor(message: string, public status = 400) { super(message) } }
type Order = { id:string; student_id:number; amount:number; currency:string; status:string; provider_order_id:string; integration_ids:string; mode:string; transaction_id:string | null }
export async function startPayment(user: User, market: { region:string; country:string }, body: Record<string, unknown>, config: PaymobConfig) {
  if (user.role !== 'student') throw new PaymentError('الدفع من حساب الطالب فقط',403)
  if (market.region !== 'INTL') throw new PaymentError('الدفع الدولي متاح للباقات الدولية فقط',403)
  const plan = INTL_PROGRAMS.flatMap(p=>p.plans).find(p=>p.id === body.plan_id)
  if (!plan || plan.currency !== 'USD') throw new PaymentError('الباقة غير متاحة لبلد اتصالك')
  const phone = String(body.phone || '').trim(); const city=String(body.city || '').trim(); const address=String(body.address || '').trim()
  const country = String(body.billing_country || '').trim().toUpperCase()
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || city.length<2 || city.length>100 || address.length<3 || address.length>200 || !billingCountries.some(c=>c.iso3===country)) throw new PaymentError('أكمل رقم الهاتف الدولي والمدينة والعنوان وبلد الفاتورة')
  const key=String(body.request_key || ''); if (!/^[a-f0-9-]{36}$/i.test(key)) throw new PaymentError('مرجع الطلب غير صحيح')
  const id=randomUUID(); const created=new Date().toISOString()
  const amount=Math.round(plan.price * (plan.billingMonths || 1) * 100)
  await db().prepare('INSERT INTO payment_orders(id,student_id,request_key,plan_id,plan_name,amount,currency,country,mode,integration_ids,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,request_key) DO NOTHING').run(id,user.id,key,plan.id,body.locale==='en'?plan.nameEn:plan.nameAr,amount,'USD',market.country,config.mode,JSON.stringify(config.integrationIds),created,created)
  const stored=await db().prepare('SELECT id FROM payment_orders WHERE student_id=? AND request_key=?').get(user.id,key)
  if (stored?.id !== id) throw new PaymentError('هذا الطلب موجود بالفعل. راجع سجل المدفوعات قبل المحاولة مجددًا.',409)
  const names=user.name.trim().split(/\s+/)
  let result
  try { result=await createIntention(config,{id,amount,planName:plan.nameEn,firstName:names[0],lastName:names.slice(1).join(' ') || names[0],email:user.email,phone,country,city,address,locale:body.locale==='en'?'en':'ar'}) }
  catch { await db().prepare("UPDATE payment_orders SET status='failed',updated=? WHERE id=? AND status='created'").run(new Date().toISOString(),id); throw new PaymentError('تعذر فتح صفحة الدفع. لم نؤكد أي دفعة؛ راجع سجل المدفوعات قبل إعادة المحاولة.',502) }
  await db().prepare("UPDATE payment_orders SET provider_order_id=?,intention_id=?,status=CASE WHEN status='created' THEN 'pending' ELSE status END,updated=? WHERE id=?").run(result.providerOrderId,result.intentionId,new Date().toISOString(),id)
  return { order_id:id, checkout_url:result.checkoutUrl, amount, currency:'USD', mode:config.mode }
}

export async function recordTransaction(obj: Record<string, unknown>, config: PaymobConfig) {
  const providerOrderId = String((obj.order as Record<string,unknown>)?.id || '')
  const order = await db().prepare('SELECT * FROM payment_orders WHERE provider_order_id=?').get(providerOrderId) as unknown as Order | undefined
  if (!order) throw new PaymentError('Unknown payment order',404)
  if (order.amount !== obj.amount_cents || order.currency !== obj.currency || order.mode !== config.mode || !JSON.parse(order.integration_ids).includes(obj.integration_id) || !config.integrationIds.includes(Number(obj.integration_id))) throw new PaymentError('Payment amount, currency or integration mismatch',409)
  if (typeof obj.id !== 'number' || !Number.isSafeInteger(obj.id) || obj.id<1) throw new PaymentError('Invalid transaction')
  const booleans=['success','pending','error_occured','is_auth','is_capture','is_standalone_payment','is_refunded','is_voided','has_parent_transaction']
  if (booleans.some(key=>typeof obj[key] !== 'boolean')) throw new PaymentError('Invalid transaction flags')
  const transactionId=String(obj.id)
  const review=obj.is_refunded || obj.is_voided || obj.has_parent_transaction
  const paid=obj.success === true && obj.pending === false && obj.error_occured === false && obj.is_auth === false && !review && (obj.is_standalone_payment === true || obj.is_capture === true)
  const state=review?'review':paid?'paid':obj.pending || obj.is_auth?'pending':'failed'
  const eventId=createHash('sha256').update(transactionSignatureInput(obj)).digest('hex')
  const created=new Date().toISOString()
  await db().batch([
    {sql:'INSERT INTO payment_events(id,order_id,transaction_id,state,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING',values:[eventId,order.id,transactionId,state,created]},
    {sql:`UPDATE payment_orders SET
      status=CASE WHEN status='review' THEN status WHEN ?='review' AND status='paid' AND transaction_id=? THEN 'review' WHEN status='paid' AND ?='paid' AND transaction_id<>? THEN 'review' WHEN status='paid' THEN status WHEN ?='review' THEN 'review' ELSE ? END,
      transaction_id=CASE WHEN status IN ('paid','review') THEN transaction_id WHEN ?='paid' THEN ? ELSE transaction_id END,
      paid_at=CASE WHEN ?='paid' AND paid_at IS NULL THEN ? ELSE paid_at END, updated=?
      WHERE id=?`,values:[state,transactionId,state,transactionId,state,state,state,transactionId,state,created,created,order.id]},
  ])
  // Payment never activates enrollment automatically. Administration confirms
  // subscriptions after checking the paid order (and the sibling package).
}
