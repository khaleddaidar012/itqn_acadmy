// Keep synchronized with migrations/0007_subscriptions.sql.
export const subscriptionsSchema = String.raw`
CREATE TABLE IF NOT EXISTS student_subscriptions (
 id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE,
 student_id INTEGER NOT NULL REFERENCES users(id),
 plan_id TEXT NOT NULL, plan_name TEXT NOT NULL, subject TEXT NOT NULL,
 duration INTEGER, total_sessions INTEGER NOT NULL CHECK(total_sessions > 0),
 amount INTEGER NOT NULL CHECK(amount >= 0), currency TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
 starts TEXT NOT NULL, ends TEXT NOT NULL CHECK(ends > starts),
 created_by INTEGER NOT NULL REFERENCES users(id), created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS subscriptions_student ON student_subscriptions(student_id,starts);
CREATE TRIGGER IF NOT EXISTS subscription_no_overlap BEFORE INSERT ON student_subscriptions
WHEN EXISTS(SELECT 1 FROM student_subscriptions WHERE student_id=NEW.student_id AND subject=NEW.subject
 AND starts < NEW.ends AND ends > NEW.starts)
BEGIN SELECT RAISE(ABORT,'subscription_overlap'); END;
CREATE TABLE IF NOT EXISTS subscription_receipts (
 id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE,
 subscription_id TEXT NOT NULL REFERENCES student_subscriptions(id),
 amount INTEGER NOT NULL CHECK(amount > 0), method TEXT NOT NULL, reference TEXT NOT NULL,
 created_by INTEGER NOT NULL REFERENCES users(id), created TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS subscription_no_overpayment BEFORE INSERT ON subscription_receipts
WHEN NEW.amount + COALESCE((SELECT SUM(amount) FROM subscription_receipts WHERE subscription_id=NEW.subscription_id),0)
 > (SELECT amount FROM student_subscriptions WHERE id=NEW.subscription_id)
BEGIN SELECT RAISE(ABORT,'subscription_overpayment'); END;
`
