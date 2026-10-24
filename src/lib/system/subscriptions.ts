import { EGYPT_PROGRAMS, INTL_PROGRAMS } from '@/data/pricing'
import { db } from './db'
const subjects: Record<string, string> = { memorization: 'حفظ القرآن', tajweed: 'التجويد', arabic: 'اللغة العربية' }
export const subscriptionPlans = [...EGYPT_PROGRAMS, ...INTL_PROGRAMS].flatMap(program => program.plans
  .filter(plan => plan.studentsCount === 1 && (subjects[program.id] || program.id === 'intl-classes'))
  .map(plan => ({ ...plan, subjects: subjects[program.id] ? [subjects[program.id]] : ['حفظ القرآن', 'التجويد'], programName: program.titleAr })))

export async function subscriptionRows(where: string, values: (string | number)[]) {
  return db().prepare(`SELECT s.*,u.name AS student_name,
    COALESCE((SELECT SUM(r.amount) FROM subscription_receipts r WHERE r.subscription_id=s.id),0) AS paid,
    (SELECT COUNT(*) FROM lessons l WHERE l.student_id=s.student_id AND l.subject=s.subject
      AND l.start>=s.starts AND l.start<s.ends AND (s.duration IS NULL OR l.duration=s.duration)
      AND l.status IN ('attended','late_cancelled')) AS used,
    (SELECT COUNT(*) FROM lessons l WHERE l.student_id=s.student_id AND l.subject=s.subject
      AND l.start>=s.starts AND l.start<s.ends AND (s.duration IS NULL OR l.duration=s.duration)
      AND l.status='absent') AS absent,
    (SELECT COUNT(*) FROM lessons l WHERE l.student_id=s.student_id AND l.subject=s.subject
      AND l.start>=s.starts AND l.start<s.ends AND (s.duration IS NULL OR l.duration=s.duration)
      AND l.status='scheduled') AS scheduled
    FROM student_subscriptions s JOIN users u ON u.id=s.student_id WHERE ${where} ORDER BY s.starts DESC`).all(...values)
}
