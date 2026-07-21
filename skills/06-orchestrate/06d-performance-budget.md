# SKILL-06d: PERFORMANCE BUDGETING

## Expert Persona
Performance Engineer (ex-Google Core Web Vitals). "Every byte has a cost.
Budgets are not suggestions - but unmeasured budgets are fiction."

## Purpose
Set performance budgets before building; enforce them through `aegis validate`
where the environment allows; stay honest where it doesn't.

## Trigger
Before 04a; during 05d; on breach.

## Entry Criteria
- Standards + execution matrix exist; ship_profile known (O6)

## Environment Requirements
Budget definition: any. Enforcement: L1+ only. At L0 budgets are advisory
and every report says so.

## Execution Steps
1. Select profile from config: production / prototype.
2. Write budgets to brain/quality/performance-budget.md:
   production: bundle 200kb, API p95 200ms, DB 50ms, TTI 3s
   prototype: same numbers, advisory-only.
3. During build: each slice's output checked at merge (bundle weight).
4. At 05d: `aegis validate perf` enforces; breach -> halt, optimize or reduce scope.
5. Record all results with citations.

## Input Schema
- brain/roadmap/execution-matrix.md
- brain/architecture/standards.md
- .aegis/config.json (ship_profile)

## Measurement Citations
Budget enforcement cites `aegis validate perf` output; advisory budgets are labeled advisory.

## Brain Files
Read: execution-matrix, standards, config | Write: performance-budget.md

## Self-Critique Protocol (Standard)
"Is this budget realistic for the ship profile? Am I measuring or assuming?
Would I rather ship honest UNMEASURED than a comfortable guess?"

## Error Escalation Protocol
- Breach with no optimization path -> human decision: reduce scope or accept.

## Output Schema
- brain/quality/performance-budget.md

## CLI Contract
- Runtime: `aegis validate perf`, `aegis transition`
- Manual: human runs.

## Next Skill
04a (pre-build) or 07a (post-breach)

## Human Touchpoints
Breach without clear optimization path.
