# v0.11 Verification & Benchmark Report (05d)

Header: 2026-10-18 | source `0aa714e` | profile: production | environment:
L1 (real commands executed on win32, Node v24.19.0)

## 1. Acceptance (committed plan, executed through the CLI)

Plan: `docs/releases/v0.11/acceptance.json` (committed at the branch tip).
Command: `aegis quality acceptance main --file docs/releases/v0.11/acceptance.json`

**Result: 8/8 acceptance checks passed** (exit 0).

| Criterion | Contract item | Observed |
|---|---|---|
| AC1-host-surface | R2 | `host list` exit 0 — declarations reachable through the CLI |
| AC2-skill-lint | M1 | `eval --all` 71/71, judge SKIPPED (honest) |
| AC3-contracts | M2/04c | `validate contracts` PASS — tsc clean, contracts present |
| AC4-perf-budget | M1 | `validate perf` PASS — 389kb vs 450kb budget |
| AC5-host-declarations | R2 | declarations/bindings/refusal validators green |
| AC6-cursor-adapter | R3c | install/refusals/uninstall green (canonical entry, foreign preserved, links refused) |
| AC7-evidence-refusals | R4 | all negative publication fixtures refuse |
| AC8-adverse-recovery | R6 | interrupted recovery + concurrent writers honest, owner work preserved |

CLI note kept verbatim: *"criterion adequacy remains a review responsibility"* —
the runner proves the commands pass, not that the criteria are well chosen.
That judgment is recorded in §5 and in the 06b review.

## 2. Build and typecheck gate (before slower suites)

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Typecheck | `aegis typecheck` (`tsc --noEmit`) | PASS, clean |

## 3. Performance against budgets

Budgets source: `.aegis/perf-budgets.json` (`bundle_kb: 450`).

| Metric | Measured | Budget | Result |
|---|---|---|---|
| JS bundle (dist, 59 files) | **389 kb** (398,253 bytes) | 450 kb | **PASS** (86.5% of budget) |
| CLI startup latency (`aegis status`, 5 runs) | **376 ms median** (366–380 ms) | no recorded budget | Reported, no threshold to compare |
| DB query p95 | — | 50 ms | **UNMEASURED** — no app DB harness in this repo |
| TTI | — | 3000 ms | **UNMEASURED** — no browser harness for the CLI package |

Drift note: the bundle moved 388 kb → 389 kb between the audit tip and this
tip (+1 kb, the config message fix). Prior run is kept as the baseline so
future drift is visible.

## 4. E2E harness status

`aegis validate e2e` → **UNMEASURED** — no playwright config in this repo
(honest skip; recorded in `brain/quality/validation-e2e.md`). The CLI's
end-to-end behavior is instead exercised by the full suite and by
`scripts/pilot.mjs` (44/44) and `scripts/dogfood.mjs` (72 steps, 0
unexpected), cited in the bug-hunting report.

## 5. Acceptance-as-evals and coverage

- Coverage percentage is **not claimed** — no coverage runner is configured
  for this package. Labeled UNMEASURED rather than estimated.
- Capability pass@k / pass^3 grading requires a model-graded eval bank; that
  is explicitly out of scope for this release (v0.10 handover records the same
  limit). The deterministic graders that do exist (suite, audit, pilot,
  dogfood, self-cycle) are green and cited.
- Chaos checks (kill DB, drop API, offline): **UNMEASURED** for the CLI
  surface — no external service dependency exists to kill. The nearest
  executed analogue is the interrupted-recovery and concurrent-writer coverage
  in `test/adverse-scenarios.test.js` (green, AC8).

## 6. Diff review

Every file changed since the last checkpoint was reviewed in the 05a matrix
(25 `src` files, 1526 insertions) and in the audit record. The only change
landed during validation is `src/commands/config.ts` + `test/config.test.js`
(UX-1), reviewed and covered by the full suite.

## 7. Verdict

**READY for review (06b)** on measured gates:

- acceptance 8/8 PASS
- bundle within budget (389/450 kb)
- build + typecheck clean
- no red suite, no unlabeled number

Explicitly **NOT** claimed: DB-query and TTI budgets (no harness), coverage
percentage, capability evals, chaos on external services. These are named
above rather than masked.
