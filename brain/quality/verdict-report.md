# v0.11 Ship Verdict (08a)

Header: 2026-10-18, amended 2026-10-19 | evaluated tip `1a42a73` | CI
re-verified at `c7f8870` | profile: production | environment: L1 | verdict:
**NO-GO (conditional) — two owner decisions outstanding**

This verdict evaluates each gate against its threshold and cites the measured
value and source. Per 08a's red flag, **any UNMEASURED production gate is an
automatic No-Go**; per the release contract, R5 is a must-pass item that the
owner alone can resolve or waive.

## 1. Gate table

| Gate | Threshold | Measured at `1a42a73` | Source | Result |
|---|---|---|---|---|
| PRD/requirement coverage | ≥ 95% | 12/13 deliverable criteria mapped = 92.3%; the single gap is R5, which has no implementation to map | `brain/quality/traceability-matrix.md` | **FAIL (R5 only)** |
| Security | 100% of live bypass attempts refused | 9/9 attempts refused or acceptable; no bypass; no critical/high finding | `brain/quality/security-gap-report.md` | **PASS** |
| Accessibility | WCAG AA | all rendering contrast pairs ≥ 4.5 (lowest live pair 5.08); focus ring intact; semantics present | `brain/quality/accessibility-audit.md` | **PASS** |
| Bugs | 0 critical, ≤ 3 minor | 0 critical, 0 open high/major/minor. Three were found and fixed: B-1 (minor, UX), B-4 (major, `doctor` stdout), B-5 (minor, runner-dependent test assertion). B-4/B-5 were exposed by CI after the local pass and are CI-verified. | `brain/quality/bug-hunting-report.md` | **PASS (fixed)** |
| Perf budget | cited, within budget | bundle 390 kb vs 450 kb; db-p95 and TTI budgets have **no harness** in this repo | `brain/quality/verification-report.md` | **PASS (cited)** / UNMEASURED items named |
| Tests | fail 0, no weakened/skipped | 395 tests, `# fail 0`; windows-latest 395/395, skipped 0; ubuntu-latest 393 pass + 2 OS symlink-privilege guards; local `aegis validate tests` PASS (skipped 0, todo 0) | `gh run view 39238554395 --log`; `aegis validate tests` | **PASS** |
| Skill lint | all pass | 71/71, model judge SKIPPED (honest) | `aegis eval --all` | **PASS** |
| Contracts / typecheck | clean | `validate contracts` PASS; `typecheck` PASS | executed | **PASS** |
| Adversarial audit | 0 findings | 154 checks, 0 findings | `node scripts/audit.mjs` | **PASS** |
| Pilot / dogfood / self-cycle | all as expected | 44/44; 72 steps 0 unexpected; 61/61 | executed | **PASS** |
| Dependencies | 0 known vulns (critical/high) | Node-bundled `npm audit --audit-level=high` → **0 vulnerabilities**; `aegis validate deps` honestly UNMEASURED (PATH npm ENOLOCK) | executed | **PASS (cited)** |
| Packaging | verified | `PACKAGE VERIFIED: 0.10.0, 10 runtime packages, SHA256 3ee37bf…` | `node scripts/package-check.mjs` | **PASS** |
| Quality evidence | acceptance + review on the candidate | acceptance 8/8 PASS; review recorded with no open blocker/major | `aegis quality status` | **PASS** |
| **R5 executor trial** | delivery evidence, or explicit owner waiver | **none exists** | `docs/releases/v0.11/r5-executor-trial.md` | **BLOCKED (owner)** |
| Exact-final-commit CI | green on the final commit | **PASS at `c7f8870`**: `# tests 395`, `# fail 0`, both windows-latest and ubuntu-latest. This is not yet the final candidate — the docs commit that records this finding follows and must be re-verified. | `gh run view 39238554395` | **PASS at `c7f8870`** / re-verify on final |
| Fresh human G4 | human approves the exact candidate | G4 on record is for v0.10 `43ab0bd`; **not reusable** | `.aegis/state.json` gates | **PENDING (owner)** |

## 2. Why this is a No-Go and not a rollback

Two gates are not passable by any amount of additional code work:

1. **R5 (contract must-pass M4).** The executor delivery trial needs an owner
   choice of executor + spend cap, or an explicit recorded decision to ship
   without it. A script or mock cannot satisfy it — the frozen trial doc says
   so, and the contract makes it a publication condition. Nothing in this repo
   can manufacture it.
2. **Fresh human G4 on the exact final commit.** Sacred gate, human-only.

Per 08a, a failing gate normally routes back to an owning skill (coverage →
04a, security → 02c, perf → 04a/03a, bugs → 05c). **None of those routings
applies here:** the code is not defective, coverage is short only by the
owner-input item, and re-running any build phase cannot produce an owner
decision. Routing back would be motion without progress. The correct state is
to hold at 08a with the verdict recorded and the decisions surfaced — which is
what this document does.

## 3. What is ready the moment the owner decides

- The candidate tree is green on the full battery at `1a42a73` (tests, eval,
  contracts, typecheck, audit, pilot, dogfood, self-cycle, audit-of-deps,
  package verification).
- The release ritual is a re-run, not new work: exact-final-commit CI, the
  full battery again, `evidence export` v2 for the sidecar, version bump,
  tag, asset + checksum.
- **No published tag moves.** `v0.10.0` stays at `43ab0bd`.

## 4. The two decisions requested from the owner

**Decision A — R5.** Choose one:
- **(A1)** Name an executor and a spend cap, and run the frozen trial
  (`docs/releases/v0.11/r5-executor-trial.md`; scaffold verified to 04a at
  `%TEMP%\aegis-r5-setup-KJG6Cv`). Then the verdict can reach a true Go.
- **(A2)** Explicitly record "ship without R5" in the G4 verdict. The
  contract permits this **only** as a stated owner decision; it is not
  something this agent may infer or self-approve.

**Decision B — G4.** After A is settled and the final candidate commit exists,
approve G4 on that exact commit. Prior approvals do not carry.

Also still open (not blocking, but recorded): the R3c Cursor advertised-scope
confirmation — it currently stays `fixture-only`, which is honest and safe;
the alternatives ("test elsewhere", "drop from advertised set") need the
owner's recorded say-so.

## 5. Self-check

- **Too eager?** No: the verdict is No-Go with two named blockers.
- **48-hour regret?** The likeliest regret is shipping without R5 and
  discovering the executor path is broken in the field. That is exactly why
  R5 is surfaced as a decision instead of being quietly dropped.
- **Stale or UNMEASURED pass?** No gate was passed on stale or UNMEASURED
  data. The two UNMEASURED perf metrics (db-p95, TTI) are named with the
  reason no harness exists; the dependency gate cites the Node-bundled audit
  because the PATH npm cannot read the shrinkwrap, and both records are kept.

## 6. CI re-verification (2026-10-19)

The first exact-commit CI runs in this cycle were **red**: `59f1f52` and
`b9c7a67` failed the `test` job on all three runners while the same suite
passed locally. Both failures were deterministic environment differences, not
flakes, and both are fixed at `c7f8870`:

- **B-4 (Major):** `aegis doctor` wrote drift/attention notes to stdout after
  the JSON report. A developer machine has the skill stores, so no note fired;
  a fresh runner is missing 19 routed blades and `JSON.parse(stdout)` broke.
  Advisory lines now go to stderr; `test/audit-packaging.test.js`'s
  slice-at-`\n}` workaround was removed. This directly restores v0.11's own
  "doctor stays machine-parseable JSON" claim.
- **B-5 (Minor):** `test/pm-detect.test.js` required a status other than
  `UNMEASURED`, which only holds where pnpm/yarn are installed. The
  runner-less outcome (`UNMEASURED`, cause named) is the documented honest
  behavior; the assertion now accepts it and requires the cause.

Evidence: RED test reproduced locally (position 424, line 20 — matching CI)
and an isolated-PATH repro recorded `pnpm not found on PATH`; GREEN is the CI
run `39238554395` at `c7f8870` (395 tests, `# fail 0`, windows + ubuntu). A new
acceptance observer (AC9) pins the doctor stdout contract, and the acceptance
plan's cited suite count was corrected from 391 to 395.

**The verdict does not change:** CI green is a prerequisite, not one of the
two owner decisions. R5 and the sacred G4 remain the only blockers.

## 7. Verdict

**NO-GO pending owner decisions A and B.** The implementation, validation and
maintain phases are complete and green; the release is blocked on a
human-owned trial decision and the sacred ship gate, in that order.
