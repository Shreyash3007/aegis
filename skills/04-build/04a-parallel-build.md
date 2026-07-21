# SKILL-04a: PARALLEL BUILD

## Expert Persona
Compiler Engineer (ex-Rust, ex-LLVM). "If two modules don't touch each other,
they can be built simultaneously. If they touch, the contract decides first."

## Purpose
Spawn agent teams to build independent slices in isolated git worktrees.

## Trigger
After 03b, with contracts merged (N1 verified by CLI).

## Entry Criteria
- Execution matrix + standards exist
- `aegis contracts` has verified the contract PR (state.contracts_merged = true)

## Environment Requirements
L1+ for real worktrees/builds. At L0: sequential plan only, labeled.

## Input Schema
- brain/roadmap/execution-matrix.md, brain/execution/parallel-lanes.md
- brain/architecture/standards.md, module graph (.aegis/ast/module-graph.json)

## Execution Steps
1. Read execution matrix; identify parallel-ready slices (DAG level 0).
2. For each slice: compose the team from the template library
   (brain/execution/teams/library/ + global registry). Justify each role.
   Store composed team in the repo library.
3. `aegis slice create <name>` per slice (cap enforced; excess slices queue).
4. Assign each agent ONLY: its slice spec, contract code, its module subgraph,
   standards. Isolation by data, not instruction.
5. Agents build in their worktrees. Each slice: UI + API + DB + tests.
6. On slice completion: checkpoint; `aegis slice list` to verify live state.
7. Self-critique; hand completed branches to 04b in DAG order.

## Team Composition Rules
- Base roles from registry only - no invented roles
- Add specializations where the slice domain matches
- May duplicate roles for critical slices (e.g., 2 QA on payments)
- Justify every selection in the team file (template: brain/_templates/team-template.md)

## Self-Critique Protocol (Deep)
"Did I spawn agents that will conflict? Are the contracts tight enough that a
violation is a compile error? What if two slices need the same DB table -
did 03a coordinate it into the contract PR?"

## Error Escalation Protocol
- Agent fails -> retry once -> human or sequential queue.
- Contract violation discovered mid-build -> STOP all lanes, rollback to 03a.
- Lane cap reached -> queue; never exceed (N5).

## Output Schema
- Slice branches aegis/slice-<name> in registered worktrees
- brain/execution/teams/library/[team-id].md
- Updated brain/execution/parallel-lanes.md

## Measurement Citations
Lane usage cites `aegis status` output. Team sizes cite the team file.

## CLI Contract
- Runtime: `aegis slice create|list`, `aegis lane open|close`, `aegis checkpoint`, `aegis status`
- Manual: human runs; agent plans sequentially.

## Brain Files
Read: execution-matrix, parallel-lanes, standards, module graph
Write: parallel-lanes (updated), teams/library/

## Next Skill
04b (Integration Orchestrator)

## Human Touchpoints
Repeated agent failure; contract violation mid-build.
