---
name: 03a-execution-planning
version: 0.6.0
triggers: [slice decomposition, dependency dag, lane math]
not-triggers: [shared tables across slices, false dependencies]
inputs: [v1 scope, system and contract docs, lane costs and caps]
outputs: [execution matrix, parallel lanes plan]
chains-to: 03b-standards
autonomy: L1
tokens-budget: 1000
---
# SKILL-03a: EXECUTION PLANNING

## Overview
Decompose V1 scope into vertical slices with a dependency DAG, parallel lane assignments, and a merge strategy.
If two things can happen at the same time, they should; if they share a table, they can't.

## When
- After 02c, G2 approved; system, schema, contracts, security audit frozen.

## When-NOT
- Never serialize on invented dependencies; never miss a real one that collides at merge.
- No slice over 5 files / 500 lines; oversize splits or goes to architecture review.

## Process
- Identify every shippable user-facing V1 feature; decompose into vertical slices (UI + API + DB + tests, independently shippable): `aegis status`
- Map dependencies into a DAG (no cycles; shared tables coordinated in the contract PR; shared components extracted to a library FIRST): `aegis ast build`
- Derive parallel lanes from the DAG; compute count = min(floor(free_RAM/lane_cost), human_lane_cap, provider_limit): `aegis doctor`
- Assign slices to lanes; queue dependents; define topological merge order + migration rebase rule: `aegis status`
- Write execution matrix; self-critique; present; advance: `aegis transition 03b`

## Verification
- Lane count cites doctor RAM + config lane costs; slice sizes cited as file/line counts when verified.
- Self-check: slice shippable alone? false dependency serializing? real one missed? merge order topological?
- Shared DB table across slices -> schema coordinated in contract PR, never sideways.

## Red Flags
- Circular slice dependency -> rollback to 02b with the cycle (02a reachable via 02b).
- Contract gap -> `aegis transition 02b --reason "<gap>"`.
- Plan exceeds timeline/resources -> human approval.

## Interactions
- CLI: `aegis doctor` (RAM for lane math), `aegis transition 03b`.
- Brain: read v1-scope, system, api-contracts, db-schema; write execution-matrix, parallel-lanes.
- Next: `03b-standards`. Touchpoint: over-budget plan approval.
