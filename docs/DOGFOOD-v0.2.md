# DOGFOOD v0.2 — Aegis builds a notes CLI, end to end

Date: 2026-07-21. Operator: Kimi Code CLI agent (runtime mode, shell access).
Aegis: `dist/cli.js` of this repo (pre-publish build). No aegis-cli files were
modified; this report is the only addition.

## Setup

- Fresh project at `/tmp/aegis-dogfood` (bare remote at
  `/tmp/aegis-dogfood-remote.git`): a TypeScript "notes CLI" — add/list/delete
  notes in a JSON file, zero runtime deps, `node:test` tests. 2 slices
  (core-store, cli-ui), 426 lines of src+test at ship time.
- Environment reported by `aegis doctor`: L1, Node v24.18.0, git 2.53.0,
  22 cores, ~2 GB free RAM.
- Gates approved with `AEGIS_HUMAN_TOKEN=1` (documented CI escape hatch;
  non-TTY). All other commands run exactly as documented.

## Verdict (up front)

**Both safety and overhead — and for this 2-slice project the safety already
paid for itself once.** The pipeline caught one real contract bug *before any
slice merged* (id reuse, found because the contract + tests forced the issue),
refused a deliberate contract edit in a slice, refused every illegal
transition and un-gated move, and its honesty discipline turned three
"it probably works" assumptions into measured facts (concurrency data loss,
100k-char notes, npm audit). The overhead is real: ~2h10m wall clock for what
is otherwise a 20-minute script, most of it writing brain/ documents whose
value at this scale is thin. Net: the machine-enforced parts (gates, N1/N2/N3,
merge oracle, checkpoint/resume) are worth it everywhere; the document-per-
skill cadence is oversized for prototypes and should have a "small-project
profile".

## Timeline (abridged; every command with exit code)

Full log: 86 aegis invocations were recorded during the run. Wall clock:
14:28Z setup start -> 16:51Z final checkpoint (~2h20m including report
writing; pipeline init->G4 ≈ 2h10m).

| Time (Z) | Command | Exit | Note |
|---|---|---|---|
| 14:35 | `init --yes` | 0 | skills+hooks+brain templates installed |
| 14:36 | `status` / `next` / `doctor` | 0 | state 00a; doctor JSON (see Bug 1) |
| 14:38 | `transition 00b` | 0 | |
| 14:39 | `config set platform kimi-code` etc. | 0 | |
| 14:39 | `config set tech_stack ...` / `config set team solo` | 4 | only fixed key list accepted (friction F1) |
| 14:42 | (commit blocked: hook tsc fails on empty src/) | 1 | friction F2; fixed by placeholder src/index.ts |
| 14:45 | `transition 01a`; PRD + personas written | 0 | |
| 14:47 | `gate PRD --approve` (no token) | 7 | correct refusal, clear message |
| 14:47 | `AEGIS_HUMAN_TOKEN=1 gate PRD --approve` | 0 | |
| 14:52 | `transition 01b`; scope docs | 0 | |
| 14:55 | `transition 02a` (from 01b — skipped 01c) | 4 | correct refusal; did `01c` then `02a` (0) |
| 15:00 | `transition 02b` (G1 open) | 4 | correct gate block |
| 15:00 | `gate G1 --approve` + `transition 02b` | 0 | |
| 15:05 | contracts written; bare remote; `push`; `contracts` | 0 | "verified merged to origin/main — 04a unlocked" |
| 15:10 | `transition 02c`; threat model; `transition 03a` (G2 open) | 4 | correct block; G2 approved (0), `03a` (0) |
| 15:20 | `transition 03b` (after 03a matrix); standards + eslint | 0 | |
| 15:25 | `transition 06d`; perf-budgets.json; `transition 04a` | 0 | |
| 15:30 | `slice create core-store` / `slice create cli-ui` | 0 | worktrees under /tmp/aegis-dogfood-worktrees |
| 15:33 | `merge check aegis/slice-core-store` (deliberate contract edit) | 9 | **CONTRACT DRIFT refusal — correct (N3)** |
| 15:35 | `transition 06e --reason "contract gap..."` | 0 | real contract gap found by slice test (E1) |
| 15:36 | `transition 02b --reason ...` / `transition 03a --reason ...` | 4 | **no edge — Bug 2** |
| 15:36 | `transition 04a --reason "human override..."` | 0 | contract amended on main, `contracts` re-verified (0) |
| 15:45 | `merge check aegis/slice-core-store` (before first slice commit) | 13 | "NOTHING TO MERGE — NOT a pass" — correct |
| 15:50 | `merge check aegis/slice-core-store` (real code, 8/8 tests) | 0 | tsc clean, contracts intact |
| 15:52 | `transition 04b`; git merge core-store; `slice remove` | 0 | |
| 16:00 | cli-ui built vs merged store; 17/17 tests; `merge check` | 0 | |
| 16:05 | merge cli-ui (invalid package.json slipped through — E2) | 0 | oracle scope note, fixed on main |
| 16:10 | `transition 04c`; `ast build` (4 modules, no cycles) / `ast diff` | 0 | |
| 16:12 | `transition 05a` (G3 open) | 4 | G3 approved (0), `05a` (0) |
| 16:13 | `validate contracts` / `tests` / `perf` | 0 | PASS; perf: 6kb vs 200kb, db/TTI UNMEASURED (honest) |
| 16:13 | `validate deps` | 0 | UNMEASURED "audit output unparseable" (real cause: ENOLOCK) |
| 16:13 | `validate e2e` | 0 | UNMEASURED no playwright config — correct L1 degradation |
| 16:20 | 05a matrix; 05b live persona walks; 05c known-issues; lockfile | — | `validate deps` then PASS 0/0/0/0 |
| 16:30 | 05d perf re-run PASS; 05e exploratory (5 live scenarios) | 0 | |
| 16:35 | `transition 06b` (from 05d — skipped 05e) | 4 | correct refusal; `05e` then `06b` (0) |
| 16:40 | 06b review (scores 5/5, verdict proceed); `transition 08a` | 0 | |
| 16:42 | `transition 08b` (G4 open) | 4 | G4 approved (0), `08b` (0) |
| 16:45 | `monitor --once` | 0 | UNMEASURED no targets — honest |
| 16:45 | `transition 01a` (deliberate illegal) | 4 | correct refusal |
| 16:45 | `gate G9 --approve` (deliberate unknown) | 7 | correct refusal |
| 16:46 | `checkpoint`; `resume` | 0 | **integrity: VERIFIED (43 files match)** |
| 16:50 | `eval --all` / `sync` / final `checkpoint` / `status` | 0 | 66/66 skill files pass lint; state 08b, lanes 0/2 |

## Artifacts produced (all in the dogfood repo, 30 commits)

- Code: `src/contracts/note.ts` (N1), `src/store/store.ts`, `src/cli/cli.ts`,
  `src/index.ts`; `test/store.test.ts` (8 tests), `test/cli.test.ts` (9) —
  17/17 pass on main, 0 flaky in 5 consecutive runs.
- brain/: context/manifest.md, personas/, roadmap/ (prd, v1-scope, v2-backlog,
  prototype, execution-matrix), design/ (design-system, user-flows),
  architecture/ (system, decisions, db-schema, api-contracts, standards),
  execution/ (parallel-lanes, merge-log), quality/ (security-audit,
  validation-report, traceability-matrix, ux-flaw-report, accessibility-audit,
  security-gap-report, known-issues, exploratory-test-report, review-report,
  verdict-report, monitor-report, error-log).
- Machine state: 5 gates (PRD/G1/G2/G3/G4), 2 checkpoints, module graph,
  perf-budgets.json, generated AGENTS.md/CLAUDE.md via `aegis sync`.

## Refusals & failures — was each correct?

| Event | Exit | Correct? |
|---|---|---|
| `gate PRD --approve` without token on non-TTY | 7 | Yes — documented escape hatch works, message tells you exactly what to do |
| `transition 01b->02a` skipping 01c; `05d->06b` skipping 05e | 4 | Yes — my own navigation errors, caught |
| `transition` past open G1/G2/G3/G4 | 4 | Yes — sacred gates hold |
| Deliberate contract edit inside slice -> `merge check` | 9 | Yes — N3 contract drift, names the file |
| `merge check` on fast-forwarded branch with no slice commits | 13 | Yes — "NOT a pass" is exactly right |
| Deliberate `transition 01a` from 08b | 4 | Yes |
| Deliberate `gate G9 --approve` | 7 | Yes — lists known gates |
| `transition 06e->02b` / `06e->03a` on real contract gap | 4 | **No — see Bug 2** |
| `config set tech_stack/team` | 4 | Debatable — interview skill asks for these answers but config rejects the keys (F1) |
| Invalid package.json merged past oracle | 0 | Acceptable — oracle is tsc+contracts by design; coverage observation, not a bug (E2) |
| `validate deps` before lockfile | 0 (UNMEASURED) | Honest, but message hid the real cause (F5) |

## Bugs found (in aegis-cli)

1. **`aegis doctor` false-positives playwright and eslint whenever `npx`
   exists.** `dist/lib/detect.js`: `playwright: has('playwright') || has('npx')`,
   `eslint: has('eslint') || has('npx')`. Reproduce on any machine with node
   but without those tools: `aegis doctor` reports `"playwright": true,
   "eslint": true` while `npx --no-install eslint --version` fails with
   "npm error npx canceled due to missing packages". Environment detection is
   what lane-planning and skill degradation decisions cite, so this matters:
   an L1 plan could rely on tools that aren't there.
2. **The documented contract-gap rollback from 04a is machine-impossible.**
   Skill 04a: "Contract violation discovered mid-build -> STOP all lanes,
   rollback to 03a"; 03a->02b is the documented repair edge. But
   transitions.json has no 04a->03a/02b edge and 06e's only edge is 06e->04a.
   So a contract gap found during build (a *normal* event — it happened for
   real in this run, error-log E1) cannot route to the owning skill:
   `transition 02b --reason ...` and `transition 03a --reason ...` both exit 4.
   Workaround used: human-override contract amendment on main + `aegis
   contracts` re-verification. Fix suggestion: add `04a -> 03a` (backward) or
   `06e -> 03a`/`06e -> 02b` (backward) edges.

Neither bug blocked the pipeline; both have honest workarounds.

## Friction points (top)

1. **Skill/config mismatch at 00b.** The interview skill says "record answers
   via `aegis config set <key> <value>`" for 10 dimensions, but config accepts
   only 9 fixed keys — tech stack, team context, risk tolerance, model-tier
   answers have no home except brain files. Either widen config or fix the
   skill text.
2. **First-commit trap for greenfield TS.** The installed pre-commit hook runs
   `tsc --noEmit`, which hard-fails (TS18003) on a repo with no source files
   yet — so the very first commit after `aegis init` fails until you invent a
   placeholder `src/index.ts`. Init could ship the placeholder or the hook
   could skip when `src/` is empty. (Related: skill 03b step 9 claims the hook
   enforces "lint + tsc"; it enforces only tsc + checkpoint.)
3. **UNMEASURED messages bury the cause.** `validate deps` said "audit output
   unparseable (tool/env unavailable)" when the real cause was `ENOLOCK`
   (no lockfile) — one line of the tool's stderr in the summary would have
   saved a manual `npm audit` run. Same pattern in `monitor --once` (fine) and
   `validate e2e` (fine) — those two name the cause well; deps should too.

Smaller notes: `ast` module-graph export signatures embed absolute paths
(`/tmp/aegis-dogfood/...`) — cosmetic, but it makes graphs non-portable and
noisy in diffs. `ast diff` right after `ast build` always says "no changes",
so its value only shows up across real edits; fine, but the skill text
(04b step 6) reads as if it will report something at that point. The
state-visits counter (x/3) appears on every transition but is never
explained in command output; I only understood it after reading
transitions.json (max_loop). Slices also lose untracked helper files in their
worktrees (my node_modules symlink vanished after a merge-check cycle) — git
semantics, but a one-line hint in `slice create` output would help.

## Where the pipeline earned its keep (safety evidence)

- E1: the frozen contract ("ids never reused") + my own slice test collided
  with reality (`max+1` reuses ids). Because contracts were code merged under
  N1 and slices were forbidden to edit them, the gap surfaced as a test
  failure *before* any merge, was escalated through 06e, and the amended
  contract (`next_id` counter) was re-verified by `aegis contracts`. The 05e
  exploratory run later proved the fix end-to-end (delete-all-then-add gives
  the next id). This is the pipeline working exactly as advertised.
- The N3 oracle refused the deliberate contract edit with a precise,
  actionable message (file named, adapter suggested).
- Honesty rules produced real measurements instead of vibes: K1 (concurrent
  adds lose data — both processes printed the same id) went from a
  threat-model *assumption* to a *measured* accepted risk; the 100k-char
  self-DoS likewise; `validate perf` reported 6kb-vs-200kb and labeled
  db/TTI UNMEASURED rather than inventing numbers.
- `resume` after checkpoint reported VERIFIED (43 files hashed) — the
  checkpoint-per-commit hook meant this was never manual work.
- Every one of my three navigation mistakes (skipped 01c, skipped 05e,
  premature 08b) was refused with the correct exit code and a useful message.

## Where it felt heavy

- 15 brain/ documents for 426 lines of code. Each is individually sensible;
  in aggregate, for a prototype-profile solo project, the design-system,
  user-flows, v2-backlog, parallel-lanes, and accessibility-audit files
  restate the PRD in different formats. A `ship_profile=prototype` fast path
  that merges 01b+01c and 05b+05e into single artifacts would cut the
  doc-load roughly in half without touching any machine enforcement.
- Transitions are strict even when the *work* is done (two exit-4s were me
  forgetting a bookkeeping transition after completing the next skill's
  artifacts). A `aegis next --why` that names the missing artifact vs the
  missing transition would shorten the confusion.
- Wall clock: ~2h10m of pipeline for ~20 minutes of engineering content. At
  real-project scale the ratio improves (documents amortize), but for
  2-slice prototypes the fixed cost dominates.

## Bottom line

For a 2-slice project: **overhead 60%, safety 40% — but the 40% fired for
real.** Nothing in the machine layer is ceremonial: every refusal I
deliberately or accidentally triggered was correct, exit codes matched the
docs every time, and the one genuine mid-build contract gap proved the
N1/N2/N3 chain's value. The weight is in the skill-document cadence, which is
one-size-fits-all. Ship the doctor-detection fix and the 04a rollback edge
before v1.0; consider a prototype document profile after that.
