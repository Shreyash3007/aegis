# Monorepo Scoping — SHIPPED in v0.4.0 (this doc kept as the design record)

Status: **implemented** (2026-07-21). Filed from the BlindFolio hands-on
trial (their #1 gap): one state machine per git root could not express
"pw-ai is in validate while web is shipped" in a four-app monorepo with
separate deploys and gates.

## As built (v0.4.0)

- `aegis init --apps web,pw-ai` or `aegis config set apps web,pw-ai` declares
  the app set. Each app gets `.aegis/apps/<name>/state.json` at 00a.
- State-mutating commands (`transition`, `gate`, `contracts`, `loops reset`,
  `fix`, `chore`, `next`) take `--app <name>`; in a multi-app repo, omitting
  it dies with exit 2 listing the declared apps — never guessed.
- `aegis status` without `--app` prints a repo summary (one line per app +
  global lanes); `--app <name>` gives full detail.
- Gates and the fix/chore fast lane are per-app. Lanes stay global on the
  root state (RAM is a machine resource, not an app resource).
- Checkpoints record every app's position and hash every app state —
  hand-editing an app's state.json is caught by `aegis resume` (exit 6).
- App states removed from the `apps` list are kept on disk (recorded history
  is never deleted by a config change).
- Single-app repos: zero behavior change (degenerate case, root state.json).

## Deliberately NOT in v0.4.0

- Per-app contracts (N1 is repo-wide via `contracts_path`; per-app contract
  boundaries need a real monorepo dogfood first).
- Per-app brain/ subtrees (one brain, docs may span apps).
- Drift detection mapping worktrees to apps by path prefix.

## Requirements (from the original proposal — all met unless noted above)

1. Per-app pipeline position: `aegis status --app pw-ai` ✅
2. Shared truth stays shared: one transitions.json, config, skills, brain ✅
3. No per-app `.aegis/` directories ✅ (per-app FILES under one `.aegis/apps/`)
4. Cross-app changes representable: repo-wide checkpoint + per-app states;
   a repo-wide change is recorded per affected app by the operator ✅ (manual
   but explicit — auto-propagation would fabricate transitions, A1.1)
5. Backward compatible ✅ (config.apps absent = v0.3 behavior)
