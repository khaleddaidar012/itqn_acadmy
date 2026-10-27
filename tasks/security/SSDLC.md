# Secure software development lifecycle

Effective process introduction: 27 October 2026. Accountable role: academy owner; implementation role: project maintainer. This document is an operating procedure, not evidence of previous practice.

1. Define the change, users affected, data handled and applicable permissions. Identify trust boundaries around browser input, signed Zoom events, payment callbacks, backups and administrator operations. Determine how the change can be rolled back before production deployment.
2. Implement on a Git branch. Keep credentials in local ignored files or hosting secret storage. Use parameterized SQL and server-side role/ownership checks. Names and button clicks must not establish Zoom attendance identity. Review new network destinations and the minimum required provider scopes.
3. Inspect the diff for secrets, unintended files, permission regressions and destructive behavior. Keep local credentials, backups and owner-restricted diagrams outside Git. For work by a single maintainer, record self-review accurately; do not describe it as independent approval.
4. Run relevant functional/security tests and a production build. Run the Security evidence workflow for source or dependency changes. Retain the scanner revision and reports, including failed runs. Investigate findings and classify exploitability; missing scanner output is an incomplete assessment, not a pass.
5. Block release for an unresolved applicable critical/high issue unless the owner records an explicit, bounded exception with the issue, exposure, mitigation, approver and review date. Do not use an exception as a claim that the scanner is clean. Lower-severity findings receive tracked remediation or documented risk acceptance.
6. Deploy only to the verified hosting account. Run bounded smoke checks without creating real financial actions or fabricated attendance. Verify actual provider events for integration acceptance. Keep the last working revision and hosting deployment identifier for rollback.
7. Monitor operational failures, dependency advisories and data-handling changes. Apply the vulnerability and incident procedures as needed. Retest a fix at a new revision and preserve the original evidence.

For a Zoom submission, provide the actual workflow runs and original reports separately. This procedure alone is not a substitute for scanner results or external penetration testing.
