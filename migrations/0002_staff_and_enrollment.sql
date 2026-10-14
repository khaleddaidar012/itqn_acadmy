ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN enrollment_status TEXT NOT NULL DEFAULT 'active' CHECK(enrollment_status IN ('pending','active'));
CREATE TRIGGER IF NOT EXISTS lesson_accounts_ready BEFORE INSERT ON lessons
WHEN NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.teacher_id AND role='teacher' AND disabled=0)
OR NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.student_id AND role='student' AND disabled=0 AND enrollment_status='active')
BEGIN SELECT RAISE(ABORT, 'lesson_accounts_unavailable'); END;
