---
name: 04c-integration
version: 0.6.0
triggers: [contract validation, migration up down, cross-module typecheck]
not-triggers: [happy-path-only testing, hidden skips]
inputs: [merged main, api contracts, schema, integration suite]
outputs: [cited validation report, finalized merge log]
chains-to: 05a-traceability
autonomy: L2
tokens-budget: 800
---
# SKILL-04c: INTEGRATION & VALIDATION

## Overview
Prove the merged codebase honors every contract: API spec, migrations, cross-module types, integration tests.
If it doesn't integrate, it doesn't exist.

## When
- After 04b; merged codebase on main, module graph current.
- L1+ runs tests/migrations; L0 static contract review only, labeled UNVERIFIED.

## When-NOT
- Never happy-path-only; never hidden skips — skipped tests are reported.
- Every endpoint matches spec exactly (shape, errors, auth); every migration reversible.

## Process
- Validate every API endpoint against the OpenAPI contract: `aegis validate`
- Run migrations UP and DOWN on scratch DB; verify timestamp ordering survived parallel slices: `aegis validate`
- Confirm no cycles in the merged graph: `aegis ast build`
- Cross-module typecheck at repo root: `aegis typecheck`
- Run integration tests with every acceptance criterion mapped to at least one test: `aegis validate tests`
- Doubt gate (fresh eyes before 05a): re-read the contracts as a hostile reviewer who never saw the build; per discrepancy file a reconcile class — contract-misread (rollback 02b), actionable (fix lane now), trade-off (record in brain/decisions.md), or noise (drop with one-line reason): `aegis status`
- Self-critique; present to gate; advance only on SACRED G3: `aegis transition 05a`

## Verification
- Every result cites command + outcome; every module typechecks across boundaries; every test passes.
- Doubt-gate log present: every discrepancy carries one reconcile class; all-noise cycles escalate, never silent-pass.
- Self-check: happy path only? error-path test present? PRD adversarial edge case covered?

## Red Flags
- API mismatch -> rollback to 02b with the diff.
- Migration fails -> rollback to 02b.
- Cross-boundary type failure -> rollback to 04b.

## Interactions
- CLI: `aegis ast build`, `aegis validate`, `aegis typecheck`, `aegis transition 05a` (G3-blocked).
- Brain: read api-contracts + db-schema; write `validation-report.md`, finalize `merge-log.md`.
- Next: `05a-traceability`. Touchpoint: SACRED G3, never auto-approved.
