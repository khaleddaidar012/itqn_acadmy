'use client'
import {useState} from 'react'
import type {Lesson} from '@/lib/system/accounting'
export default function CompleteLesson({lesson,pages,busy,act}:{lesson:Lesson;pages:number;busy:boolean;act:(body:Record<string,unknown>)=>Promise<boolean>}) {
  const [open,setOpen]=useState(false)
  if(lesson.completed_at)return null
  return <div className="space-y-3"><button disabled={busy} className="system-button" onClick={()=>setOpen(!open)}>إنهاء الحصة</button>{open&&<form method="post" className="space-y-3 rounded-xl border p-4" onSubmit={async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget).entries());if(await act({...body,action:'completeLesson',id:lesson.id}))setOpen(false)}}>
    <label className="block text-sm">حضور الطالب<select name="status" className="system-input" defaultValue={lesson.status==='absent'?'absent':'attended'}><option value="attended">حضر</option><option value="absent">غاب</option></select></label>
    {lesson.subject==='حفظ القرآن'&&<label className="block text-sm">إجمالي الصفحات المتقنة حتى الآن من 604<input type="number" name="pages" min={0} max={604} step={1} required defaultValue={pages} className="system-input" /></label>}
    <label className="block text-sm">تقدم الطالب وما تم في الحصة<textarea name="note" required maxLength={2000} className="system-input" /></label>
    <label className="block text-sm">الواجب المطلوب من الطالب<textarea name="homework" required maxLength={2000} className="system-input" /></label>
    <p className="text-xs text-slate-500">يظهر التوثيق والواجب في حساب الطالب. بعد الحفظ تُعتمد ساعات الحصة ومستحقاتها. إغلاق نافذة Zoom يدويًا يظل بيدك.</p>
    <button disabled={busy} className="system-button">حفظ التقدم وإرسال الواجب وإنهاء الحصة</button>
  </form>}</div>
}
