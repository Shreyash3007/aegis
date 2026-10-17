# v0.10 Handover — any agent or session continues from here

Date: 2026-10-17 (post-release update; original 2026-10-16 release handover
is preserved in git history). Authority: this file plus
`docs/releases/v0.10/RELEASE-CONTRACT.md`, `docs/releases/v0.10/AUDIT.json`,
`GATES.md`, `docs/ROADMAP.md`.

## 1. Where we are

- **v0.10.0 is released** (2026-10-16): immutable tag `v0.10.0` on exact
  source `43ab0bd`, all three CI jobs green (run 38935831039), full 7-check
  ritual `CLEARED to tag`, offline install verified, human G4 recorded for
  that commit. Assets: `aegis-0.10.0.tgz`, `.sha256`, `package-evidence.json`,
  `release-evidence.json` on the GitHub release.
- Pipeline state: the post-release repair work is **merged and closed** —
  slice `postrelease-repairs` fast-forwarded to main as `b3cce9a` (merge
  oracle PASSED with TDD proof; history rebuilt so final test bytes are
  identical at RED `b2dea9a` and GREEN `b3cce9a`), slice removed, lane
  closed. Main then advanced: `5914e94` (synced views), `70bcf5f` (quality
  plan extended with post-release criteria/findings). No tag or release has
  been touched; fixes fold into the next release. The maintain walk
  (`07b -> 07c -> 08a`) feeds the v0.11 cycle entry (`08a -> 02c -> 03a`);
  see section 8 for the cycle-guard note when this was written.
- The release candidate of any future release is the HEAD that carries green
  exact-commit CI, a passed full ritual, and fresh human G4. The published
  release itself is the immutable tag, which may be older than main HEAD.

## 2. Post-release audit (2026-10-17)

Two adversarial reviewers re-tested the shipped v0.10.0. Reproduced code
findings, each with a failing-first regression in
`test/audit-postrelease.test.js` (runner: `scripts/check-postrelease-audit.mjs`):

- Hook identity was a whole-body substring match: a foreign hook merely
  *mentioning* `# AEGIS` was clobbered on install and deleted on uninstall;
  a second foreign generation was silently overwritten when a backup
  existed. Fixed by anchoring identity to the managed banner line and
  refusing ambiguous re-installs.
- Hook install wrote through a symlinked hook file to outside the repo;
  uninstall died on the same link. Fixed: install refuses links, uninstall
  skips them with a note.
- A junctioned `.git` installed hooks into a foreign repository. Fixed:
  the `.git` entry is link-checked before any command runs.
- `slice remove` closed the lane while Git still knew a *moved* worktree;
  an orphaned worktree directory dead-ended without a recovery hint.
  Fixed: registry identity is the slice branch at any path; the orphan
  message names the manual recovery step.
- Lock edges: a failed owner-write left a permanent zero-byte "malformed"
  wedge; an undeletable dead-owner lock raw-crashed (exit 1); a
  live-but-unreadable lock was misdiagnosed as corruption; alias spellings
  of one lock self-contended. All fixed fail-closed with distinct guidance;
  every failure path still refuses theft and unowned deletion.
- Uninstall: a pinned `.aegis` left a half-uninstalled repo; an external
  `core.hooksPath` permanently blocked removal. Fixed: the machine tree is
  removed first (nothing else changes if it cannot go); external hooks dirs
  are skipped with a note while the default dir is still cleaned.

Docs/claims findings fixed in the same slice: stale pre-release state in
HANDOVER/ROADMAP; SECURITY.md documented the pre-repair source-archive
updater; PLATFORM-MATRIX described the removed ">60s stolen" semantics;
undated historical metrics in README/site/GODSKILL-SPEC; missing CHANGELOG
date; GATES.md lacked a pointer to published results; the tagged tree's
site page predates the publication follow-up (recorded as erratum O5).

Unverified limits recorded, not fixed (inspection-only, per the reviewers):
crash windows between worktree creation and registration; the non-atomic
`.gitignore` rewrite in uninstall; lstat-then-act TOCTOU against a
concurrent attacker with repo write access; skip-worktree status blind
spots in the dirty-work predicate.

## 3. Exact resume commands

From `D:\Projects\aegis` (PowerShell):

```powershell
node .\dist\cli.js status
git status --short
node .\dist\cli.js next
```

The repair slice is merged and its worktree deleted. To re-verify the
repairs directly on main:

```powershell
node scripts\check-postrelease-audit.mjs
node --test test\hooks.test.js test\remove.test.js test\audit-state-fs.test.js
```

The TDD receipt for the merged repair chain is preserved at
`.aegis/tdd/b80b4404c62a9228b621c477c5900ebaccff7ba21d2fd6d25a393d323b2fd944.json`
(the slice branch itself was removed with the slice).

## 4. Verification battery for the next release candidate

1. `npm test` (expect fail 0)
2. `node scripts/audit.mjs` (expect `153 checks, 0 findings`)
3. `node dist/cli.js lint-skills --all` (71/71)
4. Node-bundled `npm audit --audit-level=high` (0 vulnerabilities)
5. `node scripts/self-cycle.mjs --superpowers-root <pinned-archive>` (61/61)
6. `node scripts/pilot.mjs` (43/43), `node scripts/dogfood.mjs` (71 steps)
7. `node scripts/package-check.mjs --directory <fresh-dir>`
8. Push, wait for exact-HEAD CI on all three jobs, then
   `node scripts/release-check.mjs` (expect `CLEARED to tag`, 7/7)
9. Owner runs `node .\dist\cli.js gate G4 --approve` for the exact final SHA
10. Tag, publish assets + evidence sidecar, verify the live download

`--local` ritual runs are preflights only, never clearance.

Post-merge battery on the repaired main, run 2026-10-17 (all passed):
`npm test` 319/319 fail 0; `node scripts/audit.mjs` 153 checks, 0 findings;
`lint-skills --all` 71/71; Node-bundled `npm audit --audit-level=high`
0 vulnerabilities; `self-cycle.mjs --superpowers-root <pinned-checkout>`
61/61; `pilot.mjs` 43/43; `dogfood.mjs` 71 steps, 0 unexpected;
`package-check.mjs` `PACKAGE VERIFIED` (10 runtime packages). Quality
receipts recaptured at `70bcf5f`: acceptance 5/5 (includes the new
`POSTRELEASE-REGRESSIONS` criterion), review recorded with no open
blocker/major, `QUALITY VERIFIED`.

Environment quirks (2026-10-17): the PATH `npm` is a globally installed
12.2.0 whose `audit` cannot read `npm-shrinkwrap.json` (ENOLOCK). Use the
Node-bundled npm 11.17.0:

```powershell
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" audit --audit-level=high
```

(`aegis validate deps` measures PASS when that npm resolves first; with the
broken PATH npm it honestly reports UNMEASURED.) The pinned Superpowers
checkout was re-created after temp cleanup at
`C:\Users\sakha\AppData\Local\Temp\opencode\superpowers-8ca22dba` via
`git clone https://github.com/obra/superpowers` + `git checkout
8ca22dba9a94f28898bbce59f2537ff4d87c747d`; verify the six
`skills/superpowers.lock.json` `git_blob`s before use. Monitor target
registered: `https://shreyash3007.github.io/aegis/` (benchmark 3000ms),
`monitor --once` HEALTHY; re-add with `node .\dist\cli.js monitor target
add <url> --benchmark-ms 3000` if `.aegis/monitor-targets.json` is missing.

## 5. File inventory for the merged repair slice

Merged as `b3cce9a`: `src/lib/hooks.ts`, `src/lib/util.ts` (findRepoRoot),
`src/lib/lock.ts`, `src/commands/slice.ts`, `src/commands/remove.ts`,
`test/audit-postrelease.test.js`, `scripts/check-postrelease-audit.mjs`,
plus the doc files corrected above. Do not edit `.aegis/` by hand; use the
CLI. Do not approve gates yourself. Do not move published tags. v0.11
implementation needs the owner's explicit go per `docs/ROADMAP.md`.

## 6. Evidence locations (append, never rewrite)

- Review reports (2026-10-17): `C:\Users\sakha\AppData\Local\Temp\opencode\aud-v010-post-winpath-review.md`,
  `aud-v010-post-claims-review.md` (scratch drivers under
  `aud-v010-post-winpath\`).
- RED/GREEN logs: `aud-postrelease-red.log` (14/14 failing against the
  released code), `aud-postrelease-green4.log` (14/14 passing),
  `aud-postrelease-legacy.log` (70/70 existing tests passing).
- Post-release suite at HEAD: `aud-v010-postrelease-suite.log` (305/305),
  audit `aud-v010-postrelease-audit.log` (153 checks / 0 findings).
- Merged-repair evidence (2026-10-17, scratch in `.../opencode/`):
  `aud-merge-check.log` (oracle PASSED, `--require-proof`), `aud-tdd-red.log`
  / `aud-tdd-green.log`, `aud-postrelease-green5.log` (14/14 after the
  deterministic pin fixture), `aud-postrelease-full2.log` (the pre-fix
  318/1 full run, retained for the flake history). Post-merge battery:
  `postrepair-tests.log` (319/319), `postrepair-audit.log`,
  `postrepair-lint.log`, `postrepair-npm-audit.log` (documents the PATH-npm
  12.2.0 ENOLOCK failure; the passing audit used the Node-bundled npm),
  `postrepair-self-cycle2.log` (61/61; receipt
  `.aegis/self-cycle/8517013f-a01e-4454-bd97-4d7e182f72c7.json`),
  `postrepair-pilot.log`, `postrepair-dogfood.log`, `postrepair-package.log`.

## 7. Known limits to keep visible

- CLI checks coordinate CLI participants; they are not an OS sandbox.
- Skill/procedure verification is not proof of taste, customer truth, or
  review adequacy.
- Legacy missing receipts still need explicit strict flags; the
  strict-profile migration is v0.11 R1.
- Structural doc-contract checks are heuristics, not semantic proofs.
- Scripted smoke and the calibration bank are not a small-model trial or
  benchmark; no comparative quality/cost claim exists.
- The v0.10.0 tag permanently contains the pre-follow-up site page
  (erratum recorded in ROADMAP O5); the live site serves from main.

## 8. Cycle-guard note and pending owner actions (2026-10-17)

The maintain walk reached `07c`; the transition to `08a` is refused by the
cycle guard (`state 08a visited 3x`) after three legitimate
release/maintenance walks since the last reset. Per the Aegis rules this
stops and waits for human review; after that review the audited
`node .\dist\cli.js loops reset --reason "<reviewed reason>"` clears the
counters and the walk continues `07c -> 08a -> 02c -> 03a` into v0.11
planning. Do not retry the transition before the reset.

Pending owner actions:

1. `loops reset` review (above) — the only blocker to continuing the walk.
2. DEMO re-approval before the first v0.11 build lane (the recorded
   artifact `docs/index.html` changed during the repairs, so the
   v0.10-era approval is stale): `node .\dist\cli.js gate DEMO --approve`
   in an interactive shell, retype `DEMO` at the prompt.
3. v0.11 R5 executor: choose the small/free executor to trial and any
   spend limit; the framework deliberately does not select models.
4. Confirm the repaired-release form: the reading here is that the fixes
   fold into v0.11 and no `v0.10.1` tag is cut; say so if a patch release
   is preferred instead.
