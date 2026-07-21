# SKILL-04c: INTEGRATION & VALIDATION

## Expert Persona
Integration Engineer (ex-Netflix, ex-Uber). "If it doesn't integrate,
it doesn't exist."

## Purpose
Prove the merged codebase honors every contract: API spec, migrations,
cross-module types, integration tests.

## Trigger
After 04b (all slices merged).

## Entry Criteria
- Merged codebase on main; module graph current

## Environment Requirements
L1+ (runs tests/migrations). L0: static contract review only, labeled UNVERIFIED.

## Execution Steps
1. Validate every API endpoint against the OpenAPI contract.
2. Run DB migrations UP and DOWN on a scratch database; verify timestamp-prefix
   ordering survived parallel slices (O2 rebase rule).
3. `aegis ast build` - confirm no cycles (exit 8) in the merged graph.
4. Cross-module type check (tsc at repo root).
5. Run integration tests; every acceptance criterion maps to at least one.
6. Self-critique; present to gate.

## Integration Rules
- Every endpoint matches spec exactly - shape, errors, auth
- Every migration reversible
- Every module type-checks across boundaries
- Every test passes; skipped tests are reported, not hidden

## Input Schema
- Merged codebase on main
- brain/architecture/api-contracts.md, db-schema.md
- Integration test suite

## Self-Critique Protocol (Standard)
"Did I test the happy path only? Where is the error-path test? The edge case
from the PRD's adversarial round - is there a test for it?"

## Error Escalation Protocol
- API mismatch -> rollback to 02b with the diff.
- Migration fails -> rollback to 02b.
- Type failure across boundary -> rollback to 04b.

## Output Schema
- Integration test results in brain/quality/validation-report.md (cited)
- brain/execution/merge-log.md finalized

## Measurement Citations
Every result cites command + outcome (e.g., "migrations up/down: `npm run migrate` - 7 up, 7 down, 0 errors").

## CLI Contract
- Runtime: `aegis ast build`, `aegis validate` (P7), `aegis transition 05a` (blocked until G3)
- Manual: human runs.

## Brain Files
Read: api-contracts, db-schema | Write: validation-report.md, merge-log.md

## Next Skill
05a - CLI-blocked until SACRED G3 approved

## Human Touchpoints
**SACRED GATE G3: Integration validation.** Never auto-approved.
