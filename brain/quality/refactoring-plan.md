# v0.11 Tech Debt & Refactoring Plan (07a)

Header: 2026-10-18 | source `d773e37` | profile: production | L2 (tests
before/after; no critical-path edit without human review)

Inputs read: `brain/quality/known-issues.md`, `brain/quality/code-review-report.md`,
`aegis status`, `aegis ast build` (59 modules, no cycles).

## 1. Debt inventory (measured, not asserted)

| Item | Measurement | Class | Decision |
|---|---|---|---|
| CR-2 adapter duplication | 12 helpers duplicated (10 across claude-code↔cursor, `guardTargets` in all three); **123 identical trimmed lines** between claude-code and cursor, 37 each for opencode pairs | **Real duplication** | **Planned, NOT executed this cycle** (see §2) |
| CR-3 cursor string-entry edge | one `sessionStart` entry written as a plain string is preserved rather than refused | Edge behavior | Keep documented; no code change |
| Dead code | 213 exported symbols scanned; every one has ≥2 references. The "single-reference" set (`allRecords`, `BUILTIN_SUITES`, `BindingChoice`, `CursorEntry`, …) is used once internally — over-exported, not dead | **No dead code** | No action |
| Dependency currency | `ts-morph ^28`, `typescript ^5.5.4`, `@types/node ^20.14` — no upgrade pending; audit 0 vulnerabilities | **Current** | No action |
| Brain hygiene | `aegis gc` → 398 checkpoints archived/deleted, 20 retained (20/30-day policy) | Housekeeping | **Done** |
| Over-engineering | No speculative abstraction was added for v0.11; the adapters are linear flows. `host-primitives.ts` is the only new shared module and exists because of a proven need (CR-1) | **Clean** | No action |

## 2. Why the duplication is NOT refactored in this cycle

07a's own constraints decide this, and they are followed rather than cited:

1. **"ONE refactor type per cycle."** This cycle's refactor was the
   dependency-direction fix (CR-1: `pathHits` moved to
   `src/lib/host-primitives.ts`, pinned by
   `test/adapter-independence.test.js`). Extraction of shared adapter
   plumbing is a *second* refactor type.
2. **"Never critical-path refactors without human review."** The duplicated
   helpers are the security-relevant write path: link refusal
   (`guardTargets`), backup naming, indent-preserving serialization
   (`serialize`), post-write verification (`verifyWrite`), and rollback
   (`restore`). Consolidating them changes the code that enforces the S1
   mitigation for all three hosts at once, inside a release candidate whose
   evidence is already captured.
3. **The duplication is not a behavior defect.** Each copy is pinned by its
   own suite (33 adapter tests green) and each adapter is individually
   correct. The cost is maintenance drift risk, not current incorrectness.

Executing it now would invalidate the captured acceptance/review receipts and
put an un-reviewed change on the release's critical path — a worse trade than
carrying one documented item into the next cycle.

## 3. Planned work (next cycle, scoped and ready)

**One refactor type: extract shared adapter plumbing.**

- New module `src/lib/host-settings.ts` holding the pure, host-neutral
  helpers: `isPlain`, `sameJson`, `clone`, `protectedPaths`, `detectIndent`,
  `serialize`, `restore`, `verifyWrite`, `guardTargets`.
- Keep host-specific shapes in each adapter (`ClaudeEntry`, `CursorEntry`,
  `entryShapes`, `scanHooks`/`stripManaged` per host schema).
- **Before:** capture `aegis validate tests` (391 baseline) and the three
  adapter suites (33 tests).
- **After:** identical results required; any failure → revert immediately
  (07a red flag).
- Guard: extend `test/adapter-independence.test.js` so the shared module may
  not import an adapter, and adapters may not re-declare an extracted helper
  (regex over `src/adapters/*.ts`).
- Risk: **high** (security-relevant write path) → requires human review at
  06b of that cycle before merge.

## 4. Verification (this cycle)

| Claim | Command | Result |
|---|---|---|
| Tests before any debt work | `aegis validate tests` | PASS, 391 tests, skipped 0 |
| No dependency break | `node scripts/audit.mjs` | 154 checks, 0 findings |
| Graph still acyclic | `aegis ast build` | 59 modules, no cycles |
| Brain hygiene | `aegis gc` | 398 archived, 20 retained |

No refactor was executed this cycle, so there is no before/after delta to
claim beyond the CR-1 change already verified in the 06b review (RED
`cursor.ts -> claude-code.ts` → GREEN, 33/33 adapter tests).

## 5. Self-check

- **Value or fun?** Value: one measured, scoped plan with a stated risk class,
  rather than a cosmetic churn of working code.
- **Simpler or just different?** Not attempted, deliberately — "just
  different" is the failure mode this rule exists to prevent.
- **Tests actually run?** Yes: the full suite and audit ran at this tip; the
  numbers above are from those runs, not estimates.

## 6. Decision record

**DR-v0.11-07a-1:** Carry the adapter-plumbing duplication (CR-2) to the next
cycle as the single planned refactor, with a before/after test protocol and a
human-review requirement, rather than refactoring the security-relevant write
path inside a release candidate. Rationale: 07a's one-type-per-cycle and
no-critical-path-without-review rules; the duplication is a maintenance hazard,
not a behavior defect. Evidence: this file, `code-review-report.md` CR-2.
