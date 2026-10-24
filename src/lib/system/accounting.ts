import { presenceMinutes, type PresenceInterval } from '../zoom/attendance.ts'
export type Lesson = { id: number; teacher_id: number; student_id: number; subject: string; start: string; duration: number; status: string; joined: string | null; left_at: string | null; rate: number; currency: string; note: string; teacher_attended?: boolean; teacher_name?: string; student_name?: string; zoom_meeting?: boolean; zoom_intervals?: PresenceInterval[]; student_zoom_minutes?: number }
export function accounting(lesson: Lesson, now = Date.now()) {
  const start = Date.parse(lesson.start)
  const end = start + lesson.duration * 60000
  const joined = lesson.joined ? Date.parse(lesson.joined) : null
  const lateMinutes = joined === null ? 0 : Math.min(lesson.duration, Math.max(0, (joined - start) / 60000))
  const excluded = ['cancelled', 'postponed'].includes(lesson.status)
  const stop = Math.min(end, lesson.left_at ? Date.parse(lesson.left_at) : now, now)
  const minutes = excluded ? 0 : lesson.zoom_intervals !== undefined ? presenceMinutes(lesson.zoom_intervals,start,end,now) : joined === null ? 0 : Math.max(0, (stop - Math.max(start, joined)) / 60000)
  return { minutes, lateMinutes, lateDeduction: lesson.rate * lateMinutes / 60, earned: lesson.rate * minutes / 60, ended: now >= end }
}
