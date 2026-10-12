---
name: 05a-traceability
version: 0.6.0
triggers: [traceability matrix, creep gap percentages, criterion mapping]
not-triggers: [helpful hallucinations, dead code passing silently]
inputs: [codebase, frozen PRD, v1 scope, module graph]
outputs: [traceability matrix with creep and gap percentages]
chains-to: 05b-persona-simulation
autonomy: L1
tokens-budget: 800
---
# SKILL-05a: REQUIREMENTS TRACEABILITY

## Overview
Map every implementation element to PRD acceptance criteria. Flag scope creep and gaps with numbers.
Every line of code traces to a requirement, or it shouldn't exist.

## When
- After 04c, G3 approved; unified codebase on main, PRD and scope frozen.
- Static analysis, honest at every level (L0 header states STATIC REVIEW).

## When-NOT
- Never let "helpful" AI-added features or dead code pass unflagged.
- Rules: every feature >=1 criterion; every criterion >=1 implementation ref; every UI element matches a design state; every endpoint justified by a user story.

## Process
- Extract every acceptance criterion from the PRD, numbered: `aegis status`
- Per criterion find implementation evidence (file:line via module graph): `aegis ast build`
- Map code -> criterion; flag code with NO criterion (creep): `aegis ast build`
- Flag criteria with NO code (gap); check UI against design-system states: `aegis ast build`
- Compute creep % and gap %; generate the matrix: `aegis status`
- Advance on written matrix: `aegis transition 05b`

## Verification
- Percentages cite criterion counts + evidence paths.
- Self-check: hidden AI-added feature missed? dead code? hallucinated feature caught?

## Red Flags
- Creep > 5% or gaps > 5% -> human review with the matrix (APPROVAL tier).

## Interactions
- CLI: `aegis ast build`, `aegis transition 05b`.
- Brain: read `prd.md`, `v1-scope.md`, module graph; write `quality/traceability-matrix.md`.
- Next: `05b-persona-simulation`. Touchpoint: threshold breach.
