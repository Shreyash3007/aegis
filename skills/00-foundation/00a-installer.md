---
name: 00a-installer
version: 0.6.0
triggers: [aegis init, repo without .aegis, 00a installer]
not-triggers: [re-init without overwrite flag, non-git directory]
inputs: [git repo, stack hint files, legacy aegis.config.json]
outputs: [.aegis tree, brain tree, git hooks, .aegis/skills]
chains-to: 00b-context-lock
autonomy: L1
tokens-budget: 800
---
# SKILL-00a: INSTALLER

## Overview
One-command installation of Aegis into any git repo.
Boring by design: if init isn't boring, it's wrong.

## When
- `aegis init` runs, or any other command fails with exit 2 in a repo without `.aegis/`.
- Fresh scaffold or `--overwrite` re-install.

## When-NOT
- Repo already has `.aegis/` and no `--overwrite` was passed — refuse, do not merge state.
- Directory is not a git repo — halt with instructions, do not scaffold.

## Process
- Detect platform, shell, RAM, tooling, environment level; prune stale worktrees: `aegis doctor`
- Create `.aegis/` tree (state, transitions, checkpoints, ast, gates, config): `aegis init --yes`
- Write `.gitignore` entry `.aegis/`; verify machine state never enters git: `git check-ignore .aegis/state.json`
- Create `brain/` tree + `_templates/`: `aegis init --yes`
- Install git hooks (pre-commit, post-commit, pre-push), CLI resolution PATH -> local build -> npx: `aegis hooks`
- Write initial `transitions.json` + `state.json` with schema_version: `aegis status`
- Install skill files into `.aegis/skills/` at install time (`aegis init --yes`); later refresh AGENTS.md/CLAUDE.md + transitions via: `aegis sync`
- Hand off to 00b unless `--yes` (defaults, agent mode): `aegis transition 00b`

## Verification
- `.aegis/state.json` exists with current `schema_version`: `aegis status`
- Every environment fact in the init report cites `aegis doctor` output; no invented capabilities.
- Self-check: existing files that belong in brain captured? stack assumed anywhere? `.aegis/` really ignored?

## Red Flags
- Not a git repo -> exit 1, halt with instructions.
- `.aegis/` exists without `--overwrite` -> exit 2, prompt.
- Hooks not writable -> warn and continue; enforcement degraded, say so verbatim.

## Interactions
- CLI: `aegis init [--yes] [--overwrite]`, `aegis doctor [--save]`
- Brain writes: `context/` manifest placeholder, `context-window.md`, `architecture/module-map.md` placeholder.
- Next: `00b-context-lock`. Human touchpoint: overwrite confirmation only.
