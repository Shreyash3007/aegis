# v0.11 Code Review Report (06b — senior staff engineer)

Header: 2026-10-18 | source `0aa714e` + the CR-1 fix | cycle result: **proceed**
after the Major fix | reviewer: self-review (executor reviewing its own work —
independent review remains UNMEASURED and is stated as such).

Scope: the 25 changed/added `src` files (1526 insertions since `v0.10.0`),
against `brain/architecture/standards.md`, `brain/architecture/system.md` and
the refreshed module graph (59 modules, no cycles).

## 1. Score table (1–5 anchors; 5 = justified rare violations / fitting names
/ one-direction deps / single reason / plain-fixture tests)

| Dimension | Score | Evidence |
|---|---|---|
| Consistency | **4** | Adapters share one skeleton (guard → scan → refuse → back up → write → verify). CR-1 was the one violation (sibling import) and is now fixed; the three copies still diverge textually (CR-2). |
| Simplicity | **4** | Each adapter is a single linear install/uninstall/verify flow. The duplication (CR-2) is the main simplicity debt; no premature abstraction was added to compensate. |
| Naming | **5** | `scanHooks`, `stripManaged`, `protectedPaths`, `guardTargets`, `verifyWrite`, `declarationProblems` — predictive names, no lying verbs. Declarations use the contract's own vocabulary. |
| Coupling | **4** (was 3) | Graph: `src/lib/util.ts` fan-in 44, `src/lib/state.ts` 23, `src/lib/owned-path.ts` 11 — all neutral libraries. The single adapter→adapter edge was removed; `cursor.ts` now depends only on contracts/declarations/util/host-primitives. |
| Cohesion | **4** | `src/commands/host.ts` is pure dispatch; `src/hosts/declarations.ts` is data + one validator; each adapter owns exactly one host. |
| Testability | **5** | 33 adapter tests across three pinned suites, plus a self-building runner per adapter (`scripts/check-*-adapter.mjs`) and now an independence test. Fixtures are plain temp dirs, no world-booting. |

No dimension scores 1–2. No score is presented without file-level evidence.

## 2. Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| CR-1 | **Major** | `src/adapters/cursor.ts` imported `pathHits` from `src/adapters/claude-code.ts` — the only cross-adapter dependency, violating the standards' per-host rule and coupling R3a to R3c. | **RESOLVED** — helper moved to `src/lib/host-primitives.ts`; `test/adapter-independence.test.js` pins the rule (RED: `cursor.ts -> claude-code.ts`; GREEN after the move). All 33 adapter tests pass. |
| CR-2 | Minor | ~150 lines of duplicated helpers across the three adapters (`isPlain`, `sameJson`, `clone`, `protectedPaths`, `detectIndent`, `serialize`, `guardTargets`, `readSettings`, `restore`, `verifyWrite`). | **Open → 07a backlog** (one refactor type per cycle; not a behavior defect) |
| CR-3 | Note | A cursor `sessionStart` entry written as a plain string (not the documented `{command}` object) is not scanned as aegis-shaped, so it would be preserved rather than refused. Documented schema uses objects; foreign content is never touched, so this is a stale-hook risk, not corruption. | Open (recorded) |

Routing per 06b: CR-1 Major → fixed before 08a (done). CR-2 Minor → 07a.
CR-3 Note → trend record.

**Out of review scope, carried to the 08a verdict:** R5 (the executor
delivery trial, contract must-pass M4) has no implementation in this repo to
review. It is a release-gate condition owned by the human, not a code
finding, so it is not recorded as a review blocker — and the 08a verdict
treats it as a No-Go condition unless the owner explicitly waives it.

## 3. Structural checks

- `aegis ast build` → 59 modules, **no cycles** (exit 0).
- `aegis ast diff` → the diff is exactly the v0.11 surface: three adapters,
  host command + declarations, evidence contract + publisher, plus the R1/R6
  touch points. No unexpected module appeared.
- Highest fan-in modules are neutral libraries; no command imports another
  command, and no adapter imports an adapter (now enforced by test).

## 4. Self-critique

- Too lenient? The duplication (CR-2) is real and I did not fix it in this
  cycle to respect the "one refactor type per cycle" rule — that is a
  deliberate deferral, not an oversight, and it is scheduled in 07a.
- Too harsh? CR-1 is a genuine standards violation with a cheap, testable
  fix, so it was worth fixing rather than deferring.
- My-team's code? This is my own code; the independence test exists precisely
  so a future me cannot re-introduce the edge silently.
- 3-AM debuggable? Yes: each refusal names the file, the reason, and the next
  action.

## 5. Verdict

**Proceed.** One Major finding was raised and resolved with a pinning test;
Minor and note findings are carried to 07a and the trend record — none are
dropped silently. The release-level R5 condition is not a code finding; it is
carried into the 08a verdict as an owner decision.
