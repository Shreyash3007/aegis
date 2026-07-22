# Aegis Setup Guide

## Install (pick one)

```bash
# From GitHub (recommended once the repo is published):
npm install -g https://github.com/Shreyash3007/aegis/archive/refs/tags/v0.4.0.tar.gz

# Already installed? `aegis update` self-updates to the latest tag (same tarball path).

# npm install -g github:Shreyash3007/aegis also works on npm <= 10; on npm 11 it hits
# a client bug (global git installs symlink to a deleted cache dir) — if you
# use it, add --install-links.

# From a local copy / tarball:
tar -xzf aegis-cli.tar.gz && cd aegis-cli
npm install && npm run build && npm link
```

Requirements: Node 18+, git. TypeScript in the target project for full
enforcement (without it Aegis degrades honestly and tells you).

## Set up any project

```bash
cd your-project          # must be a git repo
aegis init               # interactive interview
# or: aegis init --yes   # defaults; adjust later with `aegis config set`
```

`init` creates: `.aegis/` (machine state, auto-gitignored), `brain/`
(committed docs), git hooks, `.aegis/skills/` (66 skill files),
`brain/_templates/`, and runs the setup interview.

## Daily use

```bash
aegis status        # where am I, what's legal, what's blocked
aegis next          # recommended next skill (+ all other legal edges)
aegis transition <skill>          # move (CLI refuses illegal jumps)
aegis gate <name> --approve       # human approves sacred gates (TTY confirm)
aegis contracts                   # verify contract PR merged to base branch
aegis slice create <name>         # worktree-per-slice
aegis merge check <branch>        # merge oracle before any merge
aegis validate <suite>            # contracts|tests|deps|perf|e2e
aegis checkpoint / resume         # snapshots + verified recovery
aegis loops reset --reason "..."  # zero loop counters after human review
```

Small changes don't pay the full pipeline toll (v0.3 fast lane):

```bash
aegis fix start "typo in footer"  # work... then:
aegis fix done                    # closes only if the tests suite passes
aegis fix abandon --reason "..."  # audited exit
aegis chore "reword README"       # docs/config-class: one command, recorded
```

The fast lane never touches pipeline state and keeps one gate: `fix done`
requires the tests suite to pass (or honestly record UNMEASURED). Use it for
genuinely small changes — the log is the audit trail, and a "fix" that is
really a feature stays visible.

Brownfield extras:

```bash
aegis import check                # verify 00d brain docs exist, substantive + cited
aegis config set validate_suite.smoke "node scripts/verify-sync.mjs"
aegis validate smoke              # owner-declared suites, exit code = verdict
aegis doctor                      # also reports state-vs-git drift (lanes, stale checkpoints)
```

Monorepo (v0.4): declare apps once, then scope every pipeline action:

```bash
aegis init --yes --apps web,api   # or later: aegis config set apps web,api
aegis status                      # repo summary: one line per app + global lanes
aegis status --app web            # full detail for one app
aegis transition 01a --app api    # mutations REQUIRE --app (exit 2 without)
aegis gate G4 --approve --app web # gates are per-app
```

`contracts_path` for repos whose contracts don't live in `src/contracts`:

```bash
aegis config set contracts_path pw-ai/plan/contracts   # validate/merge/contracts all honor it
```

Executor waves (opencode/GLM/fork agents): wrap runs so they're recorded:

```bash
aegis exec -- node scripts/verify-sync-wave.mjs   # recorded + checkpointed, exit code passes through
```

Concurrent agents on one shared tree: checkpoints are freely parallel-safe,
but STATE MUTATIONS (transition/gate/fix/chore) must be serialized — one
agent owns transitions, workers report. Measured 2026-07-21: integrity holds
either way (atomic writes); unserialized mutations lose audit events
(docs/PLATFORM-MATRIX.md).

Gate approvals require an interactive terminal (retype the gate name to
confirm). In CI/non-interactive runs, set `AEGIS_HUMAN_TOKEN=1` — approvals
are then recorded as `by: human-token`. Keep that variable out of
agent-reachable environments; it is the proof-of-human escape hatch. If you
deliberately run a trust-then-verify workflow (agent implements fully,
human reviews the verified result), `aegis config set autonomy full` lets
gates approve non-TTY, recorded as `by: autonomy-full` — the audit trail
remains, the TTY ritual does not.

Planning AFK/autonomous sessions: gate approval is solved by `autonomy full`,
but **loop/cycle escalation (exit 5) still stops for a human — by design.**
An agent ping-ponging between states is exactly the failure you want a human
paged for. Plan AFK sessions around it: size tasks so a stuck run can wait
for you without blocking a release, and treat a waiting exit-5 run as the
tripwire working, not the tool failing.

Optional extras:

```bash
aegis config set token_budget 200000   # advisory budget shown in `aegis status`
AEGIS_JUDGE_API_KEY=... aegis eval --all   # opt-in model judge (strict on fail)
# AEGIS_JUDGE_URL / AEGIS_JUDGE_MODEL select any OpenAI-compatible endpoint
```

## Hacking on Aegis itself

```bash
npm install && npm run build   # strict tsc, dist/ is committed
npm test                       # 63 integration tests (~15s, no extra deps)
```

CI (`.github/workflows/ci.yml`) runs build + tests + smoke on node 20/22.

## With AI agents

- Runtime mode (Kimi Code / Claude Code / Cursor): tell the agent to read
  `AGENTS.md` (the handbook) and the skill file for the current state from
  `.aegis/skills/`. The CLI enforces the rules mechanically.
- Manual mode (chat UI): the human runs commands, pastes output. Skill files
  say exactly when this is needed.

## The 5 rules the CLI enforces

1. Sacred gates (PRD, G1-G4) — no approval, no transition.
2. No contract PR, no build (N1).
3. Contracts immutable after merge — oracle refuses violators.
4. Lane caps — extra slices queue.
5. Loops/cycles — forced human escalation.
