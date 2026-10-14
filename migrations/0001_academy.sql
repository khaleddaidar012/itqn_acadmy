PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','student','parent')), manage INTEGER NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'EGP', subjects TEXT NOT NULL DEFAULT '[]',
      parent_id INTEGER REFERENCES users(id), pages INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), student_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL, start TEXT NOT NULL, duration INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled',
      joined TEXT, left_at TEXT, rate REAL NOT NULL, currency TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
      replaced_by INTEGER REFERENCES lessons(id));
    CREATE TABLE IF NOT EXISTS progress (id INTEGER PRIMARY KEY, student_id INTEGER REFERENCES users(id), teacher_id INTEGER REFERENCES users(id), lesson_id INTEGER REFERENCES lessons(id), pages INTEGER NOT NULL, note TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS lessons_teacher_start ON lessons(teacher_id,start);
    CREATE INDEX IF NOT EXISTS lessons_student_start ON lessons(student_id,start);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TRIGGER IF NOT EXISTS lesson_no_overlap BEFORE INSERT ON lessons
WHEN NEW.status NOT IN ('cancelled','postponed') AND EXISTS (
 SELECT 1 FROM lessons WHERE status NOT IN ('cancelled','postponed')
 AND (teacher_id=NEW.teacher_id OR student_id=NEW.student_id)
 AND julianday(start) < julianday(NEW.start) + NEW.duration / 1440.0
 AND julianday(start) + duration / 1440.0 > julianday(NEW.start)
)
BEGIN SELECT RAISE(ABORT, 'lesson_overlap'); END;
