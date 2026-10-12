---
name: 05e-exploratory
version: 0.6.0
triggers: [exploratory scenarios, edge case hunt, what-if sweep]
not-triggers: [rational-tests-only, reasoned walks presented as executed]
inputs: [codebase, personas, user flows]
outputs: [exploratory test report]
chains-to: 06b-code-review
autonomy: L1
tokens-budget: 800
---
# SKILL-05e: EXPLORATORY TESTING

## Overview
Find the edge cases no rational test would catch.
The user will do things you can't imagine; imagine them first.

## When
- After 05d, or on demand; standard tests pass (or UNVERIFIED-labeled).
- Generation L0+; execution L1+.

## When-NOT
- Never present reasoned-through scenarios as executed; label STATIC REVIEW.
- Categories always: extreme scale, slowness, creativity, malice, state.

## Process
- Read personas + flows: `aegis status`
- Generate "what if" scenarios per category, tied to THIS system's actual flows: `aegis status`
- Execute live (L1+) or reason through (L0, labeled): `aegis validate e2e`
- Document behavior; flag unexpected outcomes; self-critique; present: `aegis status`
- Advance to review: `aegis transition 06b`

## Verification
- Executed scenarios cite commands; reasoned ones labeled STATIC REVIEW.
- Self-check: weird enough? bored teenager? hacker with time? cat on keyboard?

## Red Flags
- Critical break -> immediate fix flag.
- Design-level flaw -> architecture review (rollback 02a).

## Interactions
- CLI: `aegis validate e2e`, `aegis transition 06b`.
- Brain: read `personas/*`, `user-flows.md`; write exploratory-test-report.
- Next: `06b-code-review`. Touchpoint: critical flaw found.
