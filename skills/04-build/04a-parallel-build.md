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
L1+ for real worktrees/builds. At L0: sequential plan only, labeled
SEQUENTIAL-ONLY (N4 platform honesty); parallel claims are forbidden.

## Input Schema
- brain/roadmap/execution-matrix.md, brain/execution/parallel-lanes.md
- brain/architecture/standards.md, module graph (.aegis/ast/module-graph.json)
- src/contracts/ (immutable baseline every slice compiles against)

## Execution Steps
1. Read execution matrix; identify parallel-ready slices (DAG level 0).
   Two slices are parallelizable ONLY if neither writes a module the other
   imports - confirm against .aegis/ast/module-graph.json, not intuition.
2. For each slice: compose the team from the template library
   (brain/execution/teams/library/ + global registry). Justify each role.
   Store composed team in the repo library.
3. `aegis slice create <name>` per slice. The lane cap (N5) is the only
   throttle: `aegis slice create` refuses beyond it - queue, never bypass.
   Verify live lanes with `aegis slice list` before spawning the next wave.
4. Assign each agent ONLY: its slice spec, contract code, its module
   subgraph, standards. Isolation by data, not instruction.
5. RED gate first (per slice, mandatory): the agent writes the failing test
   that reproduces the slice behavior BEFORE any production code. Run the
   suite (`aegis validate tests` or the project runner) and confirm RED is
   caused by the intended missing behavior - not a syntax error or broken
   setup. No production code is written until RED is confirmed. A test that
   was written but never compiled/run does not count as RED.
6. GREEN: write minimal code to make the test pass; rerun the SAME test
   target and confirm it flips green. Only then refactor, with tests held
   green. This is the RED/GREEN/REFACTOR cycle the 03b standards locked in.
7. Per-slice evidence map: each slice records task -> test target -> RED
   proof -> GREEN proof -> coverage line, stored in the slice's worktree so
   04b/05a can verify without re-deriving. Quote the actual command and its
   output; never invent a PASS result for a test that was not run.
8. Checkpoint after each slice passes GREEN: `aegis checkpoint` (recorded and
   hashed). Do not squash RED/GREEN commits until the evidence map preserves
   them - reviewers must still answer "what was verified, and how".
9. Integration order is DAG order, not completion order. A finished slice
   that depends on an unfinished one WAITS. Hand completed branches to 04b
   level by level; never merge out of order.
10. Before any merge: `aegis merge check <branch>` (N3 oracle). A slice that
    edits src/contracts/ is refused - implement an adapter in feature code.
    Nothing-to-merge (exit 13) means the slice produced nothing:
    investigate, never count it as done.
11. Self-critique; hand the level-0 batch to 04b.

## Team Composition Rules
- Base roles from registry only - no invented roles
- Add specializations where the slice domain matches
- May duplicate roles for critical slices (e.g., 2 QA on payments)
- Justify every selection in the team file (template: brain/_templates/team-template.md)

## Self-Critique Protocol (Deep)
"Did I spawn agents that will conflict? Are the contracts tight enough that a
violation is a compile error? What if two slices need the same DB table -
did 03a coordinate it into the contract PR? Did every slice prove RED before
GREEN, or did one skip the gate? Is my integration order the DAG, or just
whoever finished first? Will `aegis merge check` pass on every branch I hand
to 04b?"

## Error Escalation Protocol
- Agent fails -> retry once -> human or sequential queue.
- RED cannot be reproduced / tests green from the start -> the behavior
  already exists or the test is wrong; stop and reconcile before GREEN.
- Contract violation discovered mid-build -> STOP all lanes, rollback to 03a
  (or 02b if the contract itself is wrong); contracts are immutable in a slice.
- Lane cap reached -> queue; never exceed (N5). `aegis slice create` enforces.
- `aegis merge check` refused (exit 9) -> read the oracle, fix the cause;
  exit 13 (nothing to merge) -> investigate, never mark done.

## Output Schema
- Slice branches aegis/slice-<name> in registered worktrees
- Per-slice evidence map (task -> RED -> GREEN -> coverage)
- brain/execution/teams/library/[team-id].md
- Updated brain/execution/parallel-lanes.md

## Measurement Citations
Lane usage cites `aegis status` / `aegis slice list` output. Team sizes cite
the team file. RED/GREEN claims cite the actual test command run and its
output; coverage cites `aegis validate tests`. Merge readiness cites
`aegis merge check <branch>`. Unverified claims are labeled UNMEASURED.
Reference: ECC project (MIT), adapted.

## CLI Contract
- Runtime: `aegis slice create|list`, `aegis lane open|close`, `aegis checkpoint`, `aegis status`
- Manual: human runs; agent plans sequentially.

## Brain Files
Read: execution-matrix, parallel-lanes, standards, module graph
Write: parallel-lanes (updated), teams/library/, per-slice evidence maps

## Next Skill
04b (Integration Orchestrator)

## Human Touchpoints
Repeated agent failure; contract violation mid-build; lane cap contention.
