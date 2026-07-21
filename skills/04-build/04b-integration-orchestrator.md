# SKILL-04b: INTEGRATION ORCHESTRATOR (formerly "Semantic Merge Engine")

## Expert Persona
Language Tooling Engineer (ex-TypeScript team). "The compiler is the oracle.
I sequence merges; I don't adjudicate them."

## Purpose
Merge slice branches in DAG order through the merge oracle. LLMs resolve only
the conflicts git surfaces - with compiler output as context.

## Trigger
After 04a (slices complete or a batch ready).

## Entry Criteria
- Slice branches exist (aegis/slice-*), registered via `aegis slice list`

## Environment Requirements
L1+ (real merges). Not available at L0 - integrate manually with human.

## Execution Steps
1. Read merge order from execution matrix (topological).
2. For each branch: `aegis merge check aegis/slice-<name>`.
3. PASS (exit 0) -> merge lands. Record in merge-log.
4. NOTHING TO MERGE (exit 13) -> the slice produced nothing; investigate,
   never count as merged (A1.6).
5. REFUSED (exit 9) -> read the oracle output:
   - CONTRACT DRIFT -> contracts are immutable after N1; revert the contract
     edit in the slice; implement an adapter in feature code instead.
   - tsc failure -> resolve with the compiler output as your context; common
     categories below.
   - text conflict -> resolve against the contract, then re-check.
6. After all merges: `aegis ast diff` for impact analysis; `aegis ast build`.
7. Post-merge checkpoint (post-commit hook handles this).

## Conflict Categories (from compiler output, not LLM inspection)
- Type mismatch -> unify to common supertype or adapter
- Missing export -> restore old name as alias, or update callers
- Signature change -> update callers or add default parameter
- Circular import -> extract shared module (ast build exit 8 detects)

## Input Schema
- Slice branches aegis/slice-* (from `aegis slice list`)
- brain/roadmap/execution-matrix.md (merge order)
- .aegis/ast/module-graph.json

## Self-Critique Protocol (Deep)
"Did I create a merge that compiles but behaves wrong? Is there a runtime
conflict the compiler can't see (shared mutable state, ordering assumptions)?
Did I verify the merged behavior against the acceptance criteria, not just the types?"

## Error Escalation Protocol
- Unresolvable conflict -> human with both options + compiler context.
- Repeated failure on one slice -> rebuild that slice (04a) with tighter spec.

## Output Schema
- Unified codebase on main
- brain/execution/merge-log.md (order, oracle results, resolutions)
- Updated module graph

## Measurement Citations
Every merge cites the oracle exit code. "Merges clean" is not a claim you may
make without `aegis merge check` output.

## CLI Contract
- Runtime: `aegis merge check`, `aegis ast diff`, `aegis ast build`, `aegis slice remove`
- Manual: not available (L1+ only).

## Brain Files
Read: execution-matrix, module graph | Write: merge-log.md, ast snapshot (via CLI)

## Next Skill
04c (Integration & Validation)

## Human Touchpoints
Unresolvable semantic conflict.
