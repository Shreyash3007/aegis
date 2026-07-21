# Aegis Setup Guide

## Install (pick one)

```bash
# From GitHub (recommended once the repo is published):
npm install -g https://github.com/Shreyash3007/aegis/archive/refs/tags/v0.2.0.tar.gz

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

Gate approvals require an interactive terminal (retype the gate name to
confirm). In CI/non-interactive runs, set `AEGIS_HUMAN_TOKEN=1` — approvals
are then recorded as `by: human-token`. Keep that variable out of
agent-reachable environments; it is the proof-of-human escape hatch.

Optional extras:

```bash
aegis config set token_budget 200000   # advisory budget shown in `aegis status`
AEGIS_JUDGE_API_KEY=... aegis eval --all   # opt-in model judge (strict on fail)
# AEGIS_JUDGE_URL / AEGIS_JUDGE_MODEL select any OpenAI-compatible endpoint
```

## Hacking on Aegis itself

```bash
npm install && npm run build   # strict tsc, dist/ is committed
npm test                       # 31 integration tests (~6s, no extra deps)
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
