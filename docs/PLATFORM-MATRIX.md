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
| Fork/sub-agent waves on ONE shared working tree (e.g. 5 agents dispatched in parallel waves, metis-nda style) | ⬜ UNTESTED | unknown whether it composes with lanes/checkpoints; experiment below |
| External executors (opencode+GLM) driving aegis by prompt | ⬜ UNTESTED | enforcement is prompt-deep here; drift detection (`aegis doctor`) is the mitigation, auto-correction is deliberately NOT built (A1.1) |

### Experiment: shared-tree fork-agent waves (planned, not run)

Question: can N parallel agents share one working tree under Aegis without
corrupting state or each other?

1. Test repo, `aegis init --yes`, one feature slice in flight.
2. Dispatch 3 agents with disjoint file scopes (like a wave prompt) against
   the SAME tree (no worktrees), each instructed to run `aegis status` /
   `checkpoint` per its prompt.
3. Measure: (a) checkpoint integrity after the wave (`aegis resume` exit 0?),
   (b) git index/working-tree races between agents, (c) whether lane caps
   mean anything when lanes aren't worktrees, (d) human review cost vs the
   worktree path on the same task.
4. Outcomes: if integrity holds -> document as a supported pattern with its
   constraints. If not -> document the failure mode and keep N2 as the only
   supported parallel path. Either result gets recorded HERE with a date;
   until then, claims either way are prohibited.
