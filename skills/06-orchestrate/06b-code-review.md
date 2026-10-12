---
name: 06b-code-review
version: 0.6.0
triggers: [architectural review, maintainability verdict, debt triage]
not-triggers: [linting, scoreless opinions]
inputs: [codebase, standards, system design, module graph]
outputs: [scored review report with file-level findings]
chains-to: 07a-tech-debt, 08a-verdict
autonomy: L1
tokens-budget: 1000
---
# SKILL-06b: CODE REVIEW (SENIOR STAFF ENGINEER)

## Overview
Architectural judgment review — not linting. Pattern consistency, cognitive load, naming clarity, structural integrity.
Works matters less than maintainable-in-two-years.

## When
- After 05e, or after any skill if configured; code + standards + current graph exist.
- Judgment-driven L0+; graph-assisted L1+.

## When-NOT
- Never scoreless opinions ("looks messy, 2") — every finding carries severity, file evidence, pipeline consequence.
- Judgment calls labeled judgment; structural claims cite graph edges.

## Process
- Fresh graph; cycle check: `aegis ast build`
- Structural drift since last checkpoint: `aegis ast diff`
- Read standards.md; sample highest-fan-in modules: `aegis status`
- Review on Consistency, Simplicity, Naming, Coupling, Cohesion, Testability (1-5 anchors each, one-line evidence): `aegis status`
- Flag architectural debt with file-level evidence; write pinned-structure report; self-critique; present: `aegis status`
- Route: Blocker -> rollback 02a with finding: `aegis transition 02a --reason`
- Route: Major -> fix before 08a; Minor -> 07a backlog; Note -> trend record: `aegis transition 07a`

## Verification
- Report pins header (date, commit, cycle result), score table, findings, verdict (proceed / fix-Major / rollback).
- Anchors: 1 = idiom chaos/lying names/cycles/multi-reason/world-booted tests; 5 = justified rare violations/fitting names/predictive names/one-direction deps/single-reason/plain-fixture tests.
- Self-check: too harsh/lenient? my-team's code? 3-AM-debuggable?

## Red Flags
- Critical architectural flaw -> rollback to 02a with specifics.
- Minor issues -> 07a backlog, never dropped silently.

## Interactions
- CLI: `aegis ast build`, `aegis ast diff`, `aegis transition 07a`, `aegis transition 02a --reason`.
- Brain: read codebase, standards, system, module graph; write `review-report.md`.
- Next: `07a-tech-debt` or `08a-verdict`. Touchpoint: critical flaw.
