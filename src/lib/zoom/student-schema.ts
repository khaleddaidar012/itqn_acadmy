// Keep synchronized with migrations/0012_zoom_student_links.sql.
export const zoomStudentSchema = String.raw`CREATE TABLE IF NOT EXISTS zoom_student_links (
 student_id INTEGER PRIMARY KEY REFERENCES users(id), zoom_user_hash TEXT NOT NULL UNIQUE,
 verified_by INTEGER NOT NULL REFERENCES users(id), verified_at TEXT NOT NULL,
 lesson_id INTEGER NOT NULL REFERENCES lessons(id));
CREATE TABLE IF NOT EXISTS zoom_pending_participants (
 event_key TEXT PRIMARY KEY, lesson_id INTEGER NOT NULL REFERENCES lessons(id),
 occurrence TEXT NOT NULL, participant TEXT NOT NULL, zoom_user_hash TEXT,
 display_name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('join','leave')),
 at_ms INTEGER NOT NULL, joined_ms INTEGER, resolved_student_id INTEGER REFERENCES users(id));
CREATE INDEX IF NOT EXISTS zoom_pending_lesson ON zoom_pending_participants(lesson_id,occurrence,participant);
`
