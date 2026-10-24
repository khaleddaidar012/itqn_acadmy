CREATE TABLE IF NOT EXISTS zoom_meetings (
 lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id), teacher_id INTEGER NOT NULL REFERENCES users(id),
 host_id TEXT NOT NULL, account_id TEXT NOT NULL, meeting_id TEXT UNIQUE, join_url TEXT,
 state TEXT NOT NULL CHECK(state IN ('creating','ready','uncertain')), created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS zoom_refresh_locks (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), owner TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS zoom_attendance_events (
 event_key TEXT PRIMARY KEY, lesson_id INTEGER NOT NULL REFERENCES lessons(id),
 actor TEXT NOT NULL CHECK(actor IN ('teacher','student','meeting')),
 participant TEXT NOT NULL, occurrence TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('join','leave','start','end')),
 at_ms INTEGER NOT NULL, joined_ms INTEGER);
CREATE INDEX IF NOT EXISTS zoom_attendance_lesson ON zoom_attendance_events(lesson_id,at_ms);
