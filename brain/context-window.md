# Context Window
<!-- Maintained source; aegis sync embeds this in generated context blocks. -->

## Active release

v0.10 is released; **v0.11 "Reach" is the active release** (the owner
authorized the full fix plan and then v0.11). Aegis remains the only
orchestrator; model routing and automatic effort/model selection are deferred.

- v0.11 contract: `docs/releases/v0.11/RELEASE-CONTRACT.md`; execution
  matrix `docs/releases/v0.11/PLAN.md`; revised forward plan
  `docs/ROADMAP.md` (v0.11 `[ACTIVE]`).
- v0.10 release records: contract `docs/releases/v0.10/RELEASE-CONTRACT.md`;
  discovery/craft `docs/releases/v0.10/DISCOVERY-AND-CRAFT.md`; distribution
  (built `.tgz`, consumer shrinkwrap, bundled runtime) verified by
  `node scripts/package-check.mjs`.
- Current acceptance definitions: `GATES.md`; observations and final status
  must be backed by fresh command output and exact-source CI/release assets.

Never reuse v0.9 G4 as v0.10 approval (nor v0.10's for v0.11). The human
approves the exact final source commit; active lanes must close safely. Keep
the original audit and failed-run observations; append successors rather
than rewriting them.

## Current handover (2026-10-18)

- **v0.10.0 released** (2026-10-16): tag `v0.10.0` = source `43ab0bd`,
  green exact-commit CI, full ritual `CLEARED`, offline install verified,
  human G4 recorded; details in `docs/releases/v0.10/HANDOVER.md`.
- **v0.11 in flight**: contracts PR `a1c1933`; W1-A R1 strict-profile
  `3773ef2`; W1-B R2 host-capabilities `84ddeb5` (claude-code / opencode /
  cursor declarations - all `fixture-only` until real versioned-host smokes
  are recorded - plus the `declarationProblems` validator; acceptance/review
  evidence `docs/releases/v0.11/host-capabilities-quality.json`).
- **W2 complete**: W2-A R3a claude-code adapter `bdcce95` (managed block
  in `.claude/settings.json` - exact-block identity, lstat link refusal,
  named backup before the first change, model/provider/effort byte-identity,
  minimal-diff uninstall; `host install|uninstall|verify` wiring; Windows
  install form is shell form (`aegis status`) because the PATH `aegis` is a
  script shim Claude Code cannot exec-spawn; real claude 2.1.269 SessionStart
  smoke recorded - claude-code is `verified` in `src/hosts/declarations.ts`;
  evidence `docs/releases/v0.11/claude-code-adapter-quality.json`). W2-B R4
  evidence-publisher `aa601fc` (`evidence export --file <json> --battery
  <json>` publishes schema v2 release evidence: exact-sha binding, CI
  linkage, observations, verified artifact bytes, limitations; create-only;
  refusals for missing/stale bindings, private paths, credentials, raw
  prompt blobs and reported-cost-as-billing; the bare v1 aggregate export is
  kept for its pinned consumers; evidence
  `docs/releases/v0.11/evidence-publisher-quality.json`).
- **W3 complete**: W3-A R3b opencode adapter merged at `c510582` (evidence
  `docs/releases/v0.11/opencode-adapter-quality.json`; lane closed, tree
  clean). W3-B R6 craft pin review + adverse-scenario suite merged at
  `4500e28` (main = origin/main): stray or duplicated AEGIS markers now
  refuse sync (exit 9) before anything is written, with both generated
  targets merged first and written atomically; gc clears interrupted-write
  temp litter; doctor labels missing git and stays machine-parseable JSON;
  init refuses without git before touching state, probes before the wipe
  and preserves owner perf/monitor artifacts; validate reports UNMEASURED
  naming a missing runner, and an empty dist no longer satisfies perf
  budgets; resume refuses exit 6 on corrupt checkpoints or integrity
  inputs. Craft decision: KEEP the v6.4.2 pin - upstream v7.0.0 reviewed
  (three of six blob IDs move) and recorded in
  `docs/releases/v0.11/craft-pin-review.md`; the v7 brainstorming rebuild
  adds subagent-dispatch/mandatory-plan/spike/visual-companion surface that
  needs new collision rules and exercises before any bump; the lock is
  unchanged. 12-case trigger fixture `test/fixtures/craft-triggers.json`
  (6 positive to native fallbacks, 6 negative) is consumed by the suite;
  live trigger precision is UNMEASURED (owner-run, needs a real judgment
  backend). Evidence `docs/releases/v0.11/adverse-scenarios-quality.json`;
  battery at tip 379/379 tests, audit 154/0, pilot 44/44, dogfood 72/0,
  self-cycle 61/61; tdd RED `6ce2196` -> GREEN `4500e28`; merge oracle
  PASSED (base `c510582`).
- **W4-A complete**: R3c cursor adapter merged at `5e9a4e4` (main =
  origin/main; evidence `docs/releases/v0.11/cursor-adapter-quality.json`;
  lane closed, tree clean). `.cursor/hooks.json` gets exactly one managed
  entry (only `command`, holding the declaration's shell string; version 1
  on fresh files only; structural identity - stray/duplicated aegis-shaped
  entries refuse exit 4, links and ambiguity refuse before any write, and the
  S1 tripwire restores the file if anything foreign moved); stale
  "adapterless cursor" assertions in the claude-code/opencode suites were
  retired (no shipped host is adapterless now); the advertised scope stays
  `fixture-only` (cursor is absent locally - no smoke was recorded). Battery
  at the implementation tip: 391/391 tests, audit 154/0, pilot 44/44, dogfood
  72/0, self-cycle 61/61; tdd RED `5b5948a` -> GREEN `5e9a4e4`; merge oracle
  PASSED (base `2ad6aa1`).
- **W4-B prepared, NOT RUN**: R5 executor trial freeze
  `docs/releases/v0.11/r5-executor-trial.md` + scaffold
  `docs/releases/v0.11/r5-trial-setup.mjs` (walk verified all-OK to 04a under
  the strict profile, `SETUP-EXIT=0`; executor-phase mechanics exercised
  scripted end-to-end in a disposable scratch - RED/GREEN, acceptance 3/3,
  review, merge oracle, ff-merge, lane close, 04b/04c, checkpoint/resume
  VERIFIED - a mechanics dry-run, explicitly NOT R5 evidence). **BLOCKED on
  the owner**: executor choice + spend cap, or an explicit ship-without-R5
  decision in the G4 verdict. Frozen feature `greet(name)`; assertions
  A1-A9; evidence bundle target
  `docs/releases/v0.11/r5-executor-trial-evidence/`.
- **Open decisions**: R3c cursor advertised scope confirmation (fixture-only
  operative default; "test elsewhere" / "drop from advertised set" need the
  owner's recorded say-so) and the R5 inputs above. Smoke baselines: claude
  2.1.269, aegis 0.10.0, opencode v2.0.29, cursor absent locally.
- v0.11 needs a fresh human G4 on the exact final source. Published tags
  never move; post-release repairs already fold into v0.11.
