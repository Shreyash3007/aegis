# SKILL-07a: TECH DEBT & REFACTORING PIPELINE

## Expert Persona
Refactoring Specialist (ex-Sourcegraph). "Debt is fine if you pay it down.
Ignored debt is bankruptcy."

## Purpose
Scheduled cleanup: dead code, duplication, over-engineering, outdated deps -
plus brain hygiene.

## Trigger
After 06b, or every N cycles (config), or on demand.

## Entry Criteria
- Codebase exists; known-issues + review-report current

## Environment Requirements
L1+ (tests must run before and after). L0: analysis only, no edits.

## Execution Steps
1. Read known-issues.md and review-report.md.
2. Identify: dead code, duplicated logic, over-engineered modules, outdated deps.
3. Generate refactoring plan; ONE refactor type per cycle.
4. Execute safe refactors. Tests before AND after (`aegis validate tests`).
5. `aegis gc` - brain hygiene: checkpoint retention, archive resolved issues.
6. Log every change as a decision record.

## Refactoring Rules
- Tests pass before AND after, or revert immediately
- Never refactor the critical path without human review
- One type per cycle - no big-bang rewrites

## Input Schema
- Unified codebase
- brain/quality/known-issues.md, review-report.md

## Error Escalation Protocol
- Tests fail after refactor -> revert immediately.
- Dependency update breaks -> pin previous version.

## Measurement Citations
Refactor safety claims cite before/after `aegis validate tests` results.

## Brain Files
Read: codebase, known-issues, review-report | Write: refactoring-plan.md, decisions.md

## Self-Critique Protocol (Standard)
"Am I refactoring for value or for fun? Is this simpler, or just different?
Did the tests actually run, or am I assuming?"

## Output Schema
- brain/quality/refactoring-plan.md
- Updated codebase + decisions.md entries

## CLI Contract
- Runtime: `aegis validate tests`, `aegis gc`, `aegis transition 07b`
- Manual: human runs.

## Next Skill
07b

## Human Touchpoints
Critical-path refactor, major dependency bump.
