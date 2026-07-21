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
| Kimi Code | ? | ? | — | ⬜ UNVERIFIED |
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
