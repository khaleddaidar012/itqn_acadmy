ALTER TABLE lessons ADD COLUMN workflow_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lessons ADD COLUMN meeting_link TEXT;
ALTER TABLE lessons ADD COLUMN prepared_at TEXT;
ALTER TABLE lessons ADD COLUMN completed_at TEXT;
ALTER TABLE lessons ADD COLUMN completion_note TEXT;
ALTER TABLE lessons ADD COLUMN homework TEXT;
ALTER TABLE users ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
-- Existing earned history stays unchanged. Only untouched future lessons switch flow.
UPDATE lessons SET workflow_version=1 WHERE joined IS NULL AND status='scheduled' AND julianday(start)>julianday('now');
