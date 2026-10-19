# v0.11 Bug Hunting & Hardening Report (05c)

Header: 2026-10-18 | source `fb1779a` | level L1 (static + dynamic + negative
testing executed) | every finding cites a tool + command or is labeled
STATIC REVIEW.

## 1. Suites executed (dynamic + negative + race)

| Suite | Command | Result |
|---|---|---|
| Full test suite (dynamic, negative inputs, races) | `aegis validate tests` | **PASS** — skipped 0, todo 0, 391 tests |
| Contract integrity + cross-module types | `aegis validate contracts` | **PASS** — tsc clean, contracts present |
| Typecheck | `aegis typecheck` | **PASS** — `tsc --noEmit` clean |
| Audit regression bank | `node scripts/check-audit.mjs` | **AUDIT REGRESSIONS PASSED** |
| Full audit ledger | `node scripts/audit.mjs` | **154 checks, 0 findings** |
| Merge oracle regressions | `node scripts/check-merge.mjs` | PASS |
| Strict-profile regressions (R1) | `node scripts/check-strict-profile.mjs` | **STRICT PROFILE SUITE PASSED** |
| Adverse scenarios (R6) | `node scripts/check-adverse-scenarios.mjs` | **ADVERSE SCENARIOS SUITE PASSED** |
| Windows path regressions | `node scripts/check-winpaths.mjs` | **WINDOWS PATH REGRESSIONS PASSED** |
| Evidence publisher negatives (R4) | `node scripts/check-evidence-publish.mjs` | **EVIDENCE PUBLISHER SUITE PASSED** |
| Lock reclaimer deadline | `node scripts/check-lock-deadline.mjs` | **LOCK DEADLINE REGRESSIONS PASSED** |
| Lock leaf semantics | `node scripts/check-lock-leaf.mjs` | **LOCK LEAF REGRESSIONS PASSED** |
| State filesystem audit (concurrent writers) | `node scripts/check-state-audit.mjs` | PASS |
| Dependency CVEs | Node-bundled `npm audit --audit-level=high` | **0 vulnerabilities** |

## 2. Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| B-1 | **Minor** | `aegis config set <valid-key>` with no value reported `unknown key '<key>'` while listing that key as valid; bare `config set` printed `unknown key 'undefined'`. Misleads the user away from the actual usage error. | **FIXED** this cycle (fast lane, RED→GREEN, suite green) |
| B-2 | Note | `validate deps` UNMEASURED on this host (PATH npm 12.2.0 ENOLOCK on `npm-shrinkwrap.json`). Not a code defect; the contract's Node-bundled npm gives 0 vulnerabilities. | Open, documented |
| B-3 | Note | `#8b949e` on white = 3.08:1 (below AA) but renders only on the dark terminal (6.15:1). | Open, guard note |

No Critical, no High, no Medium finding. The 05c red flags (critical bug →
stop; dependency CVE critical/high → update) did not trigger.

## 3. Flaky-test discipline

- Quarantined lanes: **none** (`aegis quarantine list` → "no quarantined
  lanes").
- No silent retry loops in the suite; the runner reports `skipped 0`.
- The three `.skip(` sites in `test/audit-postrelease.test.js` are honest
  environment guards (symlink privilege `EPERM`/`EACCES`; inability to
  establish the no-share file pin). All three executed on this host — the
  suite's own count is `skipped 0`, so nothing was silently skipped.
- One historical flake is already recorded in the v0.10 handover
  (a 318/1 full run retained for the flake history); the current run is
  green and was not retried to force a pass.

## 4. Static sweep (STATIC REVIEW)

- No `console.log` debugging left in `src/` paths that are not intentional
  CLI output (all user-facing output goes through `ok`/`die`).
- No secret material in the tracked tree: the evidence publisher refuses
  credential-looking values, and `test/audit-redaction.test.js` is green.
- Dead code: `aegis ast build` → 59 modules, no cycles, no orphan modules;
  every added v0.11 module is reachable from `src/cli.ts`.
- Complexity hotspots: the three adapters are the largest additions
  (339/300/177 lines) and are covered by dedicated pinned suites plus
  self-building runners (`scripts/check-*-adapter.mjs`).

## 5. Verdict

No release-blocking bug found. One minor UX defect was found, fixed, and
verified. Dependency and contract surfaces are clean.
