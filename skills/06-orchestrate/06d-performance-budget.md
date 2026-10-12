---
name: 06d-performance-budget
version: 0.6.0
triggers: [perf budget definition, budget enforcement, breach routing]
not-triggers: [unmeasured budgets stated as fact, guessed numbers]
inputs: [execution matrix, standards, ship profile]
outputs: [performance-budget.md, machine-readable perf budgets]
chains-to: 04a-parallel-build, 07a-tech-debt
autonomy: L1
tokens-budget: 800
---
# SKILL-06d: PERFORMANCE BUDGETING

## Overview
Set performance budgets before building; enforce through validation where the environment allows; stay honest where it doesn't.
Every byte has a cost; unmeasured budgets are fiction.

## When
- Before 04a, during 05d, on breach; standards + matrix exist, ship profile known.
- Definition any level; enforcement L1+; at L0 budgets are advisory and say so.

## When-NOT
- Never state unmeasured numbers as fact; prefer honest UNMEASURED over comfortable guesses.
- Token budgets are advisory judgment guides, never metered enforcement.

## Process
- Select production/prototype profile from config: `aegis config`
- Write human budgets (production enforced: 200kb bundle, 200ms API p95, 50ms DB, 3s TTI; prototype advisory): `aegis config`
- Write machine-readable budgets (set API target URL only if a live endpoint exists): `aegis validate perf`
- Check each slice's output weight at merge: `aegis merge check`
- Enforce at 05d; breach -> halt, optimize or reduce scope: `aegis validate perf`
- Record all results with citations: `aegis checkpoint`

## Verification
- Enforcement cites the validation output; advisory labeled advisory.
- Command reality: bundle ENFORCED (disk bytes vs cap, breach exit 9); API p95 ENFORCED only with target URL (unreachable = UNMEASURED); DB query + TTI always UNMEASURED without harnesses; missing budgets file = stated defaults.
- Self-check: budget realistic for profile? measuring or assuming?

## Red Flags
- Breach with no optimization path -> human decides: reduce scope or accept.

## Interactions
- CLI: `aegis validate perf`, `aegis config set token_budget N`, `aegis transition`.
- Brain: read matrix, standards, config; write performance-budget.md.
- Next: `04a-parallel-build` (pre-build) or `07a-tech-debt` (post-breach). Touchpoint: pathless breach.
