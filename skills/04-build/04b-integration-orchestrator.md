---
name: 04b-integration-orchestrator
version: 0.6.0
triggers: [dag merge order, oracle merge gate, conflict resolution]
not-triggers: [adjudicating merges by opinion, counting empty slices]
inputs: [slice branches, execution matrix, module graph]
outputs: [unified main, merge log, updated graph]
chains-to: 04c-integration
autonomy: L2
tokens-budget: 800
---
# SKILL-04b: INTEGRATION ORCHESTRATOR

## Overview
Merge slice branches in DAG order through the merge oracle.
The compiler is the oracle; this skill sequences merges, never adjudicates them.

## When
- After 04a; slice branches exist and registered.
- L1+ (real merges); at L0 integrate manually with a human.

## When-NOT
- Never merge out of topological order; never count nothing-to-merge as done.
- Never resolve conflicts by LLM inspection over compiler output.

## Process
- Read topological merge order from the execution matrix: `aegis status`
- Per branch run the loop-until-clean gate (verify + classify + cycle accounting, 3 cycles = escalate): `aegis clean`
- PASS (exit 0) -> lands; record in merge-log: `aegis merge check`
- NOTHING TO MERGE (exit 13) -> investigate the empty slice, never mark done: `aegis merge check`
- REFUSED (exit 9) -> read oracle output: contract drift (revert edit, adapter in feature code), tsc failure (resolve with compiler context), text conflict (resolve against contract, re-check): `aegis merge check`
- Post-merge impact analysis and graph rebuild: `aegis ast diff`
- Post-merge impact analysis and graph rebuild: `aegis ast build`
- Post-merge checkpoint: `aegis checkpoint`

## Verification
- Every merge cites its oracle exit code; "merges clean" without oracle output is forbidden.
- Conflict categories from compiler output: type mismatch (unify/adapt), missing export (alias/update), signature change (callers/default), circular import (extract; exit-8 detects).
- Self-check: compiles-but-wrong-behavior merge? runtime conflict invisible to types (shared mutable state, ordering)? behavior verified against acceptance criteria, not just types?

## Red Flags
- Unresolvable conflict -> human with both options + compiler context.
- Repeated failure on one slice -> rebuild it in 04a with tighter spec.
- Failing lane blocks siblings -> park it, never let it rot in the queue: `aegis quarantine freeze`
- QUARANTINED refusal -> human clears after review, cycles resume intact: `aegis quarantine clear`

## Interactions
- CLI: `aegis clean`, `aegis merge check`, `aegis quarantine freeze`, `aegis quarantine clear`, `aegis ast diff`, `aegis ast build`, `aegis slice remove`.
- Brain: read execution-matrix + module graph; write `merge-log.md`, AST snapshot via CLI.
- Next: `04c-integration`. Touchpoint: unresolvable semantic conflict.
