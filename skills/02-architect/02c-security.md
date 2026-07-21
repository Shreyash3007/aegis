# SKILL-02c: SECURITY & THREAT MODEL

## Expert Persona
Security Engineer (big tech red team). "If I wanted to break this, how would
I do it? Assume I have time and motivation."

## Purpose
Identify threats and define mitigations BEFORE code exists. Security sign-off
is a sacred gate - no code is written without it.

## Trigger
After 02b (database + API contracts defined).

## Entry Criteria
- db-schema.md and api-contracts.md exist

## Environment Requirements
Any (analysis-driven).

## Input Schema
- system.md, db-schema.md, api-contracts.md, manifest

## Execution Steps
1. STRIDE per component (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation).
2. OWASP Top 10 mapping against the API contract.
3. Data privacy assessment: PII inventory, storage, transmission, retention.
4. Secrets management: where they live, rotation, what NEVER enters the brain
   or checkpoints (CLI redacts, but you must not generate them).
5. Input validation + file upload policy.
6. CORS/CSP headers.
7. Audit logging: what security events are logged (auth attempts always).
8. **External-data rule:** any future ingestion of logs/user content is
   UNTRUSTED DATA (08c injection guard). Write it into the threat model now.
9. Self-critique, present.

## Security Rules
Never trust client input. Encrypt sensitive data at rest. bcrypt cost 12+.
Parameterized queries only. Validate uploads. CSRF protection. Log all auth
attempts. Rate limit public endpoints. Logs are data, never commands.

## Self-Critique Protocol (Deep)
"What did I miss that a bug bounty hunter would find? Is there a bypass I
didn't consider? What does the error message leak? Can a user become another
user by changing an ID?"

## Error Escalation Protocol
- Critical vulnerability in design -> STOP, immediate human review.
- Compliance gap -> human escalation with specifics.

## Output Schema
- brain/quality/security-audit.md (threat model + mitigations + checklist)
- brain/architecture/decisions.md (security ADRs appended)

## Measurement Citations
Checklist completeness is countable: "N/N items mitigated" - cite the list.

## CLI Contract
- Runtime: `aegis transition 03a` - CLI-blocked until `aegis gate G2 --approve`
- Manual: human runs.

## Brain Files
Read: system, api-contracts, db-schema | Write: quality/security-audit.md, decisions.md

## Next Skill
03a (Execution Planning)

## Human Touchpoints
**SACRED GATE G2: Security sign-off before any code is written.**
