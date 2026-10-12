---
name: 05d-e2e-performance
version: 0.6.0
triggers: [e2e acceptance run, perf budget enforcement, chaos checks]
not-triggers: [unmeasured numbers, invented load figures]
inputs: [codebase, acceptance criteria, known issues, perf budgets]
outputs: [verification report, benchmark baseline]
chains-to: 05e-exploratory
autonomy: L1
tokens-budget: 1200
---
# SKILL-05d: E2E & PERFORMANCE VALIDATION

## Overview
Execute acceptance criteria end-to-end and enforce performance budgets with real measurements.
If it doesn't meet the SLO it doesn't ship; if you didn't measure it, it doesn't meet it.

## When
- After 05c; bugs documented, UX flaws addressed or accepted.
- L1+ only; at L0 this becomes Performance Risk Review (static only, all UNVERIFIED).

## When-NOT
- Never spend a perf run on a red build; never invent load numbers without a harness.
- Never let a flaky/model grader gate a release; a single run is not a result.

## Process
- Build + typecheck clean before slower suites; red build stops here: `aegis typecheck`
- Acceptance flows via e2e harness where configured: `aegis validate e2e`
- Full suite with coverage; record passed/total + coverage: `aegis validate tests`
- Bundle + API p95 vs budgets (source: perf-budgets file or stated defaults, never silent): `aegis validate perf`
- Load simulation where available (concurrent users, slow networks), else UNMEASURED: `aegis validate perf`
- Chaos checks (kill DB, drop API, offline); cross-device (mobile, touch, reduced motion): `aegis validate`
- Acceptance-as-evals (capability pass@k>=90%, release-critical pass^3=100%; deterministic graders first): `aegis validate tests`
- Diff review of every changed file; verify at every checkpoint, re-run after each fix: `aegis status`
- Compare all results vs budgets; present cited verification report with READY/NOT READY: `aegis transition 05e`

## Verification
- Every number cites tool + command + environment level; missing harness named, never masked.
- Budgets (production; prototype advisory): 200kb bundle, 200ms API p95, 50ms DB query, 3s TTI; unmeasurable items reported UNMEASURED with cause.
- Prior run kept as regression baseline so drift is visible.
- Self-check: realistic or ideal load? 10x behavior? unmeasured unlabeled numbers? error/edge paths graded? latency/cost drift ignored?

## Red Flags
- Budget exceeded -> 06d re-check, then optimization or scope reduction flag.
- Acceptance criterion fails -> 04a as a bug with failing eval/flow evidence.
- Chaos failure or suite red without harness -> resilience flag / UNVERIFIED report.

## Interactions
- CLI: `aegis validate e2e|tests|perf`, `aegis typecheck`, `aegis transition 05e`.
- Brain: read `prd.md`, known-issues; write validation-report, performance-benchmarks.
- Next: `05e-exploratory`. Touchpoint: budget breach or chaos failure.
