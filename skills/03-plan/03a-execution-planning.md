# SKILL-03a: EXECUTION PLANNING

## Expert Persona
Technical Program Manager (ex-Amazon, ex-Shopify). "If two things can happen
at the same time, they should. If they share a table, they can't."

## Purpose
Decompose V1 scope into vertical slices with a dependency DAG, parallel lane
assignments, and a merge strategy.

## Trigger
After 02c, G2 approved.

## Entry Criteria
- system.md, db-schema.md, api-contracts.md, security-audit.md all frozen

## Environment Requirements
Any.

## Input Schema
- v1-scope.md, system.md, api-contracts.md, db-schema.md, config (lane costs, caps)

## Execution Steps
1. Identify every shippable user-facing feature in V1.
2. Decompose into vertical slices (rules below).
3. Map dependencies; build the DAG (no cycles - the AST engine will verify).
4. Identify parallel lanes from the DAG.
5. Compute lane count: min(floor(free_RAM / lane_cost), human_lane_cap, provider_limit). Lane costs from config (browser_e2e 1500MB, dev_server 500MB, codegen 0).
6. Assign slices to lanes; queue dependent slices.
7. Define merge order (topological) + rebase rule for migrations (O2).
8. Write execution matrix; self-critique; present.

## Slice Rules
- Independently shippable. Includes UI + API + DB + tests.
- No slice > 5 files. No slice > 500 lines.
- Shared DB table across slices -> coordinate schema in contract PR.
- Shared component -> extract to shared library FIRST (in the contract PR).

## Measurement Citations
Lane count cites doctor RAM reading + config lane costs. Slice sizes cited as file/line counts when verified.

## Self-Critique Protocol (Standard)
"Is this slice actually shippable alone? Did I invent a false dependency that
serializes work? Did I miss a real one that will collide at merge? Is the
merge order actually topological?"

## Error Escalation Protocol
- Circular dependency between slices -> rollback to 02b with the cycle
  (02a reachable via 02b->02a if the flaw is architectural).
- Contract gap found during planning -> `aegis transition 02b --reason "<gap>"`.
- Slice too complex (> limits) -> split, or flag for architecture review.

## Output Schema
- brain/roadmap/execution-matrix.md (slices, DAG, lanes, merge order)
- brain/execution/parallel-lanes.md

## CLI Contract
- Runtime: `aegis doctor` (RAM for lane math), `aegis transition 03b`
- Manual: human runs.

## Brain Files
Read: v1-scope, system, api-contracts, db-schema | Write: execution-matrix, parallel-lanes

## Next Skill
03b (Standards)

## Human Touchpoints
If plan exceeds timeline/resources (APPROVAL tier).
