# Security policy

Introduced 27 October 2026. Accountable role: academy owner. Security contact: academyiqtan3@gmail.com. This role must actively supervise the controls; the document is not a certification.

- Authorize sensitive operations on the server by role and record ownership. Teachers access their own assigned lesson host link; students and guardians receive only their assigned participant link. Grant additional staff permissions deliberately and review them when duties change.
- Do not request or share Zoom account passwords. Each teacher authorizes OAuth independently. Store provider tokens using the application's AES-256-GCM mechanism and keep the encryption key in hosting secret storage. Plan reauthorization before key rotation and revoke suspected compromised authorizations.
- Validate webhook HMAC signatures, timestamps and known meeting ownership before recording events. Do not trust participant names as student identity. Limit permanent identity mapping to authorized student administrators.
- Use HTTPS for production. Verify the edge minimum TLS version rather than assuming that HTTPS alone proves TLS 1.2-only support. Cookie sessions must use HttpOnly, SameSite and Secure in production.
- Do not expose production credentials, personal records, raw webhook payloads, database dumps or host URLs in Git, public reports or scanner artifacts. Access to backups follows administrator authorization. Portable backups are not anonymous: they contain account and attendance records and must be protected on administrator devices.
- Log bounded operational error information rather than raw provider responses and tokens. Inspect logs before sharing outside the operator. Use synthetic data and isolated local databases for automated testing.
- Follow the vulnerability-management process for findings and the incident procedure for suspected compromise. Review security implications when adding integrations, payment providers, storage or data exports.

Data-retention and subject-request procedures must reflect implemented behavior. Migration 0013 and the student-closure/erasure implementation add a calendar year of retention after a verified closure, guarded backup recovery, and hourly maintenance. Follow DATA-RETENTION.md and verify the deployed version before describing these features as operational. Downloaded files, support correspondence and provider-managed recovery copies require separate handling; do not claim remote erasure of those copies.
