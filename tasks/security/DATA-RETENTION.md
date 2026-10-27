# Student closure and erasure operations

Introduced 27 October 2026. Public wording is in `src/data/legal.ts`; migration 0013 is required before deploying this version. An account is not closed until an authenticated student closes their own account or an administrator closes it after verification. Student-management staff and parents cannot close another account through this endpoint.

## Lifecycle

- `account_closures` records the server time and the same calendar date/time one UTC year later (February 29 becomes February 28). Repeating closure does not reset it. Existing disabled accounts are not backdated. There is no automated reopen action.
- A database trigger immediately disables the account, revokes sessions and shared reports, removes the persistent Zoom student link, and cancels future unstarted lessons. Review balances, commitments and a guardian's authority before closing a minor's account.
- The Cloudflare scheduled handler checks erasure at the top of each UTC hour, independently of the daily-backup toggle; backup requests also run maintenance. It handles at most ten due accounts per invocation. Large queues can require multiple invocations; operators must monitor delayed closures and cron failures.
- Erasure uses a leased, atomic transaction. On failure it rolls back and may retry after lease expiry. It removes the student's lessons, progress, excuses, attendance, pending identities, meeting/end-job records, report snapshots, subscriptions, receipts, internal payment records, connections/states/locks and known authentication-attempt keys. Other students' records remain.
- Teacher compensation is calculated from actual Zoom attendance intervals where available and retained as monthly teacher/currency totals with no student ID/name or lesson details. This is not a claim that such summaries are mathematically anonymous in every context. The original student name/email/password/guardian link/subjects/pages are replaced with an unusable disabled tombstone. A minimal internal ID and closure/erasure times remain to prevent ID reuse and enforce erasure on restored exports.
- External provider records, provider-managed physical recovery copies, email correspondence and independently downloaded files are not remotely erased by this database transaction. Verify the request, coordinate provider/support-mail handling as appropriate and tell the requester what is within the academy's control. Do not claim instant physical deletion throughout a provider's infrastructure.

## Backups and restore

- Exports expire for restoration within 30 days, shortened to the earliest pending student-erasure deadline when necessary. Server maintenance deletes expired exports and invalidates **all** older application backup snapshots when a student is erased. D1 chunks and metadata are removed atomically; the erasure queue retries local filesystem cleanup. The backup screen warns if cleanup is pending.
- A privacy revision guards snapshot publication, preventing a backup started before erasure from being published afterward. An orphan-file sweep queues unpublished files left by a crashed local process.
- Administrator downloads are outside remote deletion control. Administrators must delete expired downloads and independent copies, including previously exported legacy files. Folder permission for automated saving does not imply that the server can wipe offline devices. Do not keep an expired export as an undocumented recovery alternative.
- Before recovery, stop production writes/closure changes under the existing deployment maintenance process and download the **current** privacy ledger using the authenticated backup-settings link. Do not use the ledger saved alongside an old export. It contains internal IDs/timestamps and must be protected with the export.
- `node scripts/restore-backup.mjs backup.json NEW-database.sqlite CURRENT-privacy-ledger.json` requires a matching academy instance and a ledger no older than 24 hours. It refuses expired backups, legacy exports without an academy instance identifier, or an existing destination. It applies the current closures and all overdue erasures before returning the restored database. Sessions, tokens and old public report links are not restored.
- If recovery is performed directly through provider tools rather than this script, keep the restored service inaccessible until the current ledger/erasures have been reapplied and verified. A point-in-time backup alone cannot tell the service about privacy requests made after that snapshot.

## Operator checks

1. Verify the production account and migration. Inspect closure counts/deadlines without printing student records. Do not backdate real accounts to test erasure.
2. Monitor Cloudflare scheduled invocation failures and overdue unpurged closures. Review the backup-screen pending-cleanup warning. A missing/incomplete cron run is not evidence that erasure succeeded.
3. Check that expired exports are unavailable and a fresh export excludes erased records. Record aggregate result counts, not erased names or raw data.
4. Periodically rehearse recovery on an isolated database with a fresh privacy ledger. Confirm disabled users stay disabled and erased users' data does not return.
5. Remind authorized backup operators to remove local copies at expiry. Handle support-mail/provider deletion requests separately; document unresolved limits honestly.

Automated evidence: `tests/retention.mjs` covers calendar-year boundaries, rollback, idempotency/concurrency, cross-student isolation, pay preservation, raw-data removal, backup publication races and guarded recovery. `tests/retention-http.mjs --worker` covers authenticated ownership/Origin boundaries, closure/session revocation and actual overdue erasure on disposable Worker/D1 data. Production tests must remain read-only for real student closures.
