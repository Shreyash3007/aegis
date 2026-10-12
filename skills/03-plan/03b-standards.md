---
name: 03b-standards
version: 0.6.0
triggers: [coding standards lock, lint config generation, convention freeze]
not-triggers: [aspirational markdown, silent reformats]
inputs: [execution matrix, locked manifest, brownfield lint configs]
outputs: [enforceable lint config, locked standards.md]
chains-to: 04a-parallel-build
autonomy: L1
tokens-budget: 1200
---
# SKILL-03b: AI-NAVIGABLE STANDARDS

## Overview
Enforce conventions that make AI navigation and human review effortless — as lint config and git hooks, not a document nobody reads.
If it can't be found in 30 seconds, the structure is wrong.

## When
- After 03a; execution matrix defined, stack locked.
- L1+ for lint/hook generation; document-only at L0.

## When-NOT
- Never clobber brownfield lint configs — reconcile (adopt/adapt/hybrid), ask on conflict.
- Never aspirational markdown: each numbered item maps to one enforceable lint rule.

## Process
- Structure feature-based (never by type) so each slice diffs in isolation: `aegis slice create`
- Lock file rules (small files, one responsibility, <=800 lines; functions <=50 lines, one job; named exports; early returns; named constants): `aegis status`
- Lock naming (camelCase fns/vars, is/has/should/can booleans, PascalCase types, UPPER_SNAKE constants): `aegis status`
- Lock immutability (return copies, never mutate; mutation = lint error, it breaks parallel slices): `aegis status`
- Lock errors/validation/logging (typed errors, boundary-only catch; schema-validated edges; UNTRUSTED external data; structured JSON logs, never secrets): `aegis status`
- Lock testing discipline (co-located, one behavior/test, AAA, independent; unit+integration+E2E; 80% gate at G3): `aegis validate tests`
- Generate the lint config encoding every rule; verify the pre-commit typecheck hook path: `aegis validate`
- Walk the locked checklist; record exceptions with reasons in standards.md (reviewable, never silent): `aegis status`
- Self-critique; present; standards immutable for slices (merge check refuses edits, N3): `aegis transition 04a`

## Verification
- Enforcement claims cite the generated config path + hook presence, not intent.
- Coverage claims cite the G3 validation run, else UNMEASURED; file-size limits countable.
- Self-check: 1-day-comprehensible? ceremony without benefit? rules actually encoded? slice-followable without questions? immutability + 80% gate locked or merely mentioned?

## Red Flags
- Brownfield convention conflict -> ask (adopt/adapt/hybrid); never silently reformat legacy.
- Rule unexpressible in the stack linter -> manual review checkpoint in standards.md, flagged at 06b.
- No test runner -> coverage UNMEASURED at G3; 80% intent kept; gap task to 07a.

## Interactions
- CLI: `aegis transition 04a` (N1-blocked until `aegis contracts` verifies).
- Brain: read execution-matrix + manifest; write `architecture/standards.md`.
- Next: `04a-parallel-build`. Touchpoint: team convention conflicts.
