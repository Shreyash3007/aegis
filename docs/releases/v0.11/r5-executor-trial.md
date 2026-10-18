# R5 executor trial - frozen task, assertions, and evidence protocol

Release: v0.11 "Reach" (W4-B). Contract: `docs/releases/v0.11/RELEASE-CONTRACT.md`
(R5: the executor produces the actual diff, RED/GREEN, acceptance, review,
integrated merge and recovery evidence through Aegis; task and assertions
freeze before the run; interventions, failures and actual usage provenance are
recorded; **a script or mock cannot satisfy this slice; a missing
executor/credentials is BLOCKED, never a success**). Plan row: `PLAN.md` W4-B
(OWNER).

**Status: PREPARED, NOT RUN.** As of this commit, no executor has been
selected, no spend has been authorized, and no R5 delivery evidence exists.
Everything here - plus `docs/releases/v0.11/r5-trial-setup.mjs` - is the
owner-run instrument. Contract must-pass item 4 stands: v0.11 exit requires R5
delivery evidence **or** an explicit owner decision to ship without it, stated
in the G4 verdict (the roadmap default is that R5 is required).

## Owner inputs required (the blocker)

1. **Executor selection** - a real model-driven executor in the small/free
   class (not this orchestrator, not a script). The executor must be able to
   run shell commands, edit files and commit in a disposable repo.
2. **Spend cap** - owner-set. The run records tool-reported usage (labeled
   "tool-reported, not billing"); a cap breach stops the run and is recorded.
3. **Or the explicit alternative**: an owner decision to ship v0.11 without
   R5, stated in the G4 verdict. Never silent.

## What the trial proves - and what it does not

Proves (if the bundle lands): an owner-selected external executor can drive
the v0.11 build lane end-to-end through Aegis's enforced predicates on a
disposable project - slice, RED/GREEN receipts, acceptance criteria, recorded
review, integrated merge oracle with `--require-proof --require-quality`,
fast-forward merge, lane close and checkpoint/resume recovery - with
interventions, versions and usage provenance recorded. It also measures
whether a weak executor can *finish* (or where it stalls), which is the point.

Does not prove: model quality or cost-effectiveness in general; live trigger
precision; anything about the aegis repository's own gates (those stay
human-approved); that the feature chosen is representative of real work.

## Frozen task T1

Feature: `src/greet.mjs` exporting `greet(name)`. Correctness contract (the
only source of truth - the executor writes the implementation; no reference
implementation is shipped):

| input | result |
|---|---|
| non-string (number, null, undefined, ...) | throws `TypeError` |
| string | trimmed; empty/whitespace-only -> `'Hello, world!'`; else `Hello, <trimmed>!` |

Anything not listed is not required (CLI entry, extra options, docs). Edge
cases the tests below pin: `'  Ada  '` -> `'Hello, Ada!'`; `''` and `'   '` ->
`'Hello, world!'`; `42` and `null` -> `TypeError`.

## Frozen test set (commit these bytes, unchanged, on the slice before implementing)

`test/greet.test.mjs`:

```js
// Frozen R5 trial test set (docs/releases/v0.11/r5-executor-trial.md, T1).
// Commit these bytes on the slice branch BEFORE implementing src/greet.mjs;
// do not edit them after `aegis tdd red` (the receipt pins the test bytes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.mjs';

test('greet trims and greets the name', () => {
  assert.equal(greet('  Ada  '), 'Hello, Ada!');
  assert.equal(greet('Grace'), 'Hello, Grace!');
});

test('empty and whitespace-only input falls back to world', () => {
  assert.equal(greet(''), 'Hello, world!');
  assert.equal(greet('   '), 'Hello, world!');
});

test('non-string input throws TypeError', () => {
  assert.throws(() => greet(42), TypeError);
  assert.throws(() => greet(null), TypeError);
});
```

Frozen acceptance criteria live in `docs/r5-acceptance.json` (written by the
setup script; committed on main before the slice): AC1 `trims and greets the
name`, AC2 `falls back to world`, AC3 `non-string input` - each an exact
`node --test --test-name-pattern` command. Do not modify the `criteria`
array; the review step only **appends** a `findings` array.

## Verification record (2026-10-18, Node v24.19.0)

What was actually exercised before freezing this document (all commands and
outputs kept in the session log; nothing here is R5 evidence):

1. **Frozen fixture, standalone** (scratch dir, exact bytes above): with
   `src/greet.mjs` absent -> exit 1; with a reference-shaped implementation ->
   3/3 pass, exit 0; each AC pattern command -> exit 0.
2. **Setup scaffold, current bytes re-verified** (candidate CLI = main
   `5e9a4e4` build, post-R3c): all 21 walk rows OK (init, N1 contracts, full
   00b->03b walk with PRD/G1/G2 refusals + synthetic approvals, demo record,
   DEMO approval, 04a), final `git status --porcelain` clean check OK,
   `SETUP-EXIT=0`; trial repo at 04a, `quality_profile: strict`, lanes 0/2.
   (A first run of the pre-fix script surfaced that `docs/demo.md` was left
   untracked; the script now commits it and self-checks the tree - the re-run
   above verifies the current bytes.)
3. **Executor-phase mechanics dry-run** (scripted implementation - explicitly
   NOT R5 evidence; disposable scratch): `slice create greet-trial` (lane
   1/2); RED recorded at `431d9b6` (exit 1, implementation module absent);
   implementation commit `bf9f366`; findings appended, commit `36c6f40`; GREEN
   recorded at `36c6f40` (exit 0); acceptance 3/3 PASS; review recorded (no
   open blocker/major); `merge check` PASSED (base `a3a71d1`, feature
   `36c6f40`; typecheck advisory "UNVERIFIED (no recognized stack)"; contracts
   intact); `git merge --ff-only` + `slice remove` (lane closed); transitions
   04b -> 04c; `checkpoint` + `resume` integrity VERIFIED (15 files).
   Observations folded into this runbook: (a) run every `aegis` command from
   the trial repo root - from a slice worktree the CLI refuses honestly
   ("missing state.json ... run the command there"); (b) the contract's flag
   form `merge check <branch> --require-proof --require-quality` parses and
   returns exit 13 on an already-merged branch (correctly "NOT a pass"); under
   `quality_profile=strict` both forms enforce the same evidence (strict
   implies both flags).

Before the owner run: re-run the setup against the frozen release candidate
(or pass `--cli`) so the trial's candidate identity equals the release
candidate's; the setup run's table is part of the bundle.

## Frozen assertions (R5 is complete only when A1-A9 all have recorded evidence)

| # | Assertion | Evidence |
|---|---|---|
| A1 | Scaffold: setup table all-OK incl. the final clean check; `SETUP-EXIT=0`; trial repo path, state 04a, lanes 0/2; candidate identity recorded (`--version` + source commit) | setup output + `aegis status` |
| A2 | Executor + cap: executor tool/version/model as reported by the executor itself; owner spend cap; usage recorded as tool-reported | session log header |
| A3 | RED: `tdd red` receipt at the test commit, exit 1; test bytes identical to this document | receipt line + committed bytes |
| A4 | GREEN: `tdd green` receipt at the FINAL tip, exit 0 (replays the runner self-contained; no commit after it) | receipt line |
| A5 | Acceptance: 3/3 PASS on the criteria from `docs/r5-acceptance.json` at the tip | command output |
| A6 | Review: `quality review` recorded; findings list reviewer identity; if an open blocker/major refuses the merge, that refusal is kept as a result | command output |
| A7 | Merge: `aegis merge check <branch> --require-proof --require-quality` PASSED with base/feature hashes; `git merge --ff-only`; `slice remove`; transitions 04b + 04c recorded | command outputs |
| A8 | Recovery: `checkpoint` + `resume` integrity VERIFIED at the merged tip | command outputs |
| A9 | Bundle: session log, diff, receipts, limits committed under `docs/releases/v0.11/r5-executor-trial-evidence/` in the aegis repo, with the owner acknowledgment section | the bundle commit |

## Runbook

Setup (once): `node docs/releases/v0.11/r5-trial-setup.mjs` (prints the trial
repo dir; keep its output). All `aegis` commands below run **from the trial
repo root**, never from the slice worktree. Runbook steps 1-9 are the build
lane the executor drives; the owner runs the environment, keeps the
intervention log, and may stop for the spend cap at any time.

1. `aegis slice create greet-trial` - note the worktree path it prints.
2. In the worktree: write `test/greet.test.mjs` with the frozen bytes; commit.
3. `aegis tdd red aegis/slice-greet-trial --test-file test/greet.test.mjs --expect-exit 1 --timeout-ms 120000 -- node --test test/greet.test.mjs` -> recorded exit 1.
4. Implement `src/greet.mjs`; commit. (Iterate freely before the receipts -
   they bind the final tip, so GREEN is recorded only after the last commit.)
5. Review the diff against the frozen contract; append a `findings` array to
   `docs/r5-acceptance.json` (criteria array untouched; every finding's
   evidence paths must exist at the tip; reviewer identity named in the
   session log - executor self-review unless the owner designates otherwise);
   commit.
6. `aegis tdd green aegis/slice-greet-trial` -> exit 0 at this final tip. A
   later commit staleness-refuses the merge - that is the mechanism working.
7. `aegis quality acceptance aegis/slice-greet-trial --file docs/r5-acceptance.json` -> 3/3 PASS.
8. `aegis quality review aegis/slice-greet-trial --file docs/r5-acceptance.json` -> recorded.
9. `aegis merge check aegis/slice-greet-trial --require-proof --require-quality` -> PASSED (typecheck UNVERIFIED advisory is expected on a no-stack repo).
10. Merge + close (trial repo root): `git merge --ff-only aegis/slice-greet-trial`; `aegis slice remove greet-trial`; `aegis transition 04b`; `aegis transition 04c`.
11. Recovery: `aegis checkpoint`; `aegis resume` -> integrity VERIFIED.
12. Bundle + owner acknowledgment (below); commit the bundle to the aegis repo.

## Recording sheet (trial session log)

| time | actor | action | exact command / output ref |
|---|---|---|---|

Rules: every intervention = anything not in this runbook (re-prompts, hand
fixes, restarts, model/tool switches); a human edit to executor code
invalidates that segment - record it and either redo the segment by the
executor or mark the run partial. Failed runs stay recorded verbatim;
successor notes are appended, never rewritten. Usage: tool-reported figures
labeled as such, alongside the owner cap and whether it was breached.

## Evidence bundle

```
docs/releases/v0.11/r5-executor-trial-evidence/
  session-log.md   every command + exit code + interventions + versions + usage
  diff.patch       git format-patch <scaffold tip>..aegis/slice-greet-trial
  receipts/        verbatim outputs: red, green, acceptance, review, merge check, resume
  limits.md        what this trial does not establish (single small feature; tool-reported usage; no model-quality claims)
```

`limits.md` must state plainly that the bundle is one small scripted-scope
delivery by one executor on one disposable project - not a benchmark - and
that nothing is claimed beyond the recorded commands.

## Amendment rule

This document is frozen when committed. Pre-run amendments must be recorded as
dated successor notes by the owner before the executor starts; once a run
begins, this text is immutable for that run. The scripted mechanics dry-run
(verification record 3) is runbook verification and is NOT R5 delivery
evidence - only the A1-A9 bundle from a real executor satisfies the slice.
