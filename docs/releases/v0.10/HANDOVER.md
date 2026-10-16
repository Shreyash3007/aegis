# v0.10 Handover — any agent or session continues from here

Date: 2026-10-16. Authority: this file plus `docs/releases/v0.10/RELEASE-CONTRACT.md`,
`docs/releases/v0.10/AUDIT.json`, `GATES.md`, `docs/ROADMAP.md`.

## 1. Where we are

- Main HEAD: `0cef1bc`, clean, pushed. No tag, no release, no G4 for v0.10.
- Pipeline state: `05c` (bug hunting). Open slice: `v010-lock-deadline`
  on branch `aegis/slice-v010-lock-deadline`, lane 1/2. Worktree:
  `D:\Projects\aegis-worktrees\v010-lock-deadline`.
- Main-tree locks/state are untouched by this slice; all edits live in the
  worktree until merged through the oracle.
- Loop/cycle counters were reset by the owner after human review of the
  remaining Windows failures. That authorized another repair pass, not shipping.

## 2. What just broke and what the fix is

- CI run `38889740451` on `0cef1bc`: Ubuntu Node 20/22 PASS; Windows Node 22
  tests **303/303 PASS**, package check PASS, but adversarial audit section E
  failed with 2 findings from one check: the audit's own 20-way concurrent
  exec hit the fixed **10s** lock acquisition deadline on slow CI hardware
  (19/20 events recorded). Locally the same audit is 153/153.
- This is an availability bound, not a safety defect: exclusive creation,
  ownership tokens, dead-owner reclamation and fail-closed refusal are intact.
- Repair in this slice:
  - `src/lib/lock.ts`: `performance.now() + 10_000` to `+ 60_000`; refusal
    message `waited 10s` to `waited 60s`. No other lock semantics changed.
  - `test/windows-lock-deadline.test.js`: proves a 12s live holder is
    acquirable within the new bound and the refusal names 60s without
    granting ownership. Both assertions failed before the fix (RED recorded
    via `aegis tdd red`).
- Focused green so far: deadline (2) + lock-leaf (2) + lock-contention (3)
  = 7/7. Broader concurrency/state/path suites still need a full run before merge.

## 3. Exact resume commands

Run from `D:\Projects\aegis` unless noted (PowerShell):

```powershell
Set-Location D:\Projects\aegis
node .\dist\cli.js status
git status --short
git log --oneline -5
```

Work in the slice (from `D:\Projects\aegis-worktrees\v010-lock-deadline`):

```powershell
npm run build
node --test test/windows-lock-deadline.test.js test/windows-lock-leaf.test.js test/windows-lock-contention.test.js
node --test test/concurrency.test.js test/audit-state-fs.test.js test/windows-path-identity.test.js
```

TDD receipts already recorded RED for this slice. After green:

```powershell
Set-Location D:\Projects\aegis
node .\dist\cli.js tdd green aegis/slice-v010-lock-deadline
node .\dist\cli.js merge check aegis/slice-v010-lock-deadline --require-proof
```

Only on oracle PASS: fast-forward merge, rebuild, push, close the slice,
then run the release sequence below. Never bypass the oracle.

## 4. Release sequence after merge (exact order)

1. `npm test` (expect fail 0; count is currently 303 on Windows CI).
2. `node scripts/audit.mjs` (expect `153 checks, 0 findings`).
3. `node dist/cli.js lint-skills --all` (expect 71/71).
4. Node-bundled `npm audit --audit-level=high` (expect 0 vulnerabilities).
5. `node scripts/self-cycle.mjs --superpowers-root <pinned-archive>` (61/61).
6. `node scripts/pilot.mjs` (43/43 deterministic smoke, not a model trial).
7. `node scripts/dogfood.mjs` (71 steps, 0 unexpected).
8. Isolated package check: `node scripts/package-check.mjs --directory <fresh-dir>`.
9. Push, wait for exact-HEAD CI on all three jobs, then `node scripts/release-check.mjs`
   (expect `CLEARED to tag`, 7/7).
10. Owner runs `node .\dist\cli.js gate G4 --approve` for the exact final SHA.
11. Tag `v0.10.0`, publish the built `.tgz` + `.sha256` + evidence sidecar,
    verify the live download and site links.

`--local` ritual runs are preflights only, never clearance.

## 5. File inventory for this repair

Owned by this slice (do not touch anything else here):

- `src/lib/lock.ts` — the two-line deadline/message change.
- `test/windows-lock-deadline.test.js` — the two RED-first regressions.
- `docs/evidence/v0.10-ci-erratum-0cef1bc.json` — preserved failure record.
- `CHANGELOG.md`, `docs/releases/v0.10/AUDIT.json`,
  `docs/releases/v0.10/NOTES.md`, `docs/ROADMAP.md`,
  `brain/context-window.md`, this file — documentation updates only.

Do not edit `.aegis/` by hand; use the CLI. Do not approve gates yourself.
Do not move tags. Do not start v0.11 implementation; it is queued in the
roadmap behind the v0.10 release and separate owner approval.

## 6. Evidence locations (do not rewrite, append successors)

- Failing CI: `C:\Users\sakha\AppData\Local\Temp\opencode\aegis-v010-windows-failure-0cef1bc.log`
  (audit section E, 20-way contention, 19/20 events).
- Local audit pass: `C:\Users\sakha\AppData\Local\Temp\opencode\aegis-0cef1bc-local-audit.log`
  (153 checks, 0 findings on a faster machine).
- RED log: `C:\Users\sakha\AppData\Local\Temp\opencode\aegis-lock-deadline-red.log`.
- GREEN log: `C:\Users\sakha\AppData\Local\Temp\opencode\aegis-lock-deadline-green.log`.
- Short-path parity: `aegis-short-temp-0Cwwhc/result.log` (71/71).
- Contention repetitions: `aegis-0cef1bc-contention-*.log` (5 runs).

## 7. Known limits to keep visible

- CLI checks coordinate CLI participants; they are not an OS sandbox.
- Skill/procedure verification is not proof of taste, customer truth, or review adequacy.
- Legacy missing receipts still need explicit strict flags; strict-profile migration is v0.11.
- Structural doc-contract checks are heuristics, not semantic proofs.
- Scripted smoke and the calibration bank are not a small-model trial or benchmark.
- The website still shows v0.9 as stable until the v0.10 publication follow-up.
