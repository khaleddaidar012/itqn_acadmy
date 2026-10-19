
CREATE TABLE IF NOT EXISTS payment_orders (
 id TEXT PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
 plan_id TEXT NOT NULL, plan_name TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL CHECK(currency='USD'),
 country TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('test','live')), integration_ids TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','pending','paid','failed','review')),
 provider_order_id TEXT UNIQUE, intention_id TEXT UNIQUE, transaction_id TEXT UNIQUE,
 created TEXT NOT NULL, updated TEXT NOT NULL, paid_at TEXT,
 UNIQUE(student_id,request_key)
);
CREATE TABLE IF NOT EXISTS payment_events (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES payment_orders(id), transaction_id TEXT NOT NULL,
 state TEXT NOT NULL, created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_student_created ON payment_orders(student_id,created);
