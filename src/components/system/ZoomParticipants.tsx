'use client'
import { useCallback, useEffect, useState } from 'react'
type Participant={occurrence:string;participant:string;name:string;first_seen:number;has_account:number}
export default function ZoomParticipants({lessonId,studentName,onChange}:{lessonId:number;studentName:string;onChange:()=>void}) {
  const [data,setData]=useState<{participants:Participant[];canRemember:boolean}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const load=useCallback(async()=>{const r=await fetch('/api/zoom/participants?lesson='+lessonId,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setData(d)},[lessonId])
  useEffect(()=>{void load().catch(e=>setError(e.message));const timer=setInterval(()=>void load().catch(()=>{}),30000);return()=>clearInterval(timer)},[load])
  async function confirm(p:Participant,remember:boolean) {
    if(!window.confirm(`هل تأكدت أن المشارك «${p.name}» هو الطالب «${studentName}»؟${remember?' سيتم حفظ حساب Zoom لهذا الطالب للحصص القادمة.':''}`))return
    setBusy(true);setError('')
    try{const r=await fetch('/api/zoom/participants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:lessonId,participant:p.participant,occurrence:p.occurrence,remember})});const d=await r.json();if(!r.ok)throw Error(d.error);await load();onChange()}catch(e){setError(e instanceof Error?e.message:'تعذر التأكيد')}finally{setBusy(false)}
  }
  if(!data?.participants.length&&!error)return null
  return <section className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm space-y-3"><h4 className="font-bold">مشاركون يحتاجون مراجعة الهوية</h4><p>Zoom لم يرسل هوية مطابقة للطالب. تأكد من الشخص داخل الاجتماع قبل تأكيد حضوره؛ الاسم وحده ليس إثباتًا.</p>{data?.participants.map(p=><div key={p.occurrence+p.participant} className="border-t border-amber-200 pt-3 space-y-2"><p className="font-bold">{p.name||'مشارك بدون اسم'}</p><p className="text-xs">ظهر في Zoom: {new Date(p.first_seen).toLocaleTimeString('ar-EG',{timeZone:'Africa/Cairo'})} • {p.has_account?'حساب Zoom بمعرّف ثابت':'ضيف — التأكيد لهذه الحصة فقط'}</p><div className="flex gap-2 flex-wrap"><button disabled={busy} className="system-button" onClick={()=>void confirm(p,false)}>تأكيد أنه الطالب في هذه الحصة</button>{data.canRemember&&!!p.has_account&&<button disabled={busy} className="border rounded-xl px-3 py-2 bg-white" onClick={()=>void confirm(p,true)}>تأكيد وحفظ حساب Zoom للطالب</button>}</div></div>)}{error&&<p role="alert" className="text-red-700">{error}</p>}</section>
}
