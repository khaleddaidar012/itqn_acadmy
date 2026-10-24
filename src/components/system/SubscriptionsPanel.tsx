'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Subscription = { id: string; student_name: string; plan_name: string; subject: string; starts: string; ends: string; total_sessions: number; used: number; absent: number; scheduled: number; amount: number; paid: number; currency: string }
type Receipt = { id: string; subscription_id: string; amount: number; method: string; reference: string; created: string }
type Plan = { id: string; nameAr: string; programName: string; price: number; currency: string; billingMonths?: number; subjects: string[] }
type Data = { manage: boolean; students: { id: number; name: string }[]; plans: Plan[]; subscriptions: Subscription[]; receipts: Receipt[]; now: string }
const methods: Record<string, string> = { vodafone_cash: 'فودافون كاش', instapay: 'إنستا باي', bank_transfer: 'تحويل بنكي', paypal: 'PayPal', cash: 'نقدي' }
const money = (value: number, currency: string) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(value / 100)
const date = (value: string) => new Date(value).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })

export default function SubscriptionsPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [planId, setPlanId] = useState('')
  const requestKeys = useRef(new Map<string, string>())
  const load = useCallback(async () => {
    const response = await fetch('/api/subscriptions', { cache: 'no-store' }), body = await response.json()
    if (!response.ok) throw new Error(body.error || 'تعذر تحميل الاشتراكات')
    setData(body)
  }, [])
  useEffect(() => { void load().catch(e => setError(e.message)); const timer = setInterval(() => void load().catch(e => setError(e.message)), 60000); return () => clearInterval(timer) }, [load])
  async function submit(event: React.FormEvent<HTMLFormElement>, action: string, subscriptionId?: string) {
    event.preventDefault(); if (busy) return
    const form = event.currentTarget, values = Object.fromEntries(new FormData(form).entries())
    const payload = { ...values, action, subscription_id: subscriptionId }
    const fingerprint = JSON.stringify(payload)
    if (!requestKeys.current.has(fingerprint)) requestKeys.current.set(fingerprint, crypto.randomUUID())
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, request_key: requestKeys.current.get(fingerprint) }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      await load(); form.reset(); setPlanId(''); requestKeys.current.delete(fingerprint)
      setNotice(action === 'create' ? 'تم تسجيل الاشتراك. سجّل السداد بعد التحقق من استلامه.' : 'تم تسجيل السداد وتحديث المتبقي.')
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  const selected = data?.plans.find(p => p.id === planId)
  return <div className="space-y-6">
    <section className="bg-white border rounded-2xl p-6"><h2 className="text-xl font-bold">الاشتراكات ورصيد الحصص</h2><p className="text-sm text-slate-600 leading-7 mt-3">الحضور والإلغاء المتأخر يستهلكان حصة. الإلغاء المسموح والتأجيل لا يستهلكان الرصيد. الغياب يظهر منفصلًا ولا يُخصم حاليًا. الحساب حسب مادة الباقة ومدة الحصة وفترتها؛ تعديل حالة الحصة يحدّث الرصيد تلقائيًا.</p><p className="text-sm text-slate-500 leading-7">هذه المرحلة للباقات الفردية. الرصيد للمتابعة ولا يمنع الجدولة أو يفعّل الحساب تلقائيًا. السداد اليدوي لا يشمل عمليات Paymob تلقائيًا.</p></section>
    {error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl">{notice}</p>}
    {!data && !error && <p role="status">جارٍ تحميل الاشتراكات…</p>}
    {data?.manage && <section className="bg-white border rounded-2xl p-6"><h3 className="font-bold text-lg mb-4">اشتراك جديد / تجديد لفترة جديدة</h3><form onSubmit={e => void submit(e, 'create')} className="grid sm:grid-cols-2 gap-4">
      <label>الطالب<select name="student_id" required className="system-input" defaultValue=""><option value="" disabled>اختر الطالب</option>{data.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>الباقة الفردية<select name="plan_id" required className="system-input" value={planId} onChange={e => setPlanId(e.target.value)}><option value="" disabled>اختر الباقة</option>{data.plans.map(p => <option key={p.id} value={p.id}>{p.programName} — {p.nameAr} ({money(Math.round(p.price * (p.billingMonths || 1) * 100), p.currency)})</option>)}</select></label>
      <label>بداية الفترة — بتوقيت القاهرة<input name="starts" type="date" required className="system-input" /></label><label>نهاية الفترة — هذا اليوم غير مشمول<input name="ends" type="date" required className="system-input" /></label>
      <label>المادة<select name="subject" key={planId} required className="system-input" defaultValue=""><option value="" disabled>اختر المادة</option>{selected?.subjects.map(s => <option key={s}>{s}</option>)}</select></label>
      {selected && <p className="sm:col-span-2 text-emerald-800">قيمة الاشتراك: {money(Math.round(selected.price * (selected.billingMonths || 1) * 100), selected.currency)} — يثبت السعر عند الحفظ.</p>}
      <p className="text-sm text-slate-500 sm:col-span-2">مثال: من ١ نوفمبر إلى ١ ديسمبر يشمل حصص نوفمبر فقط. لا يمكن تداخل اشتراكين لنفس الطالب والمادة.</p>
      <button disabled={busy} className="system-button sm:col-span-2">{busy ? 'جارٍ الحفظ…' : 'تسجيل الاشتراك'}</button>
    </form></section>}
    {data && !data.subscriptions.length && <p className="bg-white border rounded-2xl p-8 text-slate-500">لا توجد اشتراكات مسجلة بعد.</p>}
    {data?.subscriptions.map(s => { const remaining = s.total_sessions - s.used, due = s.amount - s.paid, expired = s.ends <= data.now; return <article key={s.id} className="bg-white rounded-2xl border p-6 space-y-4">
      <div><h3 className="text-lg font-bold">{s.student_name} — {s.plan_name}</h3><p className="text-sm text-slate-500 mt-2">{s.subject} • من {date(s.starts)} إلى {date(s.ends)} (النهاية غير مشمولة) • {expired ? 'انتهت الفترة' : s.starts > data.now ? 'لم تبدأ الفترة' : 'الفترة الحالية'}</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['الحصص المستهلكة', `${s.used} / ${s.total_sessions}`], ['الحصص المتبقية', remaining < 0 ? `تجاوز الرصيد بـ ${-remaining}` : remaining], ['السداد المسجل', money(s.paid, s.currency)], ['المتبقي للسداد', money(due, s.currency)]].map(([label, value]) => <p key={String(label)} className="bg-slate-50 rounded-xl p-4 text-sm">{label}<strong className="block text-xl mt-2">{value}</strong></p>)}</div>
      <p className="text-sm text-slate-500">حصص مجدولة: {s.scheduled} • غياب غير مخصوم: {s.absent}{s.scheduled > Math.max(0, remaining) ? ' • تنبيه: الجدول يتجاوز الرصيد المتبقي.' : ''}</p>
      {data.manage && due > 0 && <details><summary className="cursor-pointer text-emerald-800 font-bold">تسجيل سداد بعد مراجعة التحويل</summary><form onSubmit={e => void submit(e, 'receipt', s.id)} className="grid sm:grid-cols-2 gap-4 mt-4"><label>المبلغ ({s.currency})<input name="amount" type="number" min="0.01" max={due / 100} step="0.01" required className="system-input" /></label><label>طريقة السداد<select name="method" className="system-input">{Object.entries(methods).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="sm:col-span-2">مرجع التحويل / الإيصال<input name="reference" maxLength={200} required className="system-input" /></label><button disabled={busy} className="system-button sm:col-span-2">تأكيد استلام المبلغ وتسجيله</button></form></details>}
      <details><summary className="cursor-pointer text-sm">سجل السداد</summary><ul className="mt-3 space-y-3">{data.receipts.filter(r => r.subscription_id === s.id).map(r => <li key={r.id} className="border rounded-xl p-3 text-sm">{money(r.amount, s.currency)} • {methods[r.method] || r.method} • {date(r.created)}<p className="text-slate-500 break-all mt-1">مرجع: {r.reference}</p></li>)}</ul>{!data.receipts.some(r => r.subscription_id === s.id) && <p className="text-sm text-slate-500 mt-3">لم يُسجّل سداد بعد.</p>}</details>
    </article> })}
  </div>
}
