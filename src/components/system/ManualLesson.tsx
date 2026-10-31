'use client'
import {useState} from 'react'
import type {Lesson} from '@/lib/system/accounting'
export default function ManualLesson({lesson,teacher,canJoin,now,onChange}:{lesson:Lesson;teacher:boolean;canJoin:boolean;now:number;onChange:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[prepared,setPrepared]=useState(false)
  const available=now>=Date.parse(lesson.start)-300000 && !lesson.completed_at
  async function request(action:'prepare'|'saveLink'|'launch') {
    const popup=action!=='saveLink'?window.open('about:blank','_blank'):null
    if(popup)popup.opener=null
    if(action!=='saveLink'&&!popup){setError('اسمح بفتح نافذة جديدة ثم حاول مجددًا');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/lessons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:lesson.id,action,url})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      if(popup)popup.location.replace(result.url)
      if(action==='prepare')setPrepared(true)
      onChange()
    }catch(e){popup?.close();setError(e instanceof Error?e.message:'تعذر الاتصال')}finally{setBusy(false)}
  }
  if(lesson.completed_at)return <p className="text-emerald-800 text-sm font-semibold">تم إنهاء الحصة وتوثيقها</p>
  return <div className="space-y-3">
    {teacher&&<><button disabled={busy||!available} className="system-button disabled:opacity-40 disabled:cursor-not-allowed" onClick={()=>void request('prepare')}>جهّز الحصة</button>{!available&&<p className="text-xs text-slate-500">يتفعّل قبل موعد الحصة بـ٥ دقائق</p>}
      {(prepared||lesson.prepared_at)&&<form method="post" className="space-y-2 rounded-xl bg-slate-50 p-3" onSubmit={e=>{e.preventDefault();void request('saveLink')}}><label className="block text-sm">الصق رابط الحصة<input type="url" dir="ltr" required maxLength={2000} className="system-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…zoom.us/j/…" /></label><p className="text-xs text-slate-500">انسخ رابط دعوة المشاركين من اجتماع Zoom الجديد.</p><button disabled={busy||!available} className="system-button">أوك</button>{lesson.meeting_ready&&<p role="status" className="text-sm text-emerald-700">الرابط محفوظ، زر الدخول متاح للطالب</p>}</form>}
    </>}
    {canJoin&&<><button disabled={busy||!available||!lesson.meeting_ready} className="system-button disabled:opacity-40 disabled:cursor-not-allowed" onClick={()=>void request('launch')}>{teacher?'فتح رابط الحصة':'ادخل الحصة'}</button>{!teacher&&!lesson.meeting_ready&&<p className="text-xs text-slate-500">بانتظار المعلم لتجهيز رابط الحصة</p>}</>}
    {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
  </div>
}
