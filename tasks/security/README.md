# Security evidence and operating procedures

Introduced 27 October 2026. These documents describe the process being introduced now, not a historical certification. The academy owner is accountable for adoption and execution. No independent penetration test or SOC/ISO certification is claimed.

## Scanner evidence

`.github/workflows/security-evidence.yml` produces scanner-generated Semgrep JSON/SARIF, OWASP ZAP baseline HTML/JSON/Markdown, and npm audit JSON. Every artifact includes the scanned Git revision. GitHub Actions retains these artifacts for 30 days; preserve the original files locally for review before expiration.

Semgrep runs without an AppSec account or telemetry. Rule packs are fetched from the Semgrep registry; source code is scanned on the GitHub runner. npm audit is dependency analysis, not a replacement for SAST. ZAP baseline is a passive dynamic assessment; the separate ZAP full scan actively tests the same isolated production-mode loopback target with synthetic data. Both are unauthenticated and do not establish authenticated API or teacher/student workflow coverage. Neither is a third-party penetration test. Do not relabel this coverage in a submission. High-risk ZAP findings fail a separate gate without modifying original reports.

No production database, Zoom authorization, payment credentials or personal records are supplied to CI. Do not upload production reports, backups or secrets as evidence. The active scan is time bounded to five minutes, with one minute per rule; rules may be incomplete when the limit is reached. Raw scanner results must not be edited to remove findings. Remediation, false-positive reasoning and limitations belong in a separate dated assessment tied to each rule and revision.

The architecture diagram remains local by explicit owner instruction and must not be attached to GitHub or Zoom. Publishing or sharing the Zoom app remains a separate process; passing a workflow does not grant approval.

## Operating procedures

- [Secure development lifecycle](SSDLC.md)
- [Security policy](SECURITY-POLICY.md)
- [Incident response](INCIDENT-RESPONSE.md)
- [Vulnerability and dependency management](VULNERABILITY-MANAGEMENT.md)

## Current limits

The student-retention decision is one year after account closure. Historical erasure, a reliable closure timestamp, backup erasure handling and published privacy terms are separate unfinished work. Do not present that deletion guarantee as already implemented. TLS 1.2-only enforcement must be verified in the production edge configuration before answering the corresponding Zoom attestation. Scanners and procedures do not prove either requirement by themselves.

Official tool references: https://semgrep.dev/docs/semgrep-ci/sample-ci-configs and https://www.zaproxy.org/docs/docker/baseline-scan/.
