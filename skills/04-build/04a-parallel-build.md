---
name: 04a-parallel-build
version: 0.6.0
triggers: [slice spawn, worktree build, red green refactor]
not-triggers: [parallel claims at l0, production code before red]
inputs: [execution matrix, lane plan, standards, contracts baseline]
outputs: [slice branches, evidence maps, team files]
chains-to: 04b-integration-orchestrator
autonomy: L2
tokens-budget: 1500
---
# SKILL-04a: PARALLEL BUILD

## Overview
Spawn agent teams to build independent slices in isolated git worktrees.
Two slices build simultaneously only if neither writes a module the other imports.

## When
- After 03b, contracts merged (N1 verified) and DEMO approved with artifact recorded; matrix + standards exist.
- L1+ for real worktrees; at L0 sequential plan only, labeled SEQUENTIAL-ONLY, parallel claims forbidden.
- No lane opens pre-approval: `aegis demo status` shows the artifact AND the DEMO approval before the first slice.

## When-NOT
- Never bypass the lane cap; never merge out of DAG order; never edit contracts inside a slice.
- No production code before confirmed RED; a test never compiled/run does not count.

## Process
- Identify DAG-level-0 slices; confirm parallelizability against the module graph, not intuition: `aegis ast build`
- Compose each team from the template registry only (no invented roles); justify each role; store in repo library: `aegis status`
- Create one worktree per slice; cap is the only throttle — queue, never bypass; verify live lanes before next wave: `aegis slice create`
- Assign each agent ONLY slice spec + contract code + module subgraph + standards (isolation by data): `aegis slice list`
- RED gate per slice: commit the regression test; capture the intended failure (not syntax/setup) with the test path, declared exit, and runner argv: `aegis tdd red`
- GREEN minimal code; commit it without weakening the test; rerun the recorded target; refactor only while green: `aegis tdd green`
- Record per-slice evidence map (task -> test -> RED proof -> GREEN proof -> coverage) in the worktree; quote commands and output: `aegis checkpoint`
- Hand completed branches to 04b level by level in DAG order; a finished slice with unfinished dependencies WAITS: `aegis status`
- Oracle-gate every branch with mandatory RED/GREEN evidence; contract edits refused; exit-13 investigated, never done: `aegis clean <branch> --require-proof`

## Verification
- RED/GREEN claims cite the actual test command + output; coverage cites the validation run; merge readiness cites the oracle.
- Lane usage cites status/slice-list output; team sizes cite the team file.
- Self-check: conflicting agents? contracts tight enough to compile-fail on violation? shared tables coordinated? RED proven everywhere? DAG order or finish order? oracle green on every handoff?

## Red Flags
- Agent fails -> retry once -> human or sequential queue.
- Tests green from the start -> behavior exists or test is wrong; stop and reconcile before GREEN.
- Contract violation mid-build -> STOP all lanes, roll back to 03a (02b if the contract itself is wrong).
- Oracle refused (exit 9) -> read it, fix the cause.

## Interactions
- CLI: `aegis slice create|list`, `aegis lane open|close`, `aegis checkpoint`, `aegis status`, `aegis merge check`, `aegis validate tests`.
- Brain: read matrix, lanes, standards, module graph; write updated lanes, team library, evidence maps.
- Next: `04b-integration-orchestrator`. Touchpoints: repeated failure, mid-build contract violation, cap contention.
