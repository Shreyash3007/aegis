---
name: 07a-tech-debt
version: 0.6.0
triggers: [refactoring cycle, dead code sweep, brain hygiene]
not-triggers: [big-bang rewrites, critical-path edits without review]
inputs: [codebase, known issues, review report]
outputs: [refactoring plan, updated code, decision records]
chains-to: 07b-observability
autonomy: L2
tokens-budget: 800
---
# SKILL-07a: TECH DEBT & REFACTORING PIPELINE

## Overview
Scheduled cleanup: dead code, duplication, over-engineering, outdated deps — plus brain hygiene.
Debt is fine if paid down; ignored debt is bankruptcy.

## When
- After 06b, every N cycles, or on demand; issues + review current.
- L1+ (tests run before and after); L0 analysis only, no edits.

## When-NOT
- Never big-bang rewrites: ONE refactor type per cycle.
- Never critical-path refactors without human review.

## Process
- Read known-issues + review-report; identify dead code, duplication, over-engineering, outdated deps: `aegis status`
- Generate refactoring plan, one type per cycle: `aegis status`
- Execute with tests before AND after; revert immediately on failure: `aegis validate tests`
- Brain hygiene (retention, archive resolved): `aegis gc`
- Log every change as a decision record; advance: `aegis transition 07b`

## Verification
- Safety claims cite before/after validation results.
- Self-check: value or fun? simpler or just different? tests actually run?

## Red Flags
- Post-refactor test failure -> revert immediately.
- Dependency break -> pin previous version.

## Interactions
- CLI: `aegis validate tests`, `aegis gc`, `aegis transition 07b`.
- Brain: read codebase, known-issues, review-report; write refactoring-plan, decisions.
- Next: `07b-observability`. Touchpoints: critical-path refactor, major dep bump.
