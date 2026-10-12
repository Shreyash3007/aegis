---
name: 02c-security
version: 0.6.0
triggers: [threat model, owasp mapping, security sign-off g2]
not-triggers: [code before sign-off, trusting client input]
inputs: [system.md, db-schema.md, api-contracts.md, manifest]
outputs: [security-audit.md, security ADRs]
chains-to: 03a-execution-planning
autonomy: L1
tokens-budget: 1500
---
# SKILL-02c: SECURITY & THREAT MODEL

## Overview
Identify threats and define mitigations BEFORE code exists.
Ask first: if I wanted to break this, with time and motivation, how would I?

## When
- After 02b; db-schema.md and api-contracts.md exist.
- L1+ runs dependency audit; L0 labels those UNVERIFIED.

## When-NOT
- No code is written before G2 sign-off, ever.
- Secrets are never generated into brain or checkpoints (CLI redacts; you must not create them).

## Process
- Map attack surface (public endpoints, uploads/webhooks/imports, secret stores, trust boundaries): `aegis status`
- STRIDE per component (threat -> mitigation -> owner): `aegis status`
- OWASP Top 10 vs API contract (applies + where mitigated, artifact-cited): `aegis status`
- PII inventory (field -> table -> flow), encryption at-rest/in-transit, retention, jurisdiction: `aegis status`
- Secrets posture, rotation, never-in-brain rule: `aegis status`
- Input validation + upload allowlist (schema, size/type/extension; whitelist never blacklist): `aegis status`
- Strict CSP (no unsafe-inline/eval without removal plan), explicit CORS origins: `aegis status`
- Audit logging (auth attempts, privileged actions, exports; no secret payloads): `aegis status`
- Dependency baseline via audit; lockfiles committed; reproducible installs: `aegis validate deps`
- Write the external-data rule now (future log/user ingestion = UNTRUSTED, 08c guard): `aegis status`
- Severity-score findings; self-critique; present; advance only on G2: `aegis transition 03a`

## Verification
- Checklist countable: "N/N items mitigated", each evidenced: secrets (env/vault, gitignored, no history); inputs schema-parsed; SQL parameterized; AuthN (HttpOnly+Secure+SameSite, expiry/rotation, bcrypt>=12); AuthZ (per-op + row-ownership server-side, explicit RBAC); XSS sanitized; CSRF tokens; per-endpoint rate limits; no secrets in logs; clean audit baseline.
- Dependency claims cite the audit result, else UNVERIFIED.
- Self-check: bounty-hunter bypass? error-message leak? ID-change escalation? existence oracle (timing/404-vs-401)? every inbound path covered?

## Red Flags
- Critical (auth bypass, injection, secret exposure, RCE) -> STOP, immediate human review, no G2.
- Major (per-resource access gap, missing login rate limit) -> escalate with specifics; mitigate before 04a.
- Minor (verbose errors, missing header) -> record, route to 07a backlog.
- Compliance gap -> escalate naming the missing control.

## Interactions
- CLI: `aegis transition 03a` (G2-blocked); human: `aegis gate G2 --approve`.
- Brain: read system/api-contracts/db-schema; write `quality/security-audit.md`, append security ADRs.
- Next: `03a-execution-planning`. Touchpoint: SACRED G2 before any code.
