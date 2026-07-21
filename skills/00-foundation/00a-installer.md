# SKILL-00a: INSTALLER

## Expert Persona
DevOps Engineer (ex-GitHub, ex-Vercel). Obsessed with clean setup, idempotent
scripts, zero assumptions. "If init isn't boring, it's wrong."

## Purpose
One-command installation of Aegis into any git repo.

## Trigger
`aegis init` (or first `aegis start` in a repo without `.aegis/`).

## Entry Criteria
- Git repo exists. (Missing -> exit 1, halt.)
- Existing `.aegis/` is an ERROR PATH, not a contradiction: prompt overwrite
  (`--overwrite` flag in Runtime mode).

## Environment Requirements
Any (L0/L1/L2). In L0 the human runs the command.

## Input Schema
- Repo files: package.json / tsconfig.json / requirements.txt (stack hints)
- Optional: `aegis.config.json` legacy file (migrate, never silently discard)

## Execution Steps
1. `aegis doctor` - detect platform, shell, RAM, tooling, environment level;
   prune stale worktree registrations (A1.6).
2. Create `.aegis/` tree (state, transitions, checkpoints, ast, gates, config).
3. Write `.gitignore` entry `.aegis/` - machine state NEVER enters git (A1.4).
4. Create `brain/` tree + `_templates/`.
5. Install git hooks (pre-commit, post-commit, pre-push) with CLI resolution
   chain: PATH -> local build path -> npx.
6. Write initial `transitions.json` + `state.json` (schema_version).
7. Install skill files into `.aegis/skills/` (refresh target for `aegis sync`).
8. Hand off to 00b (setup interview) unless `--yes` (defaults, agent mode).

## Self-Critique Protocol (Light)
"Did I miss existing files that belong in brain? Did I assume a stack? Is
`.aegis/` really gitignored - verify with `git check-ignore`."

## Error Escalation Protocol
- Not a git repo -> exit 1, halt with instructions.
- `.aegis/` exists without `--overwrite` -> exit 2, prompt.
- Hooks not writable -> warn, continue (enforcement degraded; say so).

## Output Schema
- `.aegis/` (state.json, transitions.json, config.json, checkpoints/, ast/, gates/)
- `brain/` tree + `_templates/`
- `.gitignore` entry, git hooks, `.aegis/skills/`

## Measurement Citations
Init reports environment facts from `aegis doctor` output only - no invented
capabilities.

## CLI Contract
- Runtime: `aegis init [--yes] [--overwrite]`, `aegis doctor [--save]`
- Manual: human runs the same; pastes output.

## Brain Files
Write: context/ (manifest placeholder), context-window.md, architecture/module-map.md placeholder

## Next Skill
00b (Context Lock + Setup Interview)

## Human Touchpoints
Overwrite confirmation. Nothing else - init is fully passive by design.
