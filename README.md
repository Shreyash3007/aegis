# AEGIS

**The enforcement layer for AI-native software development.**
A thin runtime CLI that owns deterministic truth — state, gates, transitions,
checkpoints, merge validation — plus 66 skill files that own judgment.
If a rule must be enforced, it lives in code. Nothing is enforced by prose.

- State machine as data (`transitions.json`) — illegal transitions refused
- Sacred human gates (PRD, architecture, security, integration, ship)
- Contract-first parallel builds with a compiler-backed merge oracle
- Hash-verified crash recovery, deterministic artifacts, cycle detection
- Honest validation: every metric cited or labeled UNMEASURED

## Install

```bash
npm install -g github:<org>/aegis     # from GitHub (builds automatically)
```

or from source:

```bash
git clone <repo-url> && cd aegis
npm install && npm run build && npm link
```

## Quickstart

```bash
cd your-project        # any git repo
aegis init             # interview + scaffolding
aegis status           # where you are, what's legal
aegis next             # the ONE next skill
```

Then let your AI agent read `AGENTS.md` (the agent handbook) and the skill
file for the current state in `.aegis/skills/`. See `SETUP.md` for the full
guide and `docs/PLATFORM-MATRIX.md` for platform support status.

## Phase 0 Commands

| Command | Behavior | Exit codes |
|---|---|---|
| `aegis init [--yes] [--overwrite]` | Scaffold .aegis/ + brain/, git hooks, doctor, setup interview | 0 / 1 / 2 |
| `aegis doctor [--save]` | Detect platform/RAM/tools/env level, prune stale worktrees | 0 |
| `aegis status` | Current state, legal transitions, loop counters, lanes | 0 |
| `aegis next` | The ONE legal next skill | 0 / 3 |
| `aegis gate <name> --approve` | Record human gate approval (timestamped) | 0 / 7 |
| `aegis transition <skill> [--reason t]` | Validate + record transition; dual loop/cycle detection | 0 / 4 / 5 |
| `aegis contracts` | Verify contract PR merged — unlocks 04a (N1) | 0 / 4 |
| `aegis lane open\|close <slice>` | Parallel lane management, cap enforced (N5) | 0 / 4 |
| `aegis checkpoint [--quiet]` | Snapshot state + git SHA + file hashes | 0 |
| `aegis resume` | Hash-verified recovery, reconstruction pack | 0 / 2 / 6 |

| `aegis ast build` | ts-morph module graph (deterministic), circular-dep detection | 0 / 8 |
| `aegis ast diff` | Impact analysis vs stored graph (changed -> affects) | 0 / 2 |
| `aegis sync` | Regenerate AGENTS.md + CLAUDE.md from brain (Phase 2) | 0 |
| `aegis gc` | Checkpoint retention (20 sessions/30 days) + hygiene (Phase 2) | 0 |
| `aegis config [set k v]` | View/update setup interview answers (00b) | 0 / 4 |
| `aegis merge check <branch>` | Merge oracle: real merge + tsc + contract diff (N3) | 0 / 9 / 13 |
| `aegis slice create\|list\|remove` | Worktree-per-slice + lane caps (N2/N5) | 0 / 2 / 4 |
| `aegis validate <suite>` | contracts/tests/deps/perf/e2e, cited or UNMEASURED | 0 / 9 |
| `aegis monitor --once` | Post-ship health pass for cron/CI (external scheduler) | 0 / 10 |
| `aegis eval <file\|--all>` | Skill-file eval harness, type-aware (P10) | 0 / 11 |
| `aegis migrate` | Schema migration across CLI versions (P12) | 0 / 12 |

All Phase 0-12 commands implemented. CI templates in ci-templates/.
Platform matrix protocol in docs/PLATFORM-MATRIX.md (UNVERIFIED by default).

## Enforcement Rules Implemented (Amendment A1)

- A1.2 deterministic artifacts: nothing timestamped is ever hashed
- A1.3 dual loop detection: per-edge counters + state-visit cycle guard
- A1.4 `.aegis/` gitignored entirely at init — machine state never enters git
- A1.6 doctor prunes stale worktree registrations
- Git hooks resolve the CLI via PATH -> local build path -> npx fallback

## Exit Codes

0 ok · 1 not a git repo · 2 missing state / planned command · 3 blocked ·
4 illegal action · 5 loop/cycle escalation · 6 integrity mismatch ·
7 gate error · 12 schema mismatch (run `aegis migrate`)

## Skill Files (Phase 3)
`aegis init` installs the judgment layer into `.aegis/skills/`:
SKILL-00 FOUNDATION (00a installer, 00b context lock + interview, 00c resume,
00d brownfield) SKILL-01 DISCOVER (01a adversarial PRD, 01b scope,
01c design system, 01d interview protocol), SKILL-02 ARCHITECT (02a system,
02b database + N1 contracts-as-code, 02c security), SKILL-03 PLAN (03a slices
+ lane math, 03b standards), SKILL-04 BUILD (04a parallel build, 04b integration
orchestrator, 04c integration) + 25 team templates (10 base, 15 specializations),
SKILL-05 VALIDATE (05a traceability, 05b personas, 05c bug hunting, 05d e2e/perf,
05e exploratory), SKILL-06 ORCHESTRATE (06a conductor, 06b code review,
06c resilience, 06d perf budget, 06e error escalation + selective rollback),
SKILL-07 MAINTAIN (07a tech debt, 07b observability, 07c docs), SKILL-08 SHIP
(08a verdict, 08b monitor, 08c feedback + injection guard). Brain templates
(`brain/_templates/`) installed alongside. Agents read skills from
`.aegis/skills/`; in Manual mode the human pastes the relevant skill file.

## Dependencies
Runtime: ts-morph (AST engine). Requires tsconfig.json in target repo;
repos without one run in degraded no-AST mode (O4).

## Smoke Test Results (2026-07-21)

init, doctor, transitions, PRD/G1/G2/G3 gate refusals + approvals, N1 contract
gate, lane cap (3rd refused), checkpoint, corruption detection (exit 6),
clean resume (VERIFIED), 3 full ping-pong cycles then forced escalation
(exit 5), git hooks firing on real commits. All passing.

Phase 1+2 (2026-07-21): ast build deterministic (identical bytes across runs),
circular dependency detected with exact cycle path (exit 8), ast diff impact
analysis (changed auth service -> dashboard flagged as affected), resume
verified after deterministic rebuild + post-commit auto-checkpoint, sync
generated AGENTS.md/CLAUDE.md, gc retention report, pre-commit hook passes
clean code and blocks a real TS error with the compiler message. All passing.

Phase 3 (2026-07-21): init installs 5 SKILL-00 files + 5 brain templates,
`aegis config set` updates interview answers, `.aegis/` verified gitignored
via `git check-ignore`. All passing.

Phase 4 (2026-07-21): 10 skill files installed; PRD freeze enforced as SACRED
gate on the live flow (01a->01b refused until `gate PRD --approve`). All passing.

Phase 5 (2026-07-21): 17 skill files installed; full gate chain verified -
G1 blocks 02a->02b, G2 blocks 02c->03a, N1 blocks 03b->04a until contracts
verified. All passing.

Phase 6 (2026-07-21): 46 skill files installed (incl. 25 team templates);
slice worktrees outside repo with lane cap; merge oracle refuses contract
drift (exit 9), passes clean slices, NOTHING-TO-MERGE exit 13 never counts
as pass. BUG B7 found + fixed: git hooks fired in slice worktrees where
.aegis doesn't exist, blocking all slice commits - hooks now checkpoint the
main repo via git --git-common-dir. All passing.

Phase 7 (2026-07-21): validate suites live - contracts PASS with tool+command
citation; tests/deps/perf honestly report UNMEASURED when tooling/build
absent. Reports written to brain/quality/validation-<suite>.md (deterministic)
+ .aegis/validation/<suite>.json (timestamped machine record). All passing.

Phase 8 (2026-07-21): SKILL-06 complete - 58 skill files. Conductor is
CLI-state-driven with exit-5 human escalation; 06e selective rollback wired
to ast diff + merge oracle. No new CLI surface needed.

Phase 9 (2026-07-21): 66 skill files. `aegis monitor --once` live-tested:
UNMEASURED without targets, HEALTHY on live endpoint, BREACH with exit 10 on
dead endpoint, cited post-ship report. CI templates ship the external
scheduler. All passing.

Phases 10-12 (2026-07-21): eval harness live - type-aware (master/sub-skill/
template/spec/protocol), quote-stripping vague-marker check, CLI-ref
validation. First run caught 12 non-conformant files (fixed; 66/66 pass).
Sabotage detection verified. aegis migrate with schema_version. npm packaging
fields set. All passing.
