# AEGIS

**The enforcement layer for AI-native software development.**
A thin runtime CLI that owns deterministic truth — state, gates, transitions,
checkpoints, merge validation — plus 66 skill files that own judgment.
If a rule must be enforced, it lives in code. Nothing is enforced by prose.

- State machine as data (`transitions.json`) — illegal transitions refused
- Sacred human gates (PRD, architecture, security, integration, ship) with
  TTY proof-of-human — agents cannot self-approve
- Contract-first parallel builds with a compiler-backed merge oracle
- Hash-verified crash recovery covering `state.json` itself, deterministic
  artifacts, cycle detection
- Honest validation: every metric cited or labeled UNMEASURED
- Battle-tested: 63 integration tests replaying every enforcement scenario,
  CI on node 20/22, full end-to-end dogfood (`docs/DOGFOOD-v0.2.md`)

## Install

```bash
npm install -g https://github.com/Shreyash3007/aegis/archive/refs/tags/v0.4.0.tar.gz
# (dist/ is committed, so no build step is needed on install)
# npm 11 note: `npm install -g github:Shreyash3007/aegis` hits an npm client bug
# (global git installs symlink to a deleted cache dir) — add --install-links
# or use the tarball URL above.
```

or from source:

```bash
git clone https://github.com/Shreyash3007/aegis.git && cd aegis
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
| `aegis init [--yes] [--overwrite] [--apps a,b]` | Scaffold .aegis/ + brain/, git hooks (existing hooks preserved + chained), doctor, setup interview (brownfield auto-detected); `--apps` declares per-app states (monorepo) | 0 / 1 / 2 |
| `aegis doctor [--save]` | Detect platform/RAM/tools/env level, prune stale worktrees | 0 |
| `aegis status [--app <name>]` | Current state, legal transitions, loop counters, lanes; multi-app: summary without, detail with | 0 |
| `aegis next` | Recommended next skill + all other legal edges | 0 / 3 |
| `aegis gate <name> --approve` | Human gate approval: TTY retype-to-confirm; CI needs `AEGIS_HUMAN_TOKEN=1`; `autonomy=full` approves non-TTY (recorded as `autonomy-full`) | 0 / 7 |
| `aegis transition <skill> [--reason t]` | Validate + record transition; dual loop/cycle detection | 0 / 4 / 5 |
| `aegis loops reset --reason <t>` | Zero loop/cycle counters after human review (audited) | 0 / 4 |
| `aegis contracts` | Verify contract PR merged — unlocks 04a (N1) | 0 / 4 |
| `aegis lane open\|close <slice>` | Parallel lane management, cap enforced (N5) | 0 / 4 |
| `aegis checkpoint [--quiet]` | Snapshot state + git SHA + file hashes | 0 |
| `aegis resume` | Hash-verified recovery, reconstruction pack | 0 / 2 / 6 |

| `aegis ast build` | ts-morph module graph (deterministic), circular-dep detection | 0 / 8 |
| `aegis ast diff` | Impact analysis vs stored graph (changed -> affects) | 0 / 2 |
| `aegis sync` | Regenerate the AEGIS block in AGENTS.md + CLAUDE.md from brain; hand-written content outside the markers is preserved (Phase 2) | 0 |
| `aegis gc` | Checkpoint retention (20 sessions/30 days) + hygiene (Phase 2) | 0 |
| `aegis config [set k v]` | View/update setup interview answers (00b) | 0 / 4 |
| `aegis merge check <branch>` | Merge oracle: real merge + tsc + contract diff (N3) | 0 / 9 / 13 |
| `aegis slice create\|list\|remove` | Worktree-per-slice + lane caps (N2/N5) | 0 / 2 / 4 |
| `aegis validate <suite>` | contracts/tests/deps/perf/e2e + owner-declared custom suites, cited or UNMEASURED | 0 / 9 |
| `aegis fix start\|done\|abandon` | Fast lane for small fixes; `done` requires tests PASS/UNMEASURED | 0 / 4 / 9 |
| `aegis chore <desc>` | Record a docs/config-class change (no lifecycle) | 0 / 2 |
| `aegis import check` | Verify 00d brownfield brain docs exist, substantive + cited | 0 / 2 / 4 |
| `aegis update [--check]` | Self-update from latest GitHub tag tarball | 0 / 2 |
| `aegis exec -- <cmd>` | Run a command recorded in history + checkpointed (executor waves); exit code passes through | any |
| `aegis monitor --once` | Post-ship health pass for cron/CI (external scheduler) | 0 / 10 |
| `aegis eval <file\|--all>` | Skill-file eval harness; opt-in model judge via `AEGIS_JUDGE_API_KEY` | 0 / 11 |
| `aegis migrate` | Schema migration across CLI versions (P12) | 0 / 12 |

All Phase 0-12 commands implemented. CI templates in ci-templates/.
Platform matrix in docs/PLATFORM-MATRIX.md — Kimi Code (Linux) VERIFIED
2026-07-21, all other platforms UNVERIFIED until evidenced.

## Development

```bash
npm install && npm run build   # strict tsc
npm test                       # 63 integration tests replaying the
                               # enforcement contract (~6s, zero extra deps)
```

CI (`.github/workflows/ci.yml`) runs build + tests + smoke on node 20/22.

## Enforcement Rules Implemented (Amendment A1)

- A1.2 deterministic artifacts: nothing timestamped is ever hashed
- A1.3 dual loop detection: per-edge counters + state-visit cycle guard
- A1.4 `.aegis/` gitignored entirely at init — machine state never enters git
- A1.6 doctor prunes stale worktree registrations
- Git hooks resolve the CLI via PATH -> local build path -> npx fallback

## Exit Codes

0 ok · 1 not a git repo · 2 missing/corrupt state · 3 blocked ·
4 illegal action · 5 loop/cycle escalation · 6 integrity mismatch ·
7 gate error · 8 AST circular deps · 9 merge/validate refused ·
10 monitor breach · 11 eval failure · 12 schema mismatch (run `aegis migrate`) ·
13 nothing to merge

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

v0.2.0 hardening + proof (2026-07-21): full senior review followed by a
4-phase overhaul. Shell injection eliminated (execFileSync argv, injection
attempts verified inert); checkpoints now hash state.json + transitions.json
(hand-edit of current_skill detected, exit 6); merge-oracle tsc fixed for
projects with dependencies (node_modules symlinked into the merge worktree);
gates validate names and require TTY retype-to-confirm (AEGIS_HUMAN_TOKEN
for CI); 7 rollback edges added (early-phase + 04a contract-gap); 06d/06e
reachable; `loops reset --reason`; contracts verifies base-branch merge;
25 team templates deepened; opt-in eval model judge; perf budgets enforced
from .aegis/perf-budgets.json; doctor tool detection fixed; greenfield
first-commit trap fixed. 31/31 integration tests, CI on node 20/22. Full
end-to-end dogfood (00a->08b, 2 slices, all gates): docs/DOGFOOD-v0.2.md.
Platform matrix: Kimi Code (Linux) VERIFIED.

v0.2.1 brownfield adoption (2026-07-21): fixes from an independent hands-on
trial against an established production repo. `init` no longer clobbers
pre-existing git hooks - foreign hooks are moved to `<name>.aegis-orig` and
chained (blocking hooks propagate failure; re-init idempotent); the broken
`npx --yes aegis` fallback (aegis is not on the npm registry) replaced with
a loud reinstall hint. `sync` no longer truncates hand-written
AGENTS.md/CLAUDE.md - generated content lives between AEGIS:BEGIN/END
markers, everything outside preserved byte-for-byte, no .bak shuffle.
`init --yes` now detects brownfield from evidence (>5 commits or >=10
tracked source files) instead of defaulting greenfield; the interactive
interview default tracks the detection. `autonomy` is no longer a
collected-but-unread config key: `autonomy=full` approves gates non-TTY,
recorded as `by: autonomy-full` (trust-then-verify posture; still not
cryptographic proof). 41/41 integration tests.

v0.3.0 fit-your-shape (2026-07-21): fixes from BOTH independent production
trials (BlindFolio 4-app monorepo, metis-nda brownfield wave workflow).
Fast lane: `aegis fix start/done/abandon` + `aegis chore` - small changes no
longer pay the full PRD->gates->contracts toll; the track never touches
pipeline state, `fix done` still requires the tests suite to pass (or
honestly record UNMEASURED), and every entry is audited in history.
Brownfield import bridge: 00d now harvests existing docs
(CLAUDE.md/DECISIONS.md/docs/*) with source citations BEFORE inferring from
code, and `aegis import check` verifies the result (present, substantive,
cited; exit 4 until true). Pluggable validators: `aegis config set
validate_suite.<name> "<cmd>"` registers owner-declared smoke scripts as
first-class suites (`aegis validate <name>`, exit code = verdict, command
recorded as citation). Drift detection: `aegis doctor` now reconciles state
vs git reality (recorded lanes with no worktree, commits whose checkpoint
never fired) - reported honestly, never auto-corrected (A1.1).
`aegis update [--check]`: self-update from the latest GitHub tag tarball
(registry-free distribution loop closed). `validate tests` no longer crashes
on repos without package.json (honest UNMEASURED). Docs: monorepo scoping
design proposal (docs/MONOREPO-DESIGN.md, v0.4 - deliberately NOT shipped
undogfooded), shared-tree fork-agent experiment plan + orchestration-pattern
matrix (docs/PLATFORM-MATRIX.md), AFK loop-escalation guidance (SETUP.md).
52/52 integration tests, eval 66/66.

v0.4.0 structural (2026-07-21): every remaining gap from both trials.
Monorepo scoping SHIPPED (BlindFolio's last big one): `init --apps a,b` /
`config set apps a,b` -> per-app pipeline states at .aegis/apps/<name>/;
all state-mutating commands take --app (exit 2 without it, never guessed);
gates + fast lane per-app, lanes global; checkpoints record + hash every
app state (tamper -> exit 6); `status` summarizes all apps, `status --app`
details; single-app repos unchanged. contracts_path config: N1 contract
location no longer hardcoded to src/contracts (validate + merge oracle +
contracts all honor it). `aegis exec -- <cmd>`: executor-wave wrapper -
runs the command, records it + exit code in history, checkpoints before/
after (records reality; never fabricates transitions, A1.1). fix done now
warns when closing on a non-base branch (fast lane gates tests, not
merges). State writes atomic (tmp+rename) - concurrent fork-agent waves can
never tear state.json; concurrency experiment run + documented (integrity
safe; state mutations must be serialized by the wave prompt, 3/5 trials
lost an event before serialization - docs/PLATFORM-MATRIX.md). Own DAG
rule repaired: commands.ts<->eval.ts cycle broken by injection (found by
dogfooding `aegis ast build` on this repo). Self-hosting: aegis-cli now
runs Aegis on itself - brain docs drafted via the 00d import bridge,
import check 4/4. 63/63 integration tests, eval 66/66.
