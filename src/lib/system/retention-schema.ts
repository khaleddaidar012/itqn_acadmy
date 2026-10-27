// Keep synchronized with migrations/0013_student_retention.sql.
export const retentionSchema = String.raw`-- Existing disabled accounts are NOT treated as closed or backdated.
CREATE TABLE IF NOT EXISTS account_closures (
 student_id INTEGER PRIMARY KEY REFERENCES users(id), closed_at TEXT NOT NULL,
 purge_at TEXT NOT NULL, purged_at TEXT, purge_owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS closures_due ON account_closures(purged_at,purge_at);
CREATE TABLE IF NOT EXISTS retained_teacher_totals (
 teacher_id INTEGER NOT NULL REFERENCES users(id), month TEXT NOT NULL, currency TEXT NOT NULL,
 minutes REAL NOT NULL, earned REAL NOT NULL, lessons INTEGER NOT NULL,
 PRIMARY KEY(teacher_id,month,currency));
CREATE TABLE IF NOT EXISTS backup_erasure_queue (storage_key TEXT PRIMARY KEY);
INSERT OR IGNORE INTO system_settings(key,value) VALUES('privacy_revision','0');
INSERT OR IGNORE INTO system_settings(key,value) VALUES('academy_instance_id',lower(hex(randomblob(16))));
CREATE TRIGGER IF NOT EXISTS close_student_account AFTER INSERT ON account_closures
BEGIN
 UPDATE users SET disabled=1 WHERE id=NEW.student_id;
 DELETE FROM sessions WHERE user_id=NEW.student_id;
 DELETE FROM zoom_student_links WHERE student_id=NEW.student_id;
 UPDATE report_shares SET revoked=1 WHERE student_id=NEW.student_id;
 UPDATE lessons SET status='cancelled' WHERE student_id=NEW.student_id AND status='scheduled' AND joined IS NULL AND julianday(start)>julianday(NEW.closed_at);
END;
`
