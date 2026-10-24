CREATE TABLE IF NOT EXISTS backup_objects (
 storage_key TEXT PRIMARY KEY, chunks INTEGER NOT NULL CHECK(chunks>0), created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS backup_object_chunks (
 storage_key TEXT NOT NULL REFERENCES backup_objects(storage_key) ON DELETE CASCADE,
 position INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY(storage_key,position));
