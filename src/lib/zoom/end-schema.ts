// Keep synchronized with migrations/0011_zoom_end_jobs.sql.
export const zoomEndSchema = String.raw`CREATE TABLE IF NOT EXISTS zoom_end_jobs (
 lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id), due_ms INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','working','retry','ended','skipped','blocked')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT, completed TEXT);
CREATE INDEX IF NOT EXISTS zoom_end_jobs_due ON zoom_end_jobs(state,next_attempt,due_ms);
`
