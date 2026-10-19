# v0.11 Traceability Matrix (05a)

Header: 2026-10-18 | source commit `59f1f52` (working tip `a6638d7`+) |
cycle: v0.11 "Reach" | level: L1 (static graph analysis + executed suites) |
STATIC REVIEW where labeled; all suite results executed.

Requirements source: `docs/releases/v0.11/RELEASE-CONTRACT.md` §"What this
release delivers" (R1–R6) and §"Must pass before publication" (M1–M7).
`docs/releases/v0.11/PLAN.md` is the execution matrix. There is no
`brain/prd.md` in this repo; the frozen requirement set is the contract +
roadmap (stated explicitly so the matrix is not built on a fictional PRD).

## 1. Criterion → implementation → evidence

| # | Criterion (contract) | Implementation (file:line) | Test / evidence | Status |
|---|---|---|---|---|
| R1 | opt-in strict profile; new projects strict, existing legacy until opted in | `src/lib/state.ts:77` (`quality_profile` field), `src/commands/config.ts:39` (validation `strict|legacy`), `src/commands/lifecycle.ts:121` (greenfield default strict) | `test/strict-profile.test.js:38-47` (default strict, opt-out legacy, invalid rejected) | PASS |
| R1 | strict merge refuses missing/stale/corrupt receipts | `src/commands/merge.ts:60,68,71,79,82` (profile read + gate OR) | `test/strict-profile.test.js`; `test/merge.test.js:23` (legacy opt-out) | PASS |
| R1 | labelled legacy exception never prints quality PASS | `src/commands/merge.ts:76` (`QUALITY UNMEASURED - no …`), `src/lib/hooks.ts` QUALITY refusal classes | `test/strict-profile.test.js` (UNMEASURED label) | PASS |
| R2 | versioned host capability declarations, documented event bindings | `src/contracts/hosts.ts:13,20,23,34` (schema v1, status enum, binding, declaration), `src/hosts/declarations.ts:13,16,48,83` (three hosts) | `test/host-capabilities.test.js` (structure/claims/fixtures), `test/host-surface.test.js` | PASS |
| R2 | unsupported event stays unsupported; missing shell → manual guidance; no scheduler/daemon/fallback model | `src/hosts/declarations.ts:119` (`declarationProblems`) | `test/host-capabilities.test.js` (`declarationProblems` refusals) | PASS |
| R3a | claude-code adapter: managed block only, foreign preserved, links refused, model/provider/effort byte-identical | `src/adapters/claude-code.ts` (339 lines), `src/commands/host.ts:15` wiring | `test/adapters-claude-code.test.js`; real claude 2.1.269 SessionStart smoke; `docs/releases/v0.11/claude-code-adapter-quality.json` | PASS (verified) |
| R3b | opencode adapter, same invariants | `src/adapters/opencode.ts` (177 lines), `src/commands/host.ts:17` | `test/adapters-opencode.test.js`; opencode v2.0.29 smoke; `…/opencode-adapter-quality.json` | PASS (verified) |
| R3c | cursor adapter, same invariants | `src/adapters/cursor.ts` (300 lines), `src/commands/host.ts:16` | `test/adapters-cursor.test.js` (12 tests); `…/cursor-adapter-quality.json` | PASS (**fixture-only**, no local cursor) |
| R4 | immutable per-release evidence publisher, schema binding SHA/CI/results/hash/limitations | `src/contracts/evidence.ts:14,25,31`, `src/commands/evidence.ts:10,42,73-128` | `test/evidence-publish.test.js`, `scripts/check-evidence-publish.mjs`; `…/evidence-publisher-quality.json` | PASS |
| R4 | refuses missing/stale observations, overwrites, raw prompts, credentials, private paths, reported-cost-as-billing | `src/commands/evidence.ts:42,81-85,96,108,119,125,128` | `test/evidence-publish.test.js` negative fixtures | PASS |
| R6 | pinned craft upgrade only after collision review + source checks + trigger fixtures | `skills/superpowers.lock.json` (unchanged pin, v6.4.2), `docs/releases/v0.11/craft-pin-review.md` | `test/eval-trigger.test.js`, `test/fixtures/craft-triggers.json` (12 cases) | PASS (pin KEPT; live precision UNMEASURED) |
| R6 | adverse scenarios: hostile repo instructions, missing tools, concurrent writers, interrupted recovery, owner-work preservation | `src/commands/sync.ts:42` (marker discipline), `src/lib/detect.ts` (git-absent honest label), `src/commands/persist.ts:55-69`, `src/commands/remove.ts:33-41`, `src/lib/hooks.ts` (managed-banner identity, link refusal), `src/lib/util.ts` (linked `.git` refusal) | `test/adverse-scenarios.test.js`, `scripts/check-adverse-scenarios.mjs`; `…/adverse-scenarios-quality.json` | PASS |
| R5 | owner-selected executor delivery trial | **none** — no executor-produced diff exists | `docs/releases/v0.11/r5-executor-trial.md` (frozen), scaffold verified | **BLOCKED (owner)** |

## 2. Must-pass items → evidence

| # | Must pass (contract) | Evidence at this tip | Status |
|---|---|---|---|
| M1 | fresh build, tests, skill lint, dependency audit (Node-bundled npm), self-cycle, pilot, dogfood, package-check | `npm test` 391/391 (`aegis validate tests`, 266828.4ms); `aegis eval --all` 71/71; Node-bundled `npm audit --audit-level=high` → 0 vulnerabilities; self-cycle 61/61, pilot 44/44, dogfood 72/0 (at impl tip `19842db`); `package-check` PACKAGE VERIFIED | PASS |
| M2 | every code slice: TDD RED/GREEN identical test bytes, acceptance, review, `merge check --require-proof --require-quality` PASS | six slice merges each cite oracle PASS (`3773ef2`, `84ddeb5`, `bdcce95`, `aa601fc`, `c510582`, `4500e28`, `5e9a4e4`); flag-form fidelity note recorded (strict enforced both) | PASS (fidelity note) |
| M3 | real host evidence for every **advertised** adapter | claude-code verified (2.1.269), opencode verified (v2.0.29), cursor advertised **fixture-only** | PARTIAL (owner decision) |
| M4 | R5 delivery evidence **or** explicit owner ship-without-R5 decision in the verdict | none | **BLOCKED (owner)** |
| M5 | exact-final-commit CI + full ritual `CLEARED to tag` | not started (candidate not final) | PENDING |
| M6 | fresh human G4 on exact candidate; lanes closed; no open blocker | G4 pinned to v0.10 `43ab0bd` (not reusable); lanes 0/2 | PENDING (owner) |
| M7 | immutable `v0.11.0` tag + asset/checksum/evidence sidecar + live refs | not started | PENDING |

## 3. Code → criterion (creep check)

All 25 changed/added `src` files (1526 insertions since `v0.10.0`) map to a
contract item:

- R2/R3: `src/contracts/hosts.ts`, `src/hosts/declarations.ts`,
  `src/commands/host.ts`, `src/adapters/{claude-code,cursor,opencode}.ts`,
  `src/contracts/commands.ts:13` (`host` in CONTRACT_COMMANDS),
  `src/lib/commands.ts` (dispatch).
- R4: `src/contracts/evidence.ts`, `src/commands/evidence.ts`.
- R1: `src/lib/state.ts`, `src/commands/config.ts`, `src/commands/merge.ts`,
  `src/commands/lifecycle.ts`, `src/lib/hooks.ts` (QUALITY classes).
- R6: `src/commands/sync.ts`, `src/lib/detect.ts`, `src/commands/persist.ts`,
  `src/commands/remove.ts`, `src/commands/slice.ts`, `src/lib/util.ts`,
  `src/lib/lock.ts`, `src/commands/validate.ts`, `src/commands/clean.ts`,
  `src/cli.ts` (host wiring).

**Creep: 0 files / 25 changed = 0%.** No file lacks a contract item. No
contract item lacks an implementation ref except R5, which is blocked by
design (owner input), not by a code gap.

## 4. Criterion → code (gap check)

The deliverable table above holds **13 criteria rows** (R1 ×3, R2 ×2, R3a/b/c
×3, R4 ×2, R6 ×2, R5 ×1). **12 of 13 have implementation evidence = 92.3%.**

**Gaps: 1 / 13 = 7.7%** — R5 only, and it is an owner-input gap (executor
selection + spend cap), not an implementation omission.

Per 05a's red flag (creep > 5% **or** gaps > 5% → human review with the
matrix): creep is 0%; gaps are 7.7% but entirely attributable to the
contract's own BLOCKED-by-design item. This matrix is therefore presented to
the owner as the review artifact — the gap is the R5 decision already listed
as open, not a newly discovered defect. Recorded honestly rather than
suppressing R5 to make the number look green.

## 5. Self-check

- Hidden AI-added feature missed? Checked all 25 changed files against
  contract items; the only unclaimed surface was `src/contracts/commands.ts`
  (`host` registration), which is required for R2's CLI surface.
- Dead code passing silently? `aegis ast build` — 59 modules, no cycles;
  `src/commands/host.ts` is reachable from `src/cli.ts` dispatch and covered
  by `test/host-surface.test.js`.
- Hallucinated feature caught? The Cursor declaration's claims were
  re-verified against the live official docs on 2026-10-18 (`.cursor/hooks.json`,
  `version: 1`, `command` shell string, project-root cwd, stdin JSON,
  cloud sessionStart deferral) — all confirmed, none invented.

## 6. Sources

- `docs/releases/v0.11/RELEASE-CONTRACT.md` (criteria, must-pass M1–M7)
- `docs/releases/v0.11/PLAN.md` (execution matrix, lane math)
- `aegis ast build` / `aegis ast diff` (module graph, 59 modules, no cycles)
- `aegis validate tests|contracts|deps|perf`, `aegis eval --all`,
  `node scripts/package-check.mjs`, Node-bundled `npm audit --audit-level=high`
