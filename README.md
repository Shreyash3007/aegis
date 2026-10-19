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
  checkpoints, merge validation. CLI operations refuse violations of their
  own invariants; this is not a sandbox around an agent with shell access.
- **Judgment lives in skills** — markdown procedures that tell the agent
  *how* to think at each stage (adversarial PRD review, contract-first
  design, bug hunting, ship verdicts). Recorded checks establish process
  outcomes, not that every procedure was followed or the work is adequate.

```
you / your agent  ──►  aegis CLI  ──►  .aegis/ (machine state, hash-verified)
                            │          brain/   (committed docs, the "why")
                            └────►  .aegis/skills/ (judgment procedures)
```

## What it actually does

- **A state machine for the work itself** — `00a init → 01a PRD → 02a
  architecture → 03a plan → 04a build → 05a validate → 07a ship`, stored as
  data (`transitions.json`). Illegal jumps are refused (exit 4). Loops and
  ping-pong cycles escalate to a human (exit 5) instead of burning tokens.
- **Sacred human gates** — PRD freeze, architecture, security, integration,
  ship. Human approvals use TTY confirmation or an owner-provisioned CI token.
  `autonomy: full` permits eligible non-ship gates only; G4 remains human and
  approves a specific source commit, not every future release.
- **A fast lane for small work** — `aegis fix start/done` and `aegis chore`:
  typo-to-one-file changes skip the full funnel on an audited side track, but
  `fix done` still requires the test suite to pass.
- **Contract-first parallel builds** — contracts merged to the base branch
  before production build (N1), one git worktree per slice (N2), and a compiler-backed
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
  Concurrency-safe: a lockfile guards every state write (historical
  measurement: 10/10 events under 10 parallel writers, 2026-07-21 v0.4.1
  battery — see docs/PLATFORM-MATRIX.md; v0.10 changed the lock semantics).
- **Brownfield-native** — auto-detects established repos, preserves your
  existing git hooks (chained, never clobbered), preserves hand-written
  `AGENTS.md`/`CLAUDE.md` (marker-block sync), and the 00d skill imports your
  existing docs into the brain with citations instead of re-deriving them.

## Evidence and its limits

- **Executable regressions and CI:** `npm test`, deterministic skill lint,
  the adversarial harness and the release ritual cover specific assertions.
  Version-bound observations live under `docs/evidence/`; a green run is not
  an exhaustive correctness or security proof.
- **Historical field feedback:** earlier production trials supplied useful
  bug reports and subjective ratings. They were not blinded comparisons and
  do not establish a quality/cost advantage or general small-model performance.
- **It dogfoods itself** — this repo runs Aegis on Aegis: hooks installed,
  brain docs drafted by its own 00d import bridge (`aegis import check` 4/4),
  and `aegis ast build` once caught a real circular dependency in our own
  code. Full end-to-end dogfood log: `docs/DOGFOOD-v0.2.md`.

Try it on your repo in 30 seconds, no setup commitment:

```bash
aegis init --yes && aegis ast build   # one trial found 2 real circular deps this way
```

## Install

Requires Node 20 or 22+ and git. GitHub-only distribution (never on npm registry).
Choose a published asset from GitHub Releases. The command below targets
v0.10.0, the current release.

```bash
npm install -g --ignore-scripts https://github.com/Shreyash3007/aegis/releases/download/v0.10.0/aegis-0.10.0.tgz
```

Use the built release asset, not GitHub's generated source archive. It
contains the compiled CLI, bundled runtime dependencies and consumer lock;
the release includes a SHA256 sidecar and isolated-install evidence. Source
development uses `npm ci --ignore-scripts && npm run build` and `npm link`.
Older updaters may use source archives; upgrade to this asset explicitly.

## Quickstart

```bash
cd your-project          # any git repo
aegis init               # interview (auto-detects brownfield; --yes for defaults)
aegis status             # where you are, what's legal next
aegis next               # the one recommended next step
```

After project initialization, point an agent with shell/file access at
`.aegis/skills/00-foundation/00f-aegis-guide.md` and ask it to walk you through
Aegis. The guide explains setup and owner decisions. Automatic host/plugin
registration is separate planned v0.11 adapter work, not an installed feature.

Small change? Fast lane:

```bash
aegis fix start "null guard in webhook handler"
# ...do the work...
aegis fix done           # closes only if your tests pass
```

Feature work? The pipeline:

```bash
# Follow `aegis next`, its skill, and human gates to reach the build phase.
aegis contracts                         # verify merged contracts (N1)
aegis slice create service              # registered worktree (N2)
# Commit RED, fix, GREEN, acceptance and review evidence in that worktree.
aegis clean aegis/slice-service --require-proof --require-quality
```

Then point your AI agent at `AGENTS.md` (the agent handbook Aegis maintains
in your repo) and the current skill file in `.aegis/skills/` — the CLI
enforces its CLI predicates whichever agent you use. The agent still owns
following procedures, and humans own consequential approvals.

## How the pieces fit

| Piece | What it is | Who owns it |
|---|---|---|
| `.aegis/` | Machine state: state.json, checkpoints, per-app states. Gitignored, hash-verified, **never hand-edited** | the CLI |
| `brain/` | Committed docs: architecture, quality log, context. The human-readable "why" | skills draft, humans confirm |
| `.aegis/skills/` | Judgment procedures, references, self-critique and exit conditions | the agent reads them |
| git hooks | pre-commit (checkpoint + typecheck), post-commit (checkpoint), pre-push (contract validation) — chained onto any hooks you already have | the CLI |
| `AGENTS.md` / `CLAUDE.md` | Your agent's entry point; Aegis owns only a marked block inside them | you + `aegis sync` |

## Command reference

For test-first slice work, see [TDD-EVIDENCE.md](docs/TDD-EVIDENCE.md):
`tdd red` captures a committed failing test, `tdd green` reruns the same
command after the fix, and `clean <branch> --require-proof` checks both
receipts and reruns the test on the merged tree. This verifies observed
process outcomes, not test adequacy; semantic review remains required.

| Command | Behavior | Exit codes |
|---|---|---|
| `aegis init [--yes] [--overwrite] [--apps a,b] [--profile min\|std\|full]` | Scaffold .aegis/ + brain/, git hooks (existing preserved + chained), doctor, interview (brownfield auto-detected); minimal profile = standalone tools only (no hooks/brain) | 0 / 1 / 2 |
| `aegis doctor [--save]` | Environment report, stale-worktree prune, state-vs-git drift notes | 0 |
| `aegis status [--app n] [--markdown]` / `next` | State, legal transitions, lanes / recommended next skill; --markdown writes a deterministic brain/handoff.md | 0 / 2 / 3 |
| `aegis transition <s> [--reason t] [--app n]` | Record a validated move (illegal refused; loops escalate) | 0 / 2 / 4 / 5 |
| `aegis gate <name> --approve [--evidence r] [--app n]` | Attributed approval; DEMO pins its artifact, G4 pins source and cannot self-approve via autonomy=full | 0 / 2 / 7 |
| `aegis contracts [--app n]` | Verify contracts merged to base branch (N1) | 0 / 4 |
| `aegis fix start\|done\|abandon` / `chore` | Fast lane for small changes; `done` requires tests | 0 / 2 / 4 / 9 |
| `aegis slice create\|list\|remove` | Worktree-per-slice + lane caps (N2/N5) | 0 / 2 / 4 |
| `aegis merge check <branch>` | Merge oracle: real merge + tsc + contract drift (N3) | 0 / 2 / 9 / 13 |
| `aegis validate <suite>` | contracts / tests / deps / perf / e2e + custom suites; `acceptance <branch> --file <plan>` uses canonical quality receipts | 0 / 2 / 9 |
| `aegis typecheck` | Multi-stack typecheck oracle: tsc / cargo check / go vet / py_compile, or honest UNMEASURED | 0 / 9 |
| `aegis checkpoint` / `resume` | Snapshot / hash-verified recovery | 0 / 2 / 6 |
| `aegis ast build` / `diff` | Deterministic module graph, circular deps / impact analysis | 0 / 8 / 2 |
| `aegis import check` | Verify brownfield brain docs exist, substantive, cited | 0 / 2 / 4 |
| `aegis exec -- <cmd>` | Recorded + checkpointed command run (executor waves) | passthrough |
| `aegis wave` | Emit the executor prompt block (brain/wave-prompt.md) — paste into every wave prompt | 0 |
| `aegis sync` / `gc` | Sync AGENTS.md/CLAUDE.md AEGIS block + transitions invariant forward / checkpoint retention | 0 |
| `aegis lint-skills [--all\|<file>]` | Margin Format gate: frontmatter, budgets, body order, CLI refs, links, trigger collisions | 0 / 2 / 11 |
| `aegis clean <branch>` | Loop-until-clean: oracle verify + classify, 3 cycles to escalation, unchanged-SHA re-run is doubt theater | 0 / 2 / 9 / 5 |
| `aegis quarantine freeze\|clear\|list` | Park failing lanes with audited reason; oracle refuses frozen paths | 0 / 2 / 4 / 9 |
| `aegis memory <add\|list\|get\|verify\|retire\|reconcile\|promote\|sync>` | Typed records with confidence/cites/expiry; contradictions open reconcile tasks; truth committed at brain/memory/ | 0 / 2 / 4 |
| `aegis jev <judge\|triage\|score\|classify\|cite> --file` | Judgment ring over direct TypeSafe HTTPS; degraded without key (says so verbatim) | 0 / 2 |
| `aegis demo <record\|status>` | Pin the prototype-track artifact; DEMO approval unlocks production lanes | 0 / 2 |
| `aegis eval trigger [--file cases] [--threshold f]` | Trigger-precision eval (built-in self-test; below threshold = rewrite list) | 0 / 2 / 11 |
| `aegis lane open\|close <s>` / `loops reset --reason` | Lane management / audited loop-counter reset | 0 / 2 / 4 |
| `aegis config [set k v]` | Interview answers, `contracts_path[.<app>]`, `validate_suite.<name>`, `apps` | 0 / 2 / 4 |
| `aegis monitor --once` | Post-ship health pass for cron/CI | 0 / 10 |
| `aegis eval <file\|--all>` | Skill-file eval harness; opt-in model judge | 0 / 2 / 11 |
| `aegis update [--check]` / `--version` | Self-update from latest tag / print version | 0 / 2 |
| `aegis hooks [--profile min\|std\|strict]` | Hook strictness: minimal (record-only) / standard / strict (+ tests on pre-push) | 0 / 2 / 4 |
| `aegis host <list\|inspect\|install\|uninstall\|verify <id>>` | Host capability declarations + adapters (v0.11: claude-code / opencode / cursor shipped; install/uninstall/verify write only the managed block) | 0 / 2 / 4 / 9 |
| `aegis migrate` | Schema migration across CLI versions | 0 / 2 / 12 |

Exit codes: `0 ok · 1 not a git repo · 2 malformed call or missing state ·
3 blocked · 4 well-formed but refused · 5 loop escalation · 6 integrity ·
7 gate · 8 ast cycles · 9 merge/validate refused · 10 monitor breach ·
11 eval fail · 12 schema · 13 nothing to merge`

Pipeline states saturate: after ~3 full release walks the visit counters
park further entries (exit 5) by design. `aegis doctor` warns at 2/3 - plan
an audited `aegis loops reset --reason "<reviewed>"` at the next cycle
start, never mid-walk.

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
- The judgment ring sends state off-machine: `aegis jev` POSTs your request
  file to api.typesafe.ai (redacted for common credential shapes, but
  redaction is a backstop — never judge secrets). `JEV_BACKEND=mock` sends
  nothing anywhere.
- Only Kimi Code (Linux) is verified end-to-end so far; other platforms work
  through the same CLI but are UNVERIFIED until evidenced (matrix above).
- External executors (opencode/GLM) comply via prompts + `aegis exec`;
  enforcement there is visibility (drift detection, recorded runs), not a
  wall.
- The v1 task bank is development calibration, not an independent held-out
  benchmark. A genuine small-executor delivery trial is planned for v0.11;
  the scripted smoke and mock judgments do not substitute for it.
- The TypeScript graph covers static import/re-export dependencies, not a
  complete polyglot or dynamic-import graph. Missing toolchains remain visible.

## Development

```bash
npm ci --ignore-scripts && npm run build  # locked source build; dist/ is not committed
npm test                                 # executable regressions; no live provider required
node dist/cli.js lint-skills --all         # complete deterministic corpus check
```

This repo runs Aegis on itself — hooks, brain docs, import check included.
Contributions welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) (trials first,
code second) and [SECURITY.md](SECURITY.md) for responsible disclosure.

## Release history

v0.10.0 Grade: recorded test/acceptance/review evidence, owned state and memory
transactions, source-bound release checks, pinned optional craft and verified
bundled distribution. See the release assets and [roadmap](docs/ROADMAP.md)
for measured evidence, limitations and the queued v0.11 plan. ·
v0.9.0 integrity release: audit-finding closures with regression tests,
evidence-bound approvals, committed memory truth, release ritual
(see [CHANGELOG.md](CHANGELOG.md)) ·
v0.8.0 audit release: exit-code discipline (malformed 2, refused 4) across
~40 sites + 148-check adversarial harness (see [CHANGELOG.md](CHANGELOG.md)) ·
v0.7.0 self-cycle: conductor visibility in status, cite-or-stamp enforcement,
worktree guidance, N1 self-contracts (see [CHANGELOG.md](CHANGELOG.md)) ·
v0.6.0 god-skill framework: Margin Format gate, CONSTRAINTS, loop-until-clean
+ quarantine, record memory, TypeSafe judgment ring, demo-approval gate,
trigger-precision eval (see [CHANGELOG.md](CHANGELOG.md)) ·
v0.5.2 aegis-guide skill (00f): "walk me through Aegis" conversational
onboarding · v0.5.1 AFK autonomy + ghost-binary tripwire + wave prompt
block ·
v0.5.0 multi-language oracles + install/hook profiles + ask-aegis skill
(built by opencode/GLM-5.2 via `aegis exec` waves, maintainer-audited) ·
v0.4.2 doc-contract gates + per-app paths · v0.4.1 concurrency correctness
(state lock) · v0.4.0 monorepo + exec + self-hosting · v0.3.0 fast lane +
import bridge + custom validators + drift detection · v0.2.1 brownfield
adoption · v0.2.0 trust hardening. Full notes per release:
[GitHub Releases](https://github.com/Shreyash3007/aegis/releases).

## License

MIT
