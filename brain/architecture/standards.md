# Coding standards — aegis-cli (locked 2026-10-18, v0.11 build)

Locked for the v0.11 slices, per SKILL-03b. Each rule maps to an actual
enforcement mechanism in this repo's stack — TypeScript CLI compiled with
`tsc` strict, `node:test` integration suites, git hooks, audit scripts.
There is no ESLint/Prettier in this brownfield stack; rules no tool can
express are marked **REVIEW** with the checkpoint that carries them. This
file is not aspirational: every claim below was verified against the live
repo (sources cited).

## Structure and size

| Rule | Mechanism | Verified state |
|---|---|---|
| One responsibility per file; files ≤800 lines | **REVIEW** at 06b + countable (`Get-ChildItem src -Recurse -Filter *.ts \| ... length`) | largest file `src/commands/memory.ts` 605 lines (2026-10-18) |
| Functions ≤50 lines, single job | **REVIEW** at 06b | no counter in stack; reviewable in diff |
| Named exports, no default exports | repo convention + `tsc` import checking | `src/` uses named exports throughout |
| Guard clauses / early returns | **REVIEW** at 06b | — |
| Named constants over magic numbers | **REVIEW** at 06b | — |
| New feature code lands by feature (`src/adapters/<host>.ts`, `src/hosts/…`), not by layer | slice isolation + one file per host | v0.11 plan §2 |

## Naming

camelCase functions/variables; `is/has/should/can` booleans; PascalCase
types; UPPER_SNAKE constants (`CONTRACT_COMMANDS`, `SCHEMA_VERSION`).
Types are checked by `tsc`; naming is **REVIEW** at 06b.

## Immutability and state

- Never mutate shared state objects in place; state changes go through the
  lease API (`acquireState`/`commitState`, `src/lib/state.ts`) so
  concurrent CLI participants cannot interleave writes — enforced by
  `test/audit-state-fs.test.js` and the state-fs audit regressions.
- Return copies from helpers that expose internal data; mutation across
  slice boundaries breaks parallel lanes (merge conflicts are the signal,
  review is the gate).

## Errors, validation, logging

- Every refusal uses the documented exit contract (`src/contracts/
  commands.ts`, `die(code, msg)`); ad-hoc exit codes are a bug —
  enforced by `test/contracts-self.test.js` and the exit-code block test.
- Catch at boundaries only; no swallowed failures. External data (host
  configs, upstream text, logs) is **UNTRUSTED input** — fixtures mark it,
  and secrets never reach logs, brain files, commits or evidence
  (`src/lib/redact.ts` + audit checks).
- User-visible output goes through `ok`/`die`; machine evidence through
  recorded observations with command citations.

## Testing discipline

- Every behavior is pinned by integration tests spawning the built CLI
  (`test/helpers.js` → `dist/cli.js`); suite: `npm test` =
  `node --test test/*.test.js` (319 tests green at v0.11 start).
- One behavior per test, Arrange–Act–Assert, independent tests — **REVIEW**
  at 06b; fixtures use `scratch()` isolation, never the live repo.
- Slice code changes carry TDD receipts with byte-identical test files at
  RED and GREEN (`aegis tdd`, enforced by `src/commands/tdd.ts`).
- Coverage: **UNMEASURED** — no coverage harness in this stack; the 80%
  intent is kept as a 07a backlog item (recorded, not silently dropped).
- Release battery (`scripts/audit.mjs`, `self-cycle`, `pilot`, `dogfood`,
  `package-check`) runs per candidate; exact-commit CI runs the same.

## Skill files

Skill markdown must pass `aegis lint-skills --all` (Margin Format:
frontmatter, token budgets, body order, link integrity, trigger
collisions) — 71/71 green at lock time.

## Hook enforcement path (verified live)

- `pre-commit` — `aegis checkpoint --quiet` + `aegis typecheck` (this repo:
  `tsc --noEmit`), blocking. Observed on every commit today.
- `post-commit` — advisory checkpoint re-record.
- `pre-push` (profile `standard`, current) — `aegis validate contracts`,
  blocking; profile `strict` additionally runs `aegis validate tests`.
- Profile is owner config (`config.hooks_profile`); CI carries the full
  battery regardless.

## Exceptions

None recorded. Slice exceptions are recorded here with a reason and the
review that accepted them — never silent.

## Immutability for slices

Locked for v0.11 slices: a slice may not rewrite this file or
`src/contracts/` (N1 — the merge oracle refuses contract edits in slice
branches). Standards changes require a reviewed commit on main with the
reason recorded in the commit message. This is a review rule, stated
honestly: only the contracts rule is machine-enforced.
