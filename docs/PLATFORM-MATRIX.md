# Platform Capability Evidence Matrix (Phase 11)

**Status: UNVERIFIED until a cell holds evidence.**
No capability may be asserted in docs, skills, or marketing until verified.

## Verification Protocol (per platform)

For each platform, run this exact battery on a test repo and record the outcome:

1. **Shell access:** can the agent run `aegis status`? (Runtime mode possible?)
2. **Subagent spawn:** can it create a second concurrent agent/session?
   Test: create 2 slice worktrees, run builds simultaneously.
   Record: max observed parallel sessions before degradation.
3. **File write scope:** can it write outside the workspace (worktrees, OS temp)?
4. **Hook survival:** do git hooks fire from agent-initiated commits?
5. **Token/cost visibility:** is any usage data exposed? (informational only - budgets dropped)
6. **Long-run stability:** 30-min session without context loss? Checkpoint/resume cycle works?

## Matrix

| Platform | Shell | Parallel agents | Evidence (what ran, when, result) | Status |
|----------|-------|----------------|-----------------------------------|--------|
| Kimi Code (Linux) | Yes | Yes (25 concurrent subagents observed; 2 slice worktrees built + merged) | 2026-07-21 full dogfood: 86 aegis invocations, 00a→08b pipeline, 2 slices via worktrees + merge oracle, hooks fired on agent commits, checkpoint→resume VERIFIED; 31/31 CLI tests. See docs/DOGFOOD-v0.2.md | ✅ VERIFIED (Linux) |
| Kimi Code (macOS/Windows) | ? | ? | — | ⬜ UNVERIFIED |
| Claude Code | ? | ? | — | ⬜ UNVERIFIED |
| Cursor | ? | ? | — | ⬜ UNVERIFIED |
| OpenCode | ? | ? | — | ⬜ UNVERIFIED |
| Direct API | ? | ? | — | ⬜ UNVERIFIED |
| Chat UI (manual mode) | No | No | N/A by design | ✅ DEFINITIONAL |

## Rules
- A cell becomes ✅ only with dated evidence linked/quoted here.
- Parallel-first claims (N4) apply only to ✅ platforms; everything else runs
  the same worktree flow sequentially.
- Re-verify on major platform version changes.

## Parallel-agent orchestration patterns (separate axis from platforms)

The matrix above verifies platforms. HOW a team fans out agents is a second,
unverified axis. Known patterns, none verified except the first:

| Pattern | Status | Notes |
|---------|--------|-------|
| Worktree-per-slice (`aegis slice create`, N2) | ✅ VERIFIED (Kimi Code, 2026-07-21 dogfood) | the designed path |
| Fork/sub-agent waves on ONE shared working tree (e.g. 5 agents dispatched in parallel waves, metis-nda style) | ✅ SUBSTRATE VERIFIED (2026-07-21, v0.4.1 lockfile) | all commands concurrency-safe; full agent waves untested |
| External executors (opencode+GLM) driving aegis by prompt | ⬜ UNTESTED | enforcement is prompt-deep here; `aegis exec -- <cmd>` (v0.4) is the recording wrapper; drift detection (`aegis doctor`) is the after-the-fact net |

### Experiment: shared-tree concurrency (2026-07-21, v0.4; re-run v0.4.1)

What was run (the substrate a fork-agent wave stands on - not full agent
waves, which need a real multi-agent harness):

- 5 parallel `aegis checkpoint` on one shared tree: all exit 0,
  `aegis resume` VERIFIED. (Covered by integration test.)
- 6 parallel state-mutating commands (`aegis chore`) on one shared tree,
  x5 trials, BEFORE the state lock (v0.4.0): resume VERIFIED every trial,
  but 3/5 trials recorded 5/6 events - concurrent read-modify-write was
  last-writer-wins (metis-nda independently measured 3/5 and 4/10 with
  concurrent `aegis exec`).
- SAME battery AFTER the lockfile (v0.4.1): 6/6 events in all 5 trials,
  resume VERIFIED. 10 concurrent `aegis exec` -> 10/10 (integration test).

Conclusions, binding until re-tested:

1. **All aegis commands are now safe under concurrent use on a shared tree.**
   State mutations take a lockfile around the read-modify-write; stale locks
   (dead pid or >60s) are stolen, so a crash mid-mutation never wedges the
   repo. Event ORDER under concurrency is timing-dependent but COMPLETE.
2. Full fork-agent waves (real agents, disjoint file scopes, one tree)
   remain ⬜ UNTESTED - the substrate now says the pattern is viable.
