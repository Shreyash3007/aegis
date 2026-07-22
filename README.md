# AEGIS

[![ci](https://github.com/Shreyash3007/aegis/actions/workflows/ci.yml/badge.svg)](https://github.com/Shreyash3007/aegis/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/Shreyash3007/aegis)](https://github.com/Shreyash3007/aegis/releases)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**The enforcement layer for AI-native software development.**

Your AI coding agent is confident, fast, and sometimes lying to you — not
maliciously, but structurally: it will report success it hasn't verified,
skip steps it found inconvenient, and lose track of where the work actually
stands across a long session. Prompts can't fix that, because prompts are
exactly what the agent is free to ignore.

Aegis separates the two things an AI workflow needs:

- **Enforcement lives in code** — a small runtime CLI (`dist/cli.js`) that
  owns deterministic truth: pipeline state, human gates, transitions,
  checkpoints, merge validation. The agent *cannot* bypass it, because it
  isn't prose.
- **Judgment lives in skills** — 66 markdown skill files that tell the agent
  *how* to think at each stage (adversarial PRD review, contract-first
  design, bug hunting, ship verdicts). The agent reads them; the CLI verifies
  it acted.

```
you / your agent  ──►  aegis CLI  ──►  .aegis/ (machine state, hash-verified)
                            │          brain/   (committed docs, the "why")
                            └────►  .aegis/skills/ (66 judgment files)
```

## What it actually does

- **A state machine for the work itself** — `00a init → 01a PRD → 02a
  architecture → 03a plan → 04a build → 05a validate → 07a ship`, stored as
  data (`transitions.json`). Illegal jumps are refused (exit 4). Loops and
  ping-pong cycles escalate to a human (exit 5) instead of burning tokens.
- **Sacred human gates** — PRD freeze, architecture, security, integration,
  ship. Approvals require a human (TTY retype-to-confirm, a CI token, or an
  explicit `autonomy: full` posture) and are recorded with who/what approved.
- **A fast lane for small work** — `aegis fix start/done` and `aegis chore`:
  typo-to-one-file changes skip the full funnel on an audited side track, but
  `fix done` still requires the test suite to pass.
- **Contract-first parallel builds** — contracts merged to the base branch
  before slices (N1), one git worktree per slice (N2), and a compiler-backed
  merge oracle (N3) that runs the real merge + `tsc` + contract-drift diff
  before anything lands. Works with TS contracts *and* markdown contracts
  (doc contracts gate on substance + code citations).
- **Hash-verified recovery** — checkpoints hash `brain/`, state files, and
  per-app states. Hand-edit `state.json` to skip the funnel and
  `aegis resume` refuses (exit 6). Crash mid-session? Resume prints a
  reconstruction pack.
- **Honest validation** — `aegis validate contracts|tests|deps|perf|e2e`
  cites the tool + command for every claim, or says UNMEASURED. Register your
  own smoke scripts as first-class suites
  (`config set validate_suite.smoke "node scripts/verify.mjs"`).
- **Monorepo scoping** — `aegis init --apps web,api`: independent per-app
  pipelines, gates, and fast lanes under one shared brain and lane cap.
- **Executor-wave recording** — `aegis exec -- <cmd>` wraps any command
  (opencode/GLM/fork-agent waves) so the run is recorded and checkpointed.
  Concurrency-safe: a lockfile guards every state write (measured 10/10
  events under 10 parallel writers).
- **Brownfield-native** — auto-detects established repos, preserves your
  existing git hooks (chained, never clobbered), preserves hand-written
  `AGENTS.md`/`CLAUDE.md` (marker-block sync), and the 00d skill imports your
  existing docs into the brain with citations instead of re-deriving them.

## Proven, not just tested

- **72 integration tests** replaying every enforcement scenario (node:test,
  zero extra deps, ~15s), CI on node 20/22.
- **Two independent production trials** drove four releases: a 4-app monorepo
  team (rating went 8.5 → 9 → 9.5/10, "the must-fix list is now empty") and
  a brownfield wave-dispatch project (4 → 6.5 → 8 → 7.5 → 8.5/10 as real bugs
  were found and fixed). Every gap they named either shipped with a
  regression test or is documented as a deliberate boundary.
- **It dogfoods itself** — this repo runs Aegis on Aegis: hooks installed,
  brain docs drafted by its own 00d import bridge (`aegis import check` 4/4),
  and `aegis ast build` once caught a real circular dependency in our own
  code. Full end-to-end dogfood log: `docs/DOGFOOD-v0.2.md`.

Try it on your repo in 30 seconds, no setup commitment:

```bash
aegis init --yes && aegis ast build   # one trial found 2 real circular deps this way
```

## Install

Requires Node 18+ and git. GitHub-only distribution (never on npm registry).

```bash
npm install -g https://github.com/Shreyash3007/aegis/archive/refs/tags/v0.4.2.tar.gz
# already have v0.3.0+? just: aegis update
```

`npm 11` note: `npm install -g github:Shreyash3007/aegis` hits an npm client
bug (global git installs symlink to a deleted cache dir) — use the tarball
URL above or add `--install-links`. From source:
`git clone … && npm install && npm run build && npm link`.

## Quickstart

```bash
cd your-project          # any git repo
aegis init               # interview (auto-detects brownfield; --yes for defaults)
aegis status             # where you are, what's legal next
aegis next               # the one recommended next step
```

Small change? Fast lane:

```bash
aegis fix start "null guard in webhook handler"
# ...do the work...
aegis fix done           # closes only if your tests pass
```

Feature work? The pipeline:

```bash
aegis transition 01a     # PRD (skill file in .aegis/skills/ guides the agent)
aegis gate PRD --approve # human freezes scope
aegis contracts          # verify contracts merged (N1)
aegis slice create auth  # worktree per slice (N2)
aegis merge check auth   # merge oracle before it lands (N3)
```

Then point your AI agent at `AGENTS.md` (the agent handbook Aegis maintains
in your repo) and the current skill file in `.aegis/skills/` — the CLI
enforces the rules mechanically whichever agent you use.

## How the pieces fit

| Piece | What it is | Who owns it |
|---|---|---|
| `.aegis/` | Machine state: state.json, checkpoints, per-app states. Gitignored, hash-verified, **never hand-edited** | the CLI |
| `brain/` | Committed docs: architecture, quality log, context. The human-readable "why" | skills draft, humans confirm |
| `.aegis/skills/` | 66 skill files: the judgment layer (persona, steps, self-critique, exit conditions per state) | the agent reads them |
| git hooks | pre-commit (checkpoint + typecheck), post-commit (checkpoint), pre-push (contract validation) — chained onto any hooks you already have | the CLI |
| `AGENTS.md` / `CLAUDE.md` | Your agent's entry point; Aegis owns only a marked block inside them | you + `aegis sync` |

## Command reference

| Command | Behavior | Exit codes |
|---|---|---|
| `aegis init [--yes] [--overwrite] [--apps a,b]` | Scaffold .aegis/ + brain/, git hooks (existing preserved + chained), doctor, interview (brownfield auto-detected) | 0 / 1 / 2 |
| `aegis doctor [--save]` | Environment report, stale-worktree prune, state-vs-git drift notes | 0 |
| `aegis status [--app n]` / `next` | State, legal transitions, lanes / recommended next skill | 0 / 3 |
| `aegis transition <s> [--reason t] [--app n]` | Record a validated move (illegal refused; loops escalate) | 0 / 4 / 5 |
| `aegis gate <name> --approve [--app n]` | Human gate approval (TTY confirm / CI token / autonomy=full) | 0 / 7 |
| `aegis contracts [--app n]` | Verify contracts merged to base branch (N1) | 0 / 4 |
| `aegis fix start\|done\|abandon` / `chore` | Fast lane for small changes; `done` requires tests | 0 / 4 / 9 |
| `aegis slice create\|list\|remove` | Worktree-per-slice + lane caps (N2/N5) | 0 / 2 / 4 |
| `aegis merge check <branch>` | Merge oracle: real merge + tsc + contract drift (N3) | 0 / 9 / 13 |
| `aegis validate <suite>` | contracts (tsc or contracts_doc) / tests / deps / perf / e2e + your custom suites | 0 / 9 |
| `aegis checkpoint` / `resume` | Snapshot / hash-verified recovery | 0 / 2 / 6 |
| `aegis ast build` / `diff` | Deterministic module graph, circular deps / impact analysis | 0 / 8 / 2 |
| `aegis import check` | Verify brownfield brain docs exist, substantive, cited | 0 / 2 / 4 |
| `aegis exec -- <cmd>` | Recorded + checkpointed command run (executor waves) | passthrough |
| `aegis sync` / `gc` | Sync AGENTS.md/CLAUDE.md AEGIS block / checkpoint retention | 0 |
| `aegis lane open\|close <s>` / `loops reset --reason` | Lane management / audited loop-counter reset | 0 / 4 |
| `aegis config [set k v]` | Interview answers, `contracts_path[.<app>]`, `validate_suite.<name>`, `apps` | 0 / 4 |
| `aegis monitor --once` | Post-ship health pass for cron/CI | 0 / 10 |
| `aegis eval <file\|--all>` | Skill-file eval harness; opt-in model judge | 0 / 11 |
| `aegis update [--check]` / `--version` | Self-update from latest tag / print version | 0 / 2 |
| `aegis migrate` | Schema migration across CLI versions | 0 / 12 |

Exit codes: `0 ok · 1 not a git repo · 2 missing/corrupt state · 3 blocked ·
4 illegal · 5 loop escalation · 6 integrity · 7 gate · 8 ast cycles ·
9 merge/validate refused · 10 monitor breach · 11 eval fail · 12 schema ·
13 nothing to merge`

## Docs

- **`SETUP.md`** — full setup guide: AFK sessions, CI tokens, custom
  validators, doc contracts, monorepo, concurrency rules
- **`AGENTS.md`** — the agent handbook (also the template your repo gets)
- **`docs/PLATFORM-MATRIX.md`** — what's verified where, with dated evidence
  (Kimi Code on Linux ✅; everything else UNVERIFIED until proven)
- **`docs/MONOREPO-DESIGN.md`** — per-app state design record
- **`docs/DOGFOOD-v0.2.md`** — full end-to-end self-hosting log
- **`ci-templates/`** — ready CI pipelines wiring gates + validators

## Honest limitations

- Gate proof-of-human is an attributed audit trail, not cryptography — a
  determined agent with shell access can set env vars. It catches drift and
  confabulation, not adversaries.
- Only Kimi Code (Linux) is verified end-to-end so far; other platforms work
  through the same CLI but are UNVERIFIED until evidenced (matrix above).
- External executors (opencode/GLM) comply via prompts + `aegis exec`;
  enforcement there is visibility (drift detection, recorded runs), not a
  wall.
- Single maintainer, young project. The mitigation is the trial culture:
  every release has survived independent adversarial re-testing within hours.

## Development

```bash
npm install && npm run build   # strict tsc, dist/ is committed
npm test                       # 72 integration tests (~15s, no extra deps)
aegis eval --all               # 66/66 skill files conform
```

This repo runs Aegis on itself — hooks, brain docs, import check included.

## Release history

v0.4.2 doc-contract gates + per-app paths · v0.4.1 concurrency correctness
(state lock) · v0.4.0 monorepo + exec + self-hosting · v0.3.0 fast lane +
import bridge + custom validators + drift detection · v0.2.1 brownfield
adoption · v0.2.0 trust hardening. Full notes per release:
[GitHub Releases](https://github.com/Shreyash3007/aegis/releases).

## License

MIT
