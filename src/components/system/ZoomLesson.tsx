'use client'
import { useState } from 'react'
export default function ZoomLesson({id,teacher,canPrepare,canReview,canJoin,open,ended,onChange}:{id:number;teacher:boolean;canPrepare:boolean;canReview:boolean;canJoin:boolean;open:boolean;ended:boolean;onChange:()=>void}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [ready,setReady]=useState(false)
  const [meetingId,setMeetingId]=useState('')
  async function request(action:'prepare'|'launch'|'reconcile') {
    const popup=action==='launch' ? window.open('about:blank','_blank') : null
    if(popup) popup.opener=null
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/zoom/meeting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,meetingId})})
      const result=await response.json();if(!response.ok)throw Error(result.error||'تعذر فتح Zoom')
      if(action==='launch') {
        if(!popup) throw Error('اسمح بفتح نافذة جديدة، ثم اضغط دخول Zoom مرة أخرى.')
        popup.location.replace(result.url)
      } else setReady(true)
      onChange()
    }catch(error){popup?.close();setError(error instanceof Error?error.message:'تعذر الاتصال')}finally{setBusy(false)}
  }
  if(ended) return null
  return <div className="space-y-2 text-sm">
    <div className="flex gap-2 flex-wrap">
      {canPrepare && !open && <button disabled={busy||ready} className="system-button" onClick={()=>void request('prepare')}>{busy?'جارٍ تجهيز Zoom…':ready?'اجتماع Zoom جاهز':'تجهيز اجتماع Zoom'}</button>}
      {canJoin && open && <button disabled={busy} className="system-button" onClick={()=>void request('launch')}>{busy?'جارٍ فتح Zoom…':teacher?'بدء الحصة على Zoom':'دخول الحصة على Zoom'}</button>}
    </div>
    {open && canJoin && <p className="text-xs text-slate-500">{teacher?'الحضور والوقت يسجلان من دخولك وخروجك الفعلي في Zoom، وليس من الضغط على الزر.':'ادخل Zoom بنفس بريد الطالب المسجل بالأكاديمية حتى يمكن مطابقة حضورك تلقائيًا.'}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {error && canReview && <details><summary className="cursor-pointer">مراجعة اجتماع أُنشئ في Zoom ولم يُحفظ بالموقع</summary><p className="text-xs text-slate-500 mt-2">افتح اجتماعات المعلم في Zoom، وانسخ رقم الاجتماع الذي يحمل في وصفه رقم هذه الحصة. سيتم التحقق من المعلم والموعد قبل ربطه.</p><label className="block mt-2">رقم الاجتماع<input inputMode="numeric" value={meetingId} onChange={e=>setMeetingId(e.target.value.replace(/\D/g,''))} className="system-input" /></label><button disabled={busy||!meetingId} className="system-button mt-2" onClick={()=>void request('reconcile')}>التحقق وربط الاجتماع الموجود</button></details>}
  </div>
}
