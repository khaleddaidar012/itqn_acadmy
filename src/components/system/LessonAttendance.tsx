'use client'
import type { Lesson } from '@/lib/system/accounting'
export default function LessonAttendance({ lesson, now = Date.now(), who }: { lesson: Lesson; now?: number; who?: 'student' | 'teacher' }) {
  const excluded = ['cancelled','postponed','late_cancelled'].includes(lesson.status)
  const start = Date.parse(lesson.start); const end = start + lesson.duration * 60000
  const recorded = lesson.teacher_attended ?? !!lesson.joined
  const neutral = 'bg-slate-100 text-slate-500'
  const student = excluded ? { label:'لا ينطبق', style:neutral } : lesson.status === 'attended' ? { label:'حضر', style:'bg-emerald-50 text-emerald-800' } : lesson.status === 'absent' ? { label:'غاب', style:'bg-red-50 text-red-700' } : { label: now < start ? 'لم تبدأ الحصة' : 'لم يُسجل بعد', style:now < start ? neutral : 'bg-amber-50 text-amber-800' }
  const teacher = excluded ? { label:'لا ينطبق', style:neutral } : recorded ? { label: now < start ? 'سجّل الدخول مبكرًا' : 'سجّل حضوره', style:'bg-emerald-50 text-emerald-800' } : { label: now < start ? 'لم تبدأ الحصة' : now >= end ? 'لم يسجّل الحضور' : 'لم يدخل بعد', style: now < start ? neutral : now >= end ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800' }
  const badge = (person: 'student' | 'teacher') => { const state = person === 'student' ? student : teacher; return <span title={lesson.zoom_meeting ? 'حضور Zoom، مع إمكانية مراجعة حضور الطالب بواسطة المعلم أو الإدارة' : person === 'student' ? 'حسب تسجيل حضور الطالب بواسطة المعلم أو الإدارة' : 'حسب تسجيل دخول المعلم في النظام'} className={'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap ' + state.style}><span>{person === 'student' ? 'الطالب:' : 'المعلم:'}</span><strong>{state.label}</strong></span> }
  return who ? badge(who) : <div className="flex flex-wrap gap-2" aria-label="حضور الطالب والمعلم">{badge('student')}{badge('teacher')}</div>
}
