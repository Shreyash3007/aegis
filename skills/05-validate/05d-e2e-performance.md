# SKILL-05d: E2E & PERFORMANCE VALIDATION

## Expert Persona
Performance Engineer (ex-Google, ex-Meta). "If it doesn't meet the SLO, it
doesn't ship. And if you didn't measure it, it doesn't meet it."

## Purpose
Execute acceptance criteria end-to-end and enforce performance budgets with
real measurements.

## Trigger
After 05c.

## Entry Criteria
- Bugs documented; UX flaws addressed or accepted

## Environment Requirements
**L1+ only.** At L0 this skill becomes "Performance Risk Review" - static
bundle/dependency/query analysis, every output stamped UNVERIFIED.

## Execution Steps
1. Build + type verification first: the app builds and `aegis typecheck` is
   clean before any slower suite runs. A red build stops here - do not spend a
   perf run on something that does not compile.
2. `aegis validate e2e` - Playwright acceptance flows (where configured).
3. `aegis validate tests` - full suite, with coverage; record passed/total and
   the coverage number.
4. `aegis validate perf` - bundle size and API p95 against the budgets in
   .aegis/perf-budgets.json (see Performance Budgets). Read the command output
   line by line; each line names its tool and PASS/FAIL/UNMEASURED.
5. Load simulation (L2 / k6 where available): concurrent users, slow networks.
   L0/L1 with no harness -> label the load number UNMEASURED, do not invent it.
6. Chaos checks (L1+): kill DB connection, drop API response, offline.
7. Cross-device: mobile viewport, touch, reduced motion.
8. Treat acceptance criteria as evals: capability checks (can the user do the
   new thing) and regression checks (did the old thing stay working). Grade
   deterministically where possible (code/rule grader); use a model grader only
   for open-ended output and never let a flaky grader gate a release. Track
   reliability with pass@k (>=90% for capability) and pass^3 (100% for any
   release-critical path) - a single run is not a result.
9. Diff review: inspect every changed file for unintended edits, missing error
   handling, and edge cases the suites did not cover.
10. Run verification at every checkpoint, not only at the end - a failure found
    late costs more to localize. Re-run the suites after each fix, not once.
11. Compare all results against budgets; self-critique; present a verification
    report where every number cites tool + command + environment level.

## Performance Budgets (production profile; prototype = advisory)
- Bundle: 200kb initial | API p95: 200ms | DB query: 50ms | TTI: 3s
- Source of truth: `.aegis/perf-budgets.json`, written at skill 06d. Schema:
  { bundle_kb, api_p95_ms, db_query_ms, tti_ms, api_target_url? }. When the
  file is absent or unparseable, `aegis validate perf` falls back to these
  defaults and says so - never silently.
- What the command actually measures: JS bundle size on disk vs bundle_kb
  (measured), and API p95 over 20 requests vs api_p95_ms when api_target_url
  is set (measured). db_query_ms and tti_ms are UNMEASURED without an app DB /
  browser harness - report them as UNMEASURED with the cause, never as pass.
- A breach fails the suite (exit 9) and routes to 06d for a budget re-check or
  scope reduction. A budget you cannot measure is a gap to fix, not a pass.

## Input Schema
- Unified codebase
- brain/roadmap/prd.md (acceptance criteria)
- brain/quality/known-issues.md
- .aegis/perf-budgets.json (budget source; absent -> defaults)

## Brain Files
Read: prd.md, known-issues.md | Write: validation-report.md, performance-benchmarks.md

## Self-Critique Protocol (Standard)
"Did I measure realistic load or ideal load? What happens at 10x? Is any
number in my report unmeasured - and if so, is it labeled? Did I grade
happy-path only, or did I exercise the error and edge paths? Is a flaky or
model grader gating a release decision it shouldn't? Did I chase pass rate
while ignoring latency or cost drift?"

## Error Escalation Protocol
- Budget exceeded -> 06d (budget re-check, machine edge 05d -> 06d), then flag
  for optimization or scope reduction.
- Acceptance criterion fails -> 04a as a bug with the failing eval/flow as
  evidence; do not declare the feature done.
- Chaos test fails -> flag for resilience work.
- Suite red at L0 (no harness) -> report UNVERIFIED with the missing tool named;
  never mask it as a pass.

## Output Schema
- brain/quality/validation-report.md: a verification report (build, types,
  tests + coverage, e2e, perf, chaos, diff) with a PASS/FAIL/UNMEASURED per
  line and a READY / NOT READY verdict; capability + regression eval results.
- brain/quality/performance-benchmarks.md: every budget vs measured value,
  each citing tool + command + environment level. Keep the prior run as the
  regression baseline so a drift between releases is visible, not just the
  current number against the budget.

## Measurement Citations
Every number cites tool + command + environment level. UNMEASURED where the
tool didn't exist - name the missing harness. Perf values cite the
`aegis validate perf` output and the budget source (.aegis/perf-budgets.json
or default). No exceptions.
Reference: ECC project (MIT), adapted.

## CLI Contract
- Runtime: `aegis validate e2e|tests|perf`, `aegis typecheck`, `aegis transition 05e`
- Manual: human runs.

## Next Skill
05e

## Human Touchpoints
Budget breach or chaos failure (APPROVAL tier).
