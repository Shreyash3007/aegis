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
1. `aegis validate e2e` - Playwright acceptance flows (where configured).
2. `aegis validate tests` - full suite.
3. `aegis validate perf` - bundle size vs 200kb budget.
4. Load simulation (L2 / k6 where available): concurrent users, slow networks.
5. Chaos checks (L1+): kill DB connection, drop API response, offline.
6. Cross-device: mobile viewport, touch, reduced motion.
7. Compare all results against budgets; self-critique; present.

## Performance Budgets (production profile; prototype = advisory)
- Bundle: 200kb initial | API p95: 200ms | DB query: 50ms | TTI: 3s

## Input Schema
- Unified codebase
- brain/roadmap/prd.md (acceptance criteria)
- brain/quality/known-issues.md

## Brain Files
Read: prd.md, known-issues.md | Write: validation-report.md, performance-benchmarks.md

## Self-Critique Protocol (Standard)
"Did I measure realistic load or ideal load? What happens at 10x? Is any
number in my report unmeasured - and if so, is it labeled?"

## Error Escalation Protocol
- Budget exceeded -> 06d (budget re-check, machine edge 05d -> 06d), then flag
  for optimization or scope reduction.
- Chaos test fails -> flag for resilience work.

## Output Schema
- brain/quality/validation-report.md
- brain/quality/performance-benchmarks.md

## Measurement Citations
Every number cites tool + command + environment level. UNMEASURED where the
tool didn't exist. No exceptions.

## CLI Contract
- Runtime: `aegis validate e2e|tests|perf`, `aegis transition 05e`
- Manual: human runs.

## Next Skill
05e

## Human Touchpoints
Budget breach or chaos failure (APPROVAL tier).
