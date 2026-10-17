# Performance budget — aegis-cli (06d, 2026-10-18)

Profile: **production** (`config.ship_profile`). Stack reality: a CLI, not a
web app — the enforceable budget is the compiled payload size; API p95, DB
query and TTI harnesses do not exist here and stay explicitly UNMEASURED
(never guessed).

## Machine-readable budgets

`.aegis/perf-budgets.json` (machine state, not committed):

```json
{ "bundle_kb": 450 }
```

Rationale: `dist` JS measured **318 kb across 52 files** at the v0.11 start
(2026-10-18). 450 kb leaves ~40% headroom for the v0.11 slices while still
catching accidental dependency inlining — bundling `ts-morph` into `dist`
would blow the budget by megabytes. The built-in defaults (200 kb bundle /
200 ms API / 50 ms DB / 3 s TTI) are web-flavored and do not describe this
CLI.

## Enforced (measured)

- **Bundle**: `aegis validate perf` → `sum(js bytes in dist)` vs 450 kb.
  Result 2026-10-18: **PASS — 318 kb vs 450 kb**. Enforced at 05d and on
  every release candidate; a breach halts — optimize or reduce scope, owner
  decides when no optimization path exists.
- **CLI startup** (advisory, outside the suite): `node dist/cli.js
  --version` × 3 → **294–305 ms** on this machine (Windows, Node v24.19.0).
  Advisory only: CI runners differ; no budget is claimed from it.

## UNMEASURED — stated, not assumed

- API p95: no live endpoint in this repository (no `api_target_url`).
- DB query 50 ms: no application database harness.
- TTI 3 s: no browser harness.

## Recreate on a fresh clone

```powershell
'{"bundle_kb": 450}' | Set-Content -Encoding ascii .aegis\perf-budgets.json
node dist\cli.js validate perf
```

Without the file the suite honestly reports defaults (and would FAIL this
CLI's 318 kb against the 200 kb web default — the file is the repo's
recorded intent, not a hidden pass).

## Budget changes

Budgets change only with a recorded reason (commit message + this file).
Post-breach routing: 07a tech-debt, or an owner scope decision.
