# Security assessment - 27 October 2026

Scanned application revision: `47ca6cb35cc11cc4cdddbeafbc8cad985bc65f28`.
Original run and downloadable tool artifacts: https://github.com/khaleddaidar012/itqn_acadmy/actions/runs/40545318805.

## Results and scope

- Semgrep OSS 1.182.1, OWASP Top Ten and JavaScript rules: zero findings, zero scanner errors on this revision. This is rule-based static analysis, not proof that all security bugs are absent.
- npm audit: zero reported vulnerabilities after compatible dependency updates. Next.js is 15.5.28. Targeted overrides replace the vulnerable nested PostCSS and glob releases; production builds and relevant regression tests passed. Reassess those overrides when upgrading the parent packages.
- OWASP ZAP 2.17.0 baseline and active assessment: no high-risk findings. The active scan is unauthenticated, targets an isolated production-mode application on loopback, runs for at most five minutes with one minute per rule, and may not complete every rule. It does not assess authenticated lesson workflows or represent an independent penetration test.
- Both original ZAP reports retain the medium-risk CSRF alerts. These were not suppressed or removed from the reports. Their triage is below.
- GitHub checks passed for fresh CSP nonce/rendered-script compatibility, native form POST fallback, authenticated cross-origin rejection without mutation, and real 404 responses for backup-lookalike filenames.

## Remediation performed

1. Updated vulnerable dependencies without force-upgrading framework majors or downgrading the Cloudflare adapter to silence advisory counts.
2. Semgrep detected a missing explicit AES-GCM authentication-tag length. Both encryption and decryption now require a 16-byte tag; regression checks confirm previously valid tokens remain readable and shortened tags fail.
3. Added per-response script/style CSP nonces, prevented nonce/header spoofing and HTML nonce caching, and passed the nonce through the theme script and Framer Motion configuration. Removed the broad external image allowance. Inline style attributes remain permitted for React layout/animation; inline script bypasses and production unsafe-eval are not permitted.
4. Added clickjacking, MIME-sniffing, cross-origin isolation, referrer and permissions headers; removed the framework disclosure header.
5. Set native form fallback methods to POST so JavaScript failure cannot put credentials or billing data into query strings.
6. Restricted supported locale parameters. Unknown image/text backup-lookalike paths previously returned the home page with HTTP 200; they now return 404. No matching backup files existed in the public directory.

## Remaining CSRF alerts - review and limits

ZAP rules `10202` (Absence of Anti-CSRF Tokens) and `20012` (Anti-CSRF Tokens Check) identify HTML login/registration forms without a synchronizer-token field. The application submits JSON through JavaScript to `/api/system`; the POST HTML page fallback does not perform account mutations. The actual API rejects requests with a missing, null or foreign Origin before parsing/acting, requires the authenticated session for privileged actions, and uses HttpOnly/SameSite/Secure session cookies in production. No cross-origin CORS permission is enabled.

`tests/security-csrf.mjs` verifies the defense using a real synthetic administrator session: forged/null/missing Origins and a cross-origin simple-form request all return 403; the users list stays unchanged. This is evidence for the current API implementation, not a claim that the raw scanner alerts disappeared. Maintain Origin/host behavior on the production proxy and reassess any future state-changing route or CORS change. External provider webhooks have separate signature authentication and are not browser-cookie mutation endpoints.

## Other validation

- Zoom regression tests passed for OAuth isolation, encryption/refresh, meeting ownership, host/student link separation, signed/duplicate/reordered attendance, participant review, saved identity mapping and disconnect behavior.
- Automatic-close unit tests and chunked backup integrity/rollback tests passed.
- Workers + D1 system regression tests passed for account roles/permissions, student approval, scheduling/concurrency/rollback, attendance, progress, pay accounting, password/session invalidation and logout.
- Browser smoke on synthetic local data confirmed dashboard login/logout and no browser error/warning logs with the new CSP.
- A production hostname TLS handshake probe accepted TLS 1.2/1.3 and rejected TLS 1.0/1.1 with connection resets from the test point. This is a point-in-time observation, not an audit of every network path or the hosting provider's internal encryption.

## Zoom submission remains separate

No review request or security evidence was submitted to Zoom by this assessment. The architecture diagram remains local by owner instruction. Public privacy/terms and implementation of the agreed one-year post-student-account-closure deletion process, including backups, remain unfinished. New operating procedures are dated 27 October 2026 and must not be represented as historical certification or independent penetration testing.
