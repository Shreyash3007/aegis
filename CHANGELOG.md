# Changelog

All notable changes to Aegis. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/);
versioning follows [SemVer](https://semver.org/). Evidence for every claim
lives in `docs/DOGFOOD-v*.md` and the cited commits.

## [0.8.0] - 2026-10-13

Audit release: a 148-check adversarial harness (`scripts/audit.mjs`:
usage/shape matrix, state-machine edges, integrity trips, idempotency,
stress, help-surface consistency) walked every command and refusal path.
Headline finding: usage exits were split 2/4 across commands. The rule is
now mechanical - **2 = malformed call, 4 = well-formed but refused**
(reasons, protocol moments, and gates keep their codes) - remapped across
~40 sites, recorded in the 06a conductor rule and the N1 exit-code contract.

### Changed

- Malformed invocations (bare commands, bad enums, out-of-range numerics,
  unknown skills/keys/suites, unparseable request files) exit 2 everywhere:
  `transition`, `slice`, `lane`, `loops`, `config set`, `hooks --profile`,
  `eval trigger` inputs, all `jev` request shapes, `demo record`, all
  `memory add` validations.
- `CONTRACT_EXITS[2]` widened to `malformed call or missing state`.

### Verified

- Audit harness: 148 checks, 0 findings. Suite 153/153, lint 68/68.

## [0.7.0] - 2026-10-13

Self-cycle release: the complete v0.6.0 pipeline walked on this repo itself
(00a to 08b, every gate refused-then-approved), shipping conductor
visibility and cite-or-stamp enforcement through a slice worktree merged via
the oracle. Minor bump: `memory add` gains a new refusal.

### Added

- `status` and the deterministic handoff surface quarantine freezes, clean
  failing branches with cycle counts, the demo record, and the memory
  summary (conditional lines only; stock output unchanged).
- N1 self-contracts (`src/contracts/commands.ts`): the CLI command surface
  and exit-code contract, with `test/contracts-self.test.js` refusing
  runtime drift from the file.
- Missing-state errors point slice-worktree operators back at the main
  checkout via shared `noStateMsg` (seven call sites) instead of suggesting
  a forked `init`.
- `doctor` drift detector: tracked `.aegis/` files and missing `.aegis/`
  ignore coverage (regression cover for the index-poison trap).

### Changed

- `memory add --cites` enforced: local paths must resolve, `mem-` refs must
  be live, URLs exempt. Phantom citations exit 4.

### Verified

- Suite 153/153, `lint-skills --all` 68/68, dogfood re-run 71 steps
  0 unexpected, concurrency file twice 7/7, full walk 00a to 08b with live
  Jev triage consumed as review input at 06b.

## [0.6.0] - 2026-10-13

The god-skill release: Aegis becomes the single enforcement + judgment +
memory framework for AI-native work, built for small/free models first.
`docs/GODSKILL-SPEC.md` (all 15 sections) is implemented per its build order;
`CONSTRAINTS.md` is the written quality bar no agent may silently lower.

### Added

- `aegis lint-skills` - Margin Format gate (frontmatter order/validity, line
  budgets 80/120/200, body order, CLI-ref existence, vague markers, link
  resolution, trigger collisions vs `skills/routing.json`). `eval` shares the
  same checker - one rule set, no gate drift. All 68 skill files migrated.
- `CONSTRAINTS.md` - autonomy ladder (L0 human-only through L2 autonomous,
  mechanical pattern classification, default-deny), evidence law, judge
  thresholds, UI fidelity scale, simulation tiers.
- Blade routing (`skills/routing.json` + `docs/ROUTING.md`): 24 external
  skills routed as thin/thick blades; collisions banned; fallbacks declared.
  Aegis never imports blades and no blade invokes another.
- `aegis clean <branch>` - loop-until-clean gate: oracle VERIFY + CLASSIFY,
  per-branch cycle accounting, 3 cycles to exit-5 escalation with evidence
  pack, unchanged-SHA re-run to exit-5 doubt theater. PASS resets.
- `aegis quarantine freeze|clear|list` - park failing lanes with audited
  reason; oracle and clean refuse frozen lanes; `clear` retains cycles;
  `loops reset` clears them as reviewed recovery.
- `aegis memory add|list|get|verify|retire|reconcile|promote|sync` - typed
  decision/contract/finding/assumption records (status, confidence, cites,
  expiry, supersedes); contradictions auto-open reconcile tasks; stale
  surfacing; sealed lane scratch with merge-gate promotion; zero-dep SQLite
  FTS5 index; deterministic `brain/memory.md` view; resume-pack summary line.
- `aegis jev judge|triage|score|classify|cite` - judgment ring over direct
  TypeSafe HTTPS (zero new deps, live-verified against production as
  jev-1.13.0): 0.7 triage/citation gate, THEATER detection, pattern-authority
  classify, shared-evidence cite. No key = verbatim DEGRADED mode;
  `JEV_BACKEND=mock` for deterministic dry runs.
- `aegis demo record|status` + DEMO gate on every 04a entry - prototype track
  made mechanical: UI html or contracts+sequence+trace pinned, human-approved,
  lanes shut until then. `aegis sync` merges the invariant into old installs.
- `aegis eval trigger` - trigger-precision eval (built-in corpus self-test or
  `--file` cases, default threshold 0.8, below = exit 11 + rewrite list).
  Live self-test: 41/43, one rewrite, re-run 43/43.
- `doctor` drift detector: tracked `.aegis/` files and missing `.aegis/`
  coverage in `.gitignore` are reported (regression cover for the
  index-poison trap found by the v0.6.0 dogfood).
- Shared non-keep-alive HTTP transport (`src/lib/http.ts`): ends the Windows
  libuv fail-fast abort that corrupted gate exit codes after sequential
  judgments. Used by the Jev client and the eval judge alike.

### Fixed

- Windows conformance across the suite: backslash-tolerant integrity
  regexes, cross-platform exec no-op, toolchain-missing wording, `tsc.cmd`
  shim support so the merge oracle produces real TS2322 diagnostics.
- `writeJ` retries transient Windows rename-over-open lock errors (race found
  under full-suite load).
- Quarantine matching unified into one matcher (was tripled logic); freeze
  resolves the real branch ref instead of guessing `aegis/slice-<name>`.

### Verified

- Suite 147/147, `lint-skills --all` 68/68, live trigger precision 43/43.
- `docs/DOGFOOD-v0.6.md`: 71 recorded steps across three scenarios
  (greenfield pipeline, adversarial clean+quarantine, brownfield UI demo),
  0 unexpected exit codes.

## [0.5.2] - 2026-07-24

Pre god-skill baseline. Pipeline state machine, sacred gates, merge oracle,
worktrees, checkpoint/resume integrity, eval harness with opt-in model judge,
monorepo support, hooks profiles. See `docs/DOGFOOD-v0.2.md` for the trial
record of the era.
