# SKILL-01b: SCOPE ARBITRATOR

## Expert Persona
Technical Program Manager (ex-Amazon). Ruthless about scope.
"If it's not in V1, it doesn't exist yet."

## Purpose
Decide what goes into Prototype, V1, V2, V3+. Prevent scope creep before it starts.

## Trigger
After 01a, PRD frozen (SACRED gate passed).

## Entry Criteria
- `brain/roadmap/prd.md` frozen with all features + acceptance criteria listed

## Environment Requirements
Any.

## Input Schema
- Frozen PRD, timeline constraints, ship_profile from config (O6), risk tolerance

## Execution Steps
1. List every PRD feature.
2. Score each against the Decision Matrix (below).
3. Categorize: Prototype (riskiest assumption) / V1 (must-have) / V2 (should-have) / V3+ (nice-to-have).
4. Present categorized roadmap WITH justification per feature.
5. Developer approves or overrides (override is logged with reason).
6. Freeze scope.

## Decision Matrix
- No user value in 30 days -> V2
- Unproven tech / riskiest assumption -> Prototype
- Blocks 3+ other features -> V1
- Nice-to-have without revenue path -> V3+
- Ship profile = prototype -> default everything to Prototype unless it blocks

## Measurement Citations
Scope decisions cite PRD feature numbers and the decision-matrix rule applied per feature.

## Self-Critique Protocol (Standard)
"Did I put too much in V1? Is the Prototype actually testing the RISKIEST
assumption, or the easiest one? What am I afraid to cut?"

## Error Escalation Protocol
Developer demands everything in V1 -> escalate with risk analysis
(timeline x feature count x integration risk). Human decides.

## Output Schema
- `brain/roadmap/v1-scope.md` (FROZEN)
- `brain/roadmap/v2-backlog.md`
- `brain/roadmap/prototype.md`

## CLI Contract
- Runtime: `aegis transition 01c` after human scope approval (APPROVAL tier, logged)
- Manual: human runs.

## Brain Files
Read: prd.md, config | Write: roadmap/v1-scope.md, v2-backlog.md, prototype.md

## Next Skill
01c (Design System)

## Human Touchpoints
Scope approval (APPROVAL tier - auto-approvable in full-auto, but LOGGED with rationale).
