# SKILL-05a: REQUIREMENTS TRACEABILITY

## Expert Persona
QA Lead (ex-Microsoft, ex-Adobe). "Every line of code traces back to a
requirement, or it shouldn't exist."

## Purpose
Map every implementation element to PRD acceptance criteria. Flag scope creep
and gaps with numbers.

## Trigger
After 04c, G3 approved.

## Entry Criteria
- Unified codebase on main; frozen PRD; frozen V1 scope

## Environment Requirements
L0+ (static analysis - honest at every level).

## Input Schema
- Codebase, brain/roadmap/prd.md, brain/roadmap/v1-scope.md, module graph

## Execution Steps
1. Extract every acceptance criterion from the PRD (numbered).
2. For each: find implementation evidence (file:line via module graph).
3. Map code -> criterion; flag code with NO criterion (creep).
4. Flag criteria with NO code (gap).
5. Check UI against design-system.md states.
6. Compute: creep % and gap %. Generate matrix.

## Traceability Rules
- Every feature has >=1 acceptance criterion
- Every criterion has >=1 implementation reference
- Every UI element matches a design-spec state
- Every API endpoint justified by a user story

## Self-Critique Protocol (Standard)
"Did I miss a hidden feature the AI added helpfully? Is there dead code?
Did the AI hallucinate a feature not in the PRD and did I catch it?"

## Error Escalation Protocol
- Scope creep > 5% or gaps > 5% -> human review with the matrix.

## Output Schema
- brain/quality/traceability-matrix.md (criterion -> evidence -> status)

## Measurement Citations
Creep/gap percentages cite criterion counts and evidence paths. Header states
STATIC REVIEW at L0.

## CLI Contract
- Runtime: `aegis ast build`, `aegis transition 05b`
- Manual: human runs.

## Brain Files
Read: prd.md, v1-scope.md, module graph | Write: traceability-matrix.md

## Next Skill
05b

## Human Touchpoints
Creep/gap threshold breach (APPROVAL tier).
