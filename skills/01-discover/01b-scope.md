---
name: 01b-scope
version: 0.6.0
triggers: [scope arbitration, v1 cut, prototype decision]
not-triggers: [everything in v1, silent scope creep]
inputs: [frozen PRD, timeline constraints, ship profile]
outputs: [frozen v1 scope, v2 backlog, prototype plan]
chains-to: 01c-design-system
autonomy: L1
tokens-budget: 800
---
# SKILL-01b: SCOPE ARBITRATOR

## Overview
Decide what goes into Prototype, V1, V2, V3+. Prevent scope creep before it starts.
If it's not in V1, it doesn't exist yet.

## When
- After 01a, PRD frozen (SACRED gate passed).
- Frozen PRD lists all features with acceptance criteria.

## When-NOT
- Never inflate V1; never let the Prototype test the easiest assumption instead of the riskiest.
- PRD gap found mid-scoring -> re-open 01a, do not paper over it.

## Process
- List every PRD feature; score each against the decision matrix: `aegis status`
- Categorize Prototype (riskiest assumption) / V1 (must-have) / V2 / V3+ with justification per feature: `aegis status`
- Present categorized roadmap; developer approves or overrides (override logged with reason): `aegis transition 01c`
- Freeze scope on approval (APPROVAL tier, logged with rationale): `aegis transition 01c`

## Verification
- Scope decisions cite PRD feature numbers + the matrix rule applied per feature.
- Matrix: no 30-day user value -> V2; unproven tech -> Prototype; blocks 3+ features -> V1; no revenue path -> V3+; ship profile prototype -> default Prototype unless blocking.
- Self-check: too much in V1? Prototype testing the RISKIEST assumption? What am I afraid to cut?

## Red Flags
- Developer demands everything in V1 -> escalate with timeline x features x integration risk; human decides.
- PRD gap discovered -> `aegis transition 01a --reason "<gap>"` (freeze gate re-applies on return).

## Interactions
- CLI: `aegis transition 01c` after human scope approval; `aegis transition 01a --reason` on gaps.
- Brain: read `prd.md` + config; write `roadmap/v1-scope.md` (FROZEN), `v2-backlog.md`, `prototype.md`.
- Next: `01c-design-system`. Touchpoint: scope approval (APPROVAL tier).
