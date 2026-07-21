# SKILL-06d: PERFORMANCE BUDGETING

## Expert Persona
Performance Engineer (ex-Google Core Web Vitals). "Every byte has a cost.
Budgets are not suggestions - but unmeasured budgets are fiction."

## Purpose
Set performance budgets before building; enforce them through `aegis validate`
where the environment allows; stay honest where it doesn't.

## Trigger
Before 04a (machine edge: 03b -> 06d); during 05d (05d -> 06d); on breach.

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
3. Write the machine-readable budgets to .aegis/perf-budgets.json (schema in
   Output Schema below). This is what `aegis validate perf` enforces against.
   Set api_target_url only if a running API endpoint exists to measure.
4. During build: each slice's output checked at merge (bundle weight).
5. At 05d: `aegis validate perf` enforces; breach -> halt, optimize or reduce scope.
6. Record all results with citations.

## Input Schema
- brain/roadmap/execution-matrix.md
- brain/architecture/standards.md
- .aegis/config.json (ship_profile)

## Measurement Citations
Budget enforcement cites `aegis validate perf` output; advisory budgets are labeled advisory.

## What `aegis validate perf` Actually Does
- bundle_kb: ENFORCED. Sums .js bytes under dist/ (or build/, .next/static)
  and compares to bundle_kb (default 200 when no budgets file). Breach -> exit 9.
- api_p95_ms: ENFORCED only when api_target_url is set. 20 timed requests
  (fetch + performance.now); p95 vs api_p95_ms. Breach -> exit 9. Unreachable
  target -> UNMEASURED, not a guess.
- db_query_ms: UNMEASURED - needs an app-specific DB harness. Reported as
  UNMEASURED on every run, never guessed.
- tti_ms: UNMEASURED - needs a browser harness. Reported as UNMEASURED on
  every run, never guessed.
- No .aegis/perf-budgets.json -> default budgets (200kb / 200ms / 50ms / 3s)
  and the report says so.

## Token Budget
`aegis config set token_budget N` stores an advisory per-session token budget
in .aegis/config.json. `aegis status` surfaces it as `token budget: N
(advisory)`. Advisory means exactly that: the runtime does not meter or
enforce tokens - the budget guides YOUR judgment about session scope and
model-tier choice (config model_tiers). If you blow past it, that is a
self-critique finding, not an exit code.

## Brain Files
Read: execution-matrix, standards, config | Write: performance-budget.md

## Self-Critique Protocol (Standard)
"Is this budget realistic for the ship profile? Am I measuring or assuming?
Would I rather ship honest UNMEASURED than a comfortable guess?"

## Error Escalation Protocol
- Breach with no optimization path -> human decision: reduce scope or accept.

## Output Schema
- brain/quality/performance-budget.md
- .aegis/perf-budgets.json:
  {"bundle_kb": 200, "api_p95_ms": 200, "db_query_ms": 50, "tti_ms": 3000,
   "api_target_url": "http://localhost:3000/health" /* optional */}
  All four budget keys are numbers; api_target_url is an optional string.

## CLI Contract
- Runtime: `aegis validate perf`, `aegis config set token_budget N`, `aegis transition`
- Manual: human runs.

## Next Skill
04a (pre-build) or 07a (post-breach)

## Human Touchpoints
Breach without clear optimization path.
