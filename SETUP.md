# Aegis Setup Guide

## Install (pick one)

```bash
# From GitHub (recommended once the repo is published):
npm install -g github:<org>/aegis

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
aegis next          # the ONE next skill
aegis transition <skill>          # move (CLI refuses illegal jumps)
aegis gate <name> --approve       # human approves sacred gates
aegis contracts                   # verify contract PR -> unlock build
aegis slice create <name>         # worktree-per-slice
aegis merge check <branch>        # merge oracle before any merge
aegis validate <suite>            # contracts|tests|deps|perf|e2e
aegis checkpoint / resume         # snapshots + verified recovery
```

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
