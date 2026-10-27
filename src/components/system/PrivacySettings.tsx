'use client'
import { useEffect, useState } from 'react'
type Closure = { student_id: number; name: string; email: string; closed_at: string; purge_at: string; purged_at: string | null }
export default function PrivacySettings({ userId, admin, locale, students = [] }: { userId: number; admin: boolean; locale: string; students?: {id:number;name:string;email:string}[] }) {
  const [closures, setClosures] = useState<Closure[]>([]), [error,setError] = useState(''), [busy,setBusy] = useState(false)
  const load = async () => { const r=await fetch('/api/privacy',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error);setClosures(data.closures) }
  useEffect(()=>{if(admin)void load().catch(e=>setError(e.message))},[admin])
  const when = (date:string)=>new Date(date).toLocaleString('ar-EG',{timeZone:'Africa/Cairo'})
  async function close(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id=admin ? Number(new FormData(event.currentTarget).get('student_id')) : userId
    if(!window.confirm('تأكيد إغلاق حساب الطالب؟ سيتوقف الدخول وتُلغى الحصص المستقبلية غير المبدوءة وتُسحب روابط التقارير. تبدأ سنة الاحتفاظ الآن، ثم تُحذف بيانات الطالب وحصصه نهائيًا. راجع الأرصدة والالتزامات قبل المتابعة.'))return
    setBusy(true);setError('')
    try{const r=await fetch('/api/privacy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_id:id,confirm:true})});const data=await r.json();if(!r.ok)throw new Error(data.error);if(admin){await load();window.location.reload()}else window.location.replace(`/${locale}/login?closed=1`)}catch(e){setError(e instanceof Error?e.message:'تعذر إغلاق الحساب')}finally{setBusy(false)}
  }
  return <section className="bg-white rounded-2xl border p-6 my-6" dir="rtl"><h2 className="text-xl font-bold">خصوصية الحساب وإغلاقه</h2><p className="text-sm text-slate-600 leading-7 mt-3">إغلاق الحساب يوقف الدخول فورًا. تُحفظ بيانات الطالب والحصص والحضور سنة تقويمية من تاريخ الإغلاق، ثم يحذفها الخادم بفحص دوري كل ساعة. تبقى إجماليات المعلمين الشهرية بلا اسم أو معرف طالب أو تفاصيل حصة. النسخ المحمّلة على أجهزة الإدارة مسؤولية الإدارة.</p><a className="text-emerald-800 underline block my-3" href={`/${locale}/privacy`}>سياسة الخصوصية وطلبات البيانات</a><form method="post" onSubmit={close} className="flex flex-wrap gap-3 items-end">{admin&&<label>حساب الطالب<select required name="student_id" defaultValue="" className="system-input"><option value="" disabled>اختر الطالب</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}</select></label>}<button disabled={busy} className="border border-red-300 text-red-800 rounded-xl px-4 py-3">{busy?'جارٍ التنفيذ…':admin?'إغلاق حساب الطالب':'إغلاق حسابي'}</button></form>{error&&<p role="alert" className="text-red-700 mt-3">{error}</p>}{admin&&<><p className="mt-5 text-sm">سجل الإغلاق — لا تُعاد بداية السنة بتكرار الطلب، ولا تُؤرّخ الحسابات القديمة بأثر رجعي.</p><ul className="mt-3 space-y-3">{closures.map(c=><li key={c.student_id} className="border rounded-xl p-3 text-sm"><strong>{c.name}</strong>{!c.purged_at&&<p>{c.email}</p>}<p>الإغلاق: {when(c.closed_at)}</p><p>{c.purged_at?`نُفذ الحذف: ${when(c.purged_at)}`:`موعد الحذف: ${when(c.purge_at)}`}</p></li>)}</ul>{!closures.length&&<p className="text-slate-500 mt-3">لا توجد حسابات أُغلقت بهذه الآلية.</p>}</>}</section>
}
