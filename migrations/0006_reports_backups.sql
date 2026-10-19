CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO system_settings(key,value) VALUES('backups_enabled','1');
CREATE TABLE IF NOT EXISTS backup_runs (
 id TEXT PRIMARY KEY, day TEXT, status TEXT NOT NULL, created TEXT NOT NULL,
 completed TEXT, storage_key TEXT, sha256 TEXT, bytes INTEGER, error TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS backup_daily ON backup_runs(day) WHERE day IS NOT NULL;
CREATE TABLE IF NOT EXISTS backup_receipts (
 user_id INTEGER NOT NULL REFERENCES users(id), device TEXT NOT NULL, backup_id TEXT NOT NULL,
 saved TEXT NOT NULL, PRIMARY KEY(user_id,device));
CREATE TABLE IF NOT EXISTS report_shares (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, student_id INTEGER NOT NULL REFERENCES users(id),
 created_by INTEGER NOT NULL REFERENCES users(id), created TEXT NOT NULL, expires TEXT NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0, snapshot TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS report_student ON report_shares(student_id,created);
