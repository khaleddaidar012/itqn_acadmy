// Keep synchronized with migrations/0008_zoom_oauth.sql.
export const zoomSchema = String.raw`
CREATE TABLE IF NOT EXISTS zoom_connections (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), zoom_user_id TEXT NOT NULL UNIQUE,
 account_id TEXT NOT NULL, email TEXT NOT NULL, encrypted_tokens TEXT NOT NULL,
 expires INTEGER NOT NULL, connected TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS zoom_oauth_states (
 hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), session_hash TEXT NOT NULL,
 locale TEXT NOT NULL CHECK(locale IN ('ar','en')), expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS zoom_states_expiry ON zoom_oauth_states(expires);
`
