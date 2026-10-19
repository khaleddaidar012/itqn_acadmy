export const staffRules = `DROP TRIGGER IF EXISTS lesson_accounts_ready; CREATE TRIGGER lesson_accounts_ready BEFORE INSERT ON lessons
WHEN NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.teacher_id AND role='teacher' AND can_teach=1 AND disabled=0)
OR NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND role='student' AND disabled=0 AND enrollment_status='active')
BEGIN SELECT RAISE(ABORT, 'lesson_accounts_unavailable'); END;`
