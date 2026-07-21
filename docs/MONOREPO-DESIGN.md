# Monorepo Scoping — Design Proposal (v0.4, NOT YET IMPLEMENTED)

Status: **proposal**. Filed from the BlindFolio hands-on trial (their #1 gap).
One state machine per git root cannot express "pw-ai is in validate while web
is shipped" in a four-app monorepo with separate deploys and gates.

## Requirements

1. Per-app pipeline position: `aegis status --app pw-ai` shows that app's
   state, gates, and legal transitions — independent of sibling apps.
2. Shared truth stays shared: one `transitions.json`, one interview, one
   skill set, one brain/ (architecture docs may reference multiple apps).
3. No per-app `.aegis/` directories — discovery ambiguity (which `.aegis`
   governs a commit touching two apps?) is worse than the problem.
4. Cross-app changes are representable: a slice touching `web/` and `pw-ai/`
   must not require lying to either state machine.
5. Backward compatible: a single-app repo is the degenerate case (one
   implicit app) with zero workflow change.

## Proposed shape

```
.aegis/
  config.json            # shared (interview answers, custom validators)
  transitions.json       # shared state machine definition
  apps/
    pw-ai/state.json     # per-app pipeline state (schema v2)
    web/state.json
  checkpoints/           # checkpoint records include the app id
  skills/                # shared
```

- `aegis init --apps web,pw-ai,pw-ai,design-ui` (or `config set apps ...`)
  declares the app set; each gets `apps/<name>/state.json` starting at 00a.
- Every state-mutating command takes `--app <name>`; without it, commands
  behave as today (single implicit app = root state.json, unchanged file
  layout). Omitting `--app` in a multi-app repo dies with exit 2 listing the
  app set — never guess.
- Gates are per-app (pw-ai's G4 does not ship web). The `fix`/`chore` fast
  lane is per-app too; `--app` optional for repo-wide chores (recorded in
  every app's log? No — recorded once, flagged `scope: repo`).
- Lanes stay global (RAM is a machine resource, not an app resource).
- Drift detection maps worktrees to apps by path prefix (`apps/*/`).

## Explicitly deferred questions

- Whether contracts (N1) are per-app or per-repo. Leaning per-repo for
  shared libraries, per-app for deployable boundaries — needs a real
  monorepo dogfood before committing.
- Whether `brain/architecture/` gets per-app subdirectories or one map with
  app labels. Probably the latter (module graph doesn't respect app borders).
- CI template changes (per-app pipelines vs one pipeline with app matrix).

## Why not shipped in v0.3.0

Schema v2 + every state command gaining an axis is the largest change since
the project's start; landing it without a real four-app dogfood would repeat
the mistake the two v0.2.x trials caught — designing for repos we haven't
tested against. v0.3.0 ships the adoption fixes both trials actually asked
for; this doc pins the monorepo shape so v0.4 work starts from a decision,
not a blank page. The first v0.4 milestone is a dogfood against a real
monorepo (BlindFolio shape) before any schema change is committed.
