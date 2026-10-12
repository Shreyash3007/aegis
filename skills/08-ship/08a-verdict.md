---
name: 08a-verdict
version: 0.6.0
triggers: [ship go no-go, release gates evaluation, deployment manifest]
not-triggers: [eager shipping, stale report passes]
inputs: [quality reports, ship profile]
outputs: [verdict report, deployment manifest]
chains-to: 08b-post-ship-monitor
autonomy: L0
tokens-budget: 800
---
# SKILL-08a: VERDICT & SHIP

## Overview
Final Go/No-Go with explicit, measurable criteria and rollback routing.
Ship is a verb with a definition; unready means no ship.

## When
- After 07c, or on ship request; all quality reports exist.
- L1+ for measured gates; at L0 UNMEASURED gates = automatic production No-Go.

## When-NOT
- Never eager shipping; never passing on stale or UNMEASURED reports.
- Prototype profile: security + bugs mandatory, perf advisory — still explicit.

## Process
- Read all quality reports: `aegis status`
- Evaluate each gate vs threshold, citing source per gate (PRD coverage >=95%; security 100%; a11y AA; 0 critical/<=3 minor bugs; perf budgets CITED; zero UNMEASURED on gate metrics): `aegis status`
- All pass -> generate deployment manifest: `aegis status`
- Any fail -> explicit rollback with reason (coverage -> 04a; security -> 02c; perf -> 04a/03a; bugs -> 05c): `aegis transition`
- Present verdict with per-gate rationale; advance only on G4: `aegis transition 08b`

## Verification
- Every verdict cites source report + measured value.
- Override path only: explicit "I accept the risk" -> ship-override gate, logged forever.
- Self-check: too eager? 48-hour regret? stale/UNMEASURED pass?

## Red Flags
- Any gate UNMEASURED (production) -> automatic No-Go, route to owning skill.

## Interactions
- CLI: `aegis transition 08b` (G4-blocked); human: `aegis gate G4 --approve`.
- Brain: read all quality reports; write verdict-report + manifest.
- Next: `08b-post-ship-monitor`. Touchpoint: SACRED G4, ALWAYS human.
